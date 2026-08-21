import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { DatabaseContext } from '@/main/database/database';
import { TaskRepository } from '@/main/database/repositories/task-repository';
import type { Task } from '@/main/domain/task';
import { validateStartTaskInput } from '@/shared/validation/task-description';

import {
  createDisposableDatabase,
  type DisposableDatabase,
} from '../support/disposable-database';

describe('TaskRepository', () => {
  let fixture: DisposableDatabase;
  let context: DatabaseContext;
  let repository: TaskRepository;

  beforeEach(async () => {
    fixture = await createDisposableDatabase();
    context = fixture.lifecycle.initialize();
    repository = new TaskRepository(context.db);
  });

  afterEach(async () => {
    await fixture.dispose();
  });

  it('inserts and reads a task with deterministic identifiers and timestamps', () => {
    const task = createTask();

    expect(repository.insert(task)).toEqual(task);
    expect(repository.findById(task.id)).toEqual(task);
    expect(repository.findById('missing-task')).toBeUndefined();
  });

  it('finds a task by its exact normalized description', () => {
    const task = createTask();
    repository.insert(task);

    expect(
      repository.findByNormalizedDescription('implement authentication'),
    ).toEqual(task);
    expect(
      repository.findByNormalizedDescription('Implement authentication'),
    ).toBeUndefined();
  });

  it.each([
    'Implement authentication',
    ' implement authentication ',
    'IMPLEMENT AUTHENTICATION',
  ])('reuses the first task for equivalent input %j', (description) => {
    const firstTask = createTask();
    repository.insert(firstTask);
    const validated = validateStartTaskInput({
      source: 'description',
      description,
    });
    expect(validated.ok).toBe(true);
    if (!validated.ok || validated.value.source !== 'description') {
      return;
    }

    const resolved = repository.insert({
      id: `duplicate-${description}`,
      description: validated.value.description,
      normalizedDescription: validated.value.normalizedDescription,
      createdAt: 2_000,
      updatedAt: 2_000,
    });

    expect(resolved).toEqual(firstTask);
    expect(
      context.sqlite.prepare('select count(*) from tasks').pluck().get(),
    ).toBe(1);
    expect(repository.findById(firstTask.id)?.description).toBe(
      'Implement authentication',
    );
  });

  it('enforces normalized-description uniqueness in SQLite', () => {
    repository.insert(createTask());

    expect(() =>
      context.sqlite
        .prepare(
          'insert into tasks (id, description, normalized_description, created_at, updated_at) values (?, ?, ?, ?, ?)',
        )
        .run(
          'duplicate-task',
          'IMPLEMENT AUTHENTICATION',
          'implement authentication',
          2_000,
          2_000,
        ),
    ).toThrow(/unique constraint failed/i);
  });

  it('updates exactly one task description and normalized description, preserving identity', () => {
    const task = createTask();
    repository.insert(task);
    const other = {
      ...createTask(),
      id: 'task-2',
      description: 'Other task',
      normalizedDescription: 'other task',
    };
    repository.insert(other);

    const updated = repository.updateDescription(
      task.id,
      'Implement OAuth',
      'implement oauth',
      2_000,
    );

    expect(updated).toEqual({
      ...task,
      description: 'Implement OAuth',
      normalizedDescription: 'implement oauth',
      updatedAt: 2_000,
    });
    expect(repository.findById(task.id)).toEqual(updated);
    expect(repository.findById(other.id)).toEqual(other);
  });

  it('returns undefined when updating a missing task', () => {
    expect(
      repository.updateDescription('missing-task', 'New', 'new', 2_000),
    ).toBeUndefined();
  });

  it('finds a normalized-description collision excluding the target task', () => {
    const task = createTask();
    repository.insert(task);
    const other = {
      ...createTask(),
      id: 'task-2',
      description: 'Other task',
      normalizedDescription: 'other task',
    };
    repository.insert(other);

    expect(
      repository.findByNormalizedDescriptionExcluding(
        other.normalizedDescription,
        task.id,
      ),
    ).toEqual(other);
    expect(
      repository.findByNormalizedDescriptionExcluding(
        task.normalizedDescription,
        task.id,
      ),
    ).toBeUndefined();
    expect(
      repository.findByNormalizedDescriptionExcluding(
        'no such description',
        task.id,
      ),
    ).toBeUndefined();
  });

  it('preserves the task-to-interval cascade inherited from the foundation', () => {
    const task = createTask();
    repository.insert(task);
    context.sqlite
      .prepare(
        'insert into time_intervals (id, task_id, started_at, ended_at, created_at, updated_at) values (?, ?, ?, ?, ?, ?)',
      )
      .run('interval-1', task.id, 100, 200, 100, 100);

    context.sqlite.prepare('delete from tasks where id = ?').run(task.id);

    expect(
      context.sqlite
        .prepare('select count(*) from time_intervals')
        .pluck()
        .get(),
    ).toBe(0);
  });

  it('deletes exactly one task and cascades only its intervals', () => {
    const target = createTask();
    const other = {
      ...createTask(),
      id: 'task-2',
      description: 'Other task',
      normalizedDescription: 'other task',
    };
    repository.insert(target);
    repository.insert(other);
    insertInterval(context, 'target-1', target.id, 100, 200);
    insertInterval(context, 'target-2', target.id, 300, 500);
    insertInterval(context, 'other-1', other.id, 600, 900);

    expect(repository.delete(target.id)).toEqual(target);
    expect(repository.findById(target.id)).toBeUndefined();
    expect(repository.findById(other.id)).toEqual(other);
    expect(intervalIds(context)).toEqual(['other-1']);
  });

  it('returns undefined when deleting a missing task without affecting persisted data', () => {
    const task = createTask();
    repository.insert(task);

    expect(repository.delete('missing-task')).toBeUndefined();
    expect(repository.findById(task.id)).toEqual(task);
  });

  it('computes deletion summary interval count and lifetime duration, including an open interval through now', () => {
    const task = createTask();
    repository.insert(task);
    insertInterval(context, 'closed', task.id, 100, 250);
    insertInterval(context, 'open', task.id, 400, null);

    expect(repository.findDeletionSummary(task.id, 1_000)).toEqual({
      task,
      intervalCount: 2,
      lifetimeDurationMs: 750,
    });
    expect(repository.findById(task.id)).toEqual(task);
    expect(intervalIds(context)).toEqual(['closed', 'open']);
  });

  it('returns a zeroed deletion summary for a task without intervals and undefined for a missing task', () => {
    const task = createTask();
    repository.insert(task);

    expect(repository.findDeletionSummary(task.id, 1_000)).toEqual({
      task,
      intervalCount: 0,
      lifetimeDurationMs: 0,
    });
    expect(repository.findDeletionSummary('missing-task', 1_000)).toBeUndefined();
  });
});

const insertInterval = (
  context: DatabaseContext,
  id: string,
  taskId: string,
  startedAt: number,
  endedAt: number | null,
): void => {
  context.sqlite
    .prepare(
      'insert into time_intervals (id, task_id, started_at, ended_at, created_at, updated_at) values (?, ?, ?, ?, ?, ?)',
    )
    .run(id, taskId, startedAt, endedAt, startedAt, startedAt);
};

const intervalIds = (context: DatabaseContext): string[] =>
  context.sqlite
    .prepare('select id from time_intervals order by id')
    .pluck()
    .all() as string[];

const createTask = (): Task => ({
  id: 'task-1',
  description: 'Implement authentication',
  normalizedDescription: 'implement authentication',
  createdAt: 1_000,
  updatedAt: 1_000,
});
