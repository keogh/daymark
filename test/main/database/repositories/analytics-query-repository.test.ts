import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { DatabaseContext } from '@/main/database/database';
import { AnalyticsQueryRepository } from '@/main/database/repositories/analytics-query-repository';

import {
  createDisposableDatabase,
  type DisposableDatabase,
} from '../support/disposable-database';

describe('AnalyticsQueryRepository', () => {
  let fixture: DisposableDatabase;
  let context: DatabaseContext;
  let repository: AnalyticsQueryRepository;

  beforeEach(async () => {
    fixture = await createDisposableDatabase();
    context = fixture.lifecycle.initialize();
    repository = new AnalyticsQueryRepository(context.db);
    insertTask(context, 'task-1', 'Original description');
    insertTask(context, 'task-2', 'Second task');
  });

  afterEach(async () => {
    await fixture.dispose();
  });

  it('selects the bounded union in one deterministic joined result', () => {
    insertInterval(context, 'ends-at-lower', 'task-1', 100, 800);
    insertInterval(context, 'crosses-lower', 'task-1', 500, 900);
    insertInterval(context, 'selected-range', 'task-2', 1_100, 1_300);
    insertInterval(context, 'week-only', 'task-2', 1_500, 1_700);
    insertInterval(context, 'same-start-z', 'task-1', 2_000, 2_100);
    insertInterval(context, 'same-start-a', 'task-1', 2_000, 2_200);
    insertInterval(context, 'future', 'task-2', 3_000, 3_100);
    context.sqlite
      .prepare('update tasks set description = ? where id = ?')
      .run('Current description', 'task-1');

    const records = repository.findOverlappingUnion({
      selectedRangeStartedAt: 1_000,
      currentWeekStartedAt: 1_400,
      currentMonthStartedAt: 800,
      capturedAt: 3_000,
    });

    expect(records.map(({ interval }) => interval.id)).toEqual([
      'crosses-lower',
      'selected-range',
      'week-only',
      'same-start-a',
      'same-start-z',
    ]);
    expect(records[0]).toMatchObject({
      task: { id: 'task-1', description: 'Current description' },
      interval: {
        id: 'crosses-lower',
        taskId: 'task-1',
        startedAt: 500,
        endedAt: 900,
      },
    });
  });

  it('includes an open interval through the snapshot and excludes future starts', () => {
    insertInterval(context, 'closed', 'task-1', 1_100, 1_200);
    insertInterval(context, 'open', 'task-2', 1_300, null);
    insertInterval(context, 'at-snapshot', 'task-1', 2_000, 2_100);
    insertInterval(context, 'after-snapshot', 'task-1', 2_100, 2_200);

    expect(
      repository
        .findOverlappingUnion({
          selectedRangeStartedAt: 1_000,
          currentWeekStartedAt: 1_000,
          currentMonthStartedAt: 1_000,
          capturedAt: 2_000,
        })
        .map(({ interval }) => interval),
    ).toMatchObject([
      { id: 'closed', endedAt: 1_200 },
      { id: 'open', endedAt: null },
    ]);
  });

  it('does not mutate rows or schema while reading', () => {
    insertInterval(context, 'interval', 'task-1', 1_100, 1_200);
    const before = context.sqlite.serialize();

    repository.findOverlappingUnion({
      selectedRangeStartedAt: 1_000,
      currentWeekStartedAt: 1_000,
      currentMonthStartedAt: 1_000,
      capturedAt: 2_000,
    });

    expect(context.sqlite.serialize()).toEqual(before);
  });

  it('uses one set-based indexed interval query and primary-key Task join', () => {
    const plan = context.sqlite
      .prepare(
        `explain query plan
         select t.id, t.description, i.id, i.task_id, i.started_at, i.ended_at
         from time_intervals i
         inner join tasks t on t.id = i.task_id
         where i.started_at < ?
           and (i.ended_at is null or i.ended_at > ?)
         order by i.started_at asc, i.id asc`,
      )
      .all(3_000, 800) as { detail: string }[];
    const details = plan.map(({ detail }) => detail);

    expect(details).toEqual(
      expect.arrayContaining([
        expect.stringContaining('time_intervals_started_at_idx'),
        expect.stringContaining('sqlite_autoindex_tasks_1'),
      ]),
    );
    expect(details.filter((detail) => detail.includes('SEARCH'))).toHaveLength(
      2,
    );
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
