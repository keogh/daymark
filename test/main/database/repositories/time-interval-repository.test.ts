import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { DatabaseContext } from '@/main/database/database';
import { TimeIntervalRepository } from '@/main/database/repositories/time-interval-repository';
import type { TimeInterval } from '@/main/domain/time-interval';

import {
  createDisposableDatabase,
  type DisposableDatabase,
} from '../support/disposable-database';

describe('TimeIntervalRepository', () => {
  let fixture: DisposableDatabase;
  let context: DatabaseContext;
  let repository: TimeIntervalRepository;

  beforeEach(async () => {
    fixture = await createDisposableDatabase();
    context = fixture.lifecycle.initialize();
    repository = new TimeIntervalRepository(context.db);
    insertTask(context, 'task-1');
    insertTask(context, 'task-2');
  });

  afterEach(async () => {
    await fixture.dispose();
  });

  it('creates and reads intervals without changing persisted timestamps', () => {
    const interval = createInterval();

    expect(repository.insert(interval)).toEqual(interval);
    expect(repository.findById(interval.id)).toEqual(interval);
    expect(repository.findById('missing-interval')).toBeUndefined();
  });

  it('finds and closes the single global open interval', () => {
    const interval = createInterval({ endedAt: null });
    repository.insert(interval);

    expect(repository.findOpen()).toEqual(interval);
    expect(repository.close(interval.id, 1_500, 1_500)).toEqual({
      ...interval,
      endedAt: 1_500,
      updatedAt: 1_500,
    });
    expect(repository.findOpen()).toBeUndefined();
    expect(repository.close(interval.id, 1_600, 1_600)).toBeUndefined();
  });

  it('rejects missing task references and a second open interval globally', () => {
    expect(() =>
      repository.insert(createInterval({ taskId: 'missing-task' })),
    ).toThrow(/foreign key constraint failed/i);

    repository.insert(createInterval({ endedAt: null }));
    expect(() =>
      repository.insert(
        createInterval({ id: 'interval-2', taskId: 'task-2', endedAt: null }),
      ),
    ).toThrow(/unique constraint failed/i);
  });

  it('rejects invalid timestamp order when creating or closing an interval', () => {
    expect(() => repository.insert(createInterval({ endedAt: 1_000 }))).toThrow(
      /check constraint failed/i,
    );

    repository.insert(createInterval({ endedAt: null }));
    expect(() => repository.close('interval-1', 999, 2_000)).toThrow(
      /check constraint failed/i,
    );
  });

  it('returns intervals for the requested session in start order', () => {
    repository.insert(
      createInterval({ id: 'before', startedAt: 500, endedAt: 700 }),
    );
    repository.insert(
      createInterval({ id: 'later', startedAt: 1_500, endedAt: 1_700 }),
    );
    repository.insert(
      createInterval({ id: 'first', startedAt: 1_000, endedAt: 1_200 }),
    );
    repository.insert(
      createInterval({
        id: 'other-task',
        taskId: 'task-2',
        startedAt: 1_100,
        endedAt: 1_300,
      }),
    );

    expect(repository.findForSession('task-1', 1_000, 1_400)).toEqual([
      createInterval({ id: 'first', startedAt: 1_000, endedAt: 1_200 }),
    ]);
  });

  it('returns task intervals overlapping a half-open range', () => {
    const overlapsStart = createInterval({
      id: 'overlaps-start',
      startedAt: 500,
      endedAt: 1_100,
    });
    const inside = createInterval({
      id: 'inside',
      startedAt: 1_200,
      endedAt: 1_300,
    });
    const open = createInterval({
      id: 'open',
      startedAt: 1_400,
      endedAt: null,
    });
    repository.insert(
      createInterval({ id: 'ends-at-start', startedAt: 500, endedAt: 1_000 }),
    );
    repository.insert(overlapsStart);
    repository.insert(inside);
    repository.insert(open);

    expect(repository.findOverlappingTaskRange('task-1', 1_000, 1_500)).toEqual(
      [overlapsStart, inside, open],
    );
  });

  it('lists all intervals for a task and preserves task deletion cascade', () => {
    const first = createInterval({ id: 'first', startedAt: 100, endedAt: 200 });
    const second = createInterval({
      id: 'second',
      startedAt: 300,
      endedAt: 400,
    });
    repository.insert(second);
    repository.insert(first);
    repository.insert(
      createInterval({ id: 'other', taskId: 'task-2', endedAt: 2_000 }),
    );

    expect(repository.findByTask('task-1')).toEqual([first, second]);

    context.sqlite.prepare('delete from tasks where id = ?').run('task-1');
    expect(repository.findByTask('task-1')).toEqual([]);
  });
});

const insertTask = (context: DatabaseContext, id: string): void => {
  context.sqlite
    .prepare(
      'insert into tasks (id, description, normalized_description, created_at, updated_at) values (?, ?, ?, ?, ?)',
    )
    .run(id, id, id, 100, 100);
};

const createInterval = (
  overrides: Partial<TimeInterval> = {},
): TimeInterval => ({
  id: 'interval-1',
  taskId: 'task-1',
  startedAt: 1_000,
  endedAt: 1_200,
  createdAt: 900,
  updatedAt: 900,
  ...overrides,
});
