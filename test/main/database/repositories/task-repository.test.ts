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
});

const createTask = (): Task => ({
  id: 'task-1',
  description: 'Implement authentication',
  normalizedDescription: 'implement authentication',
  createdAt: 1_000,
  updatedAt: 1_000,
});
