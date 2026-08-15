import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { DatabaseContext } from '@/main/database/database';
import { HistoryQueryRepository } from '@/main/database/repositories/history-query-repository';

import {
  createDisposableDatabase,
  type DisposableDatabase,
} from '../support/disposable-database';

describe('HistoryQueryRepository', () => {
  let fixture: DisposableDatabase;
  let context: DatabaseContext;
  let repository: HistoryQueryRepository;

  beforeEach(async () => {
    fixture = await createDisposableDatabase();
    context = fixture.lifecycle.initialize();
    repository = new HistoryQueryRepository(context.db);
    insertTask(context, 'task-1', 'First task');
    insertTask(context, 'task-2', 'Second task');
  });

  afterEach(async () => {
    await fixture.dispose();
  });

  it('retrieves bounded activity candidates in effective-end order', () => {
    insertInterval(context, 'old', 'task-1', 1_000, 2_000);
    insertInterval(context, 'newer', 'task-1', 4_000, 5_000);
    insertInterval(context, 'open', 'task-2', 3_000, null);

    expect(
      repository.findActivityCandidatesBefore(10_000, 6_000, 2, 0),
    ).toEqual([
      { id: 'open', startedAt: 3_000, endedAt: null },
      { id: 'newer', startedAt: 4_000, endedAt: 5_000 },
    ]);
    expect(
      repository.findActivityCandidatesBefore(10_000, 6_000, 2, 2),
    ).toEqual([{ id: 'old', startedAt: 1_000, endedAt: 2_000 }]);
  });

  it('returns all and only intervals overlapping a half-open range with task data', () => {
    insertInterval(context, 'ends-at-start', 'task-1', 500, 1_000);
    insertInterval(context, 'overlap', 'task-1', 500, 1_100);
    insertInterval(context, 'inside', 'task-2', 1_200, 1_300);
    insertInterval(context, 'starts-at-end', 'task-2', 1_500, 1_600);

    expect(repository.findOverlappingRange(1_000, 1_500, 2_000)).toMatchObject([
      {
        task: { id: 'task-1', description: 'First task' },
        interval: { id: 'overlap' },
      },
      {
        task: { id: 'task-2', description: 'Second task' },
        interval: { id: 'inside' },
      },
    ]);
  });

  it('aggregates requested task lifetimes at one snapshot without writes', () => {
    insertInterval(context, 'closed', 'task-1', 1_000, 3_000);
    insertInterval(context, 'open', 'task-1', 4_000, null);
    insertInterval(context, 'other', 'task-2', 1_000, 9_000);
    const before = context.sqlite.serialize();

    expect(repository.sumLifetimeDurations(['task-1'], 6_000)).toEqual([
      { taskId: 'task-1', durationMs: 4_000 },
    ]);
    expect(context.sqlite.serialize()).toEqual(before);
  });
});

const insertTask = (
  context: DatabaseContext,
  id: string,
  description: string,
): void => {
  context.sqlite
    .prepare(
      'insert into tasks (id, description, normalized_description, created_at, updated_at) values (?, ?, ?, ?, ?)',
    )
    .run(id, description, description.toLowerCase(), 100, 100);
};

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
