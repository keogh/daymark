import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { DatabaseContext } from '@/main/database/database';
import { TaskSuggestionQueryRepository } from '@/main/database/repositories/task-suggestion-query-repository';
import { getLocalDayRange } from '@/main/services/history-projections';
import { normalizeTaskText } from '@/shared/validation/task-description';

import {
  createDisposableDatabase,
  type DisposableDatabase,
} from '../support/disposable-database';

const originalTimezone = process.env.TZ;

describe('TaskSuggestionQueryRepository', () => {
  let fixture: DisposableDatabase;
  let context: DatabaseContext;
  let repository: TaskSuggestionQueryRepository;

  beforeEach(async () => {
    fixture = await createDisposableDatabase();
    context = fixture.lifecycle.initialize();
    repository = new TaskSuggestionQueryRepository(context.db);
  });

  afterEach(async () => {
    process.env.TZ = originalTimezone;
    await fixture.dispose();
  });

  it('returns five recent tasks with deterministic activity and description ordering', () => {
    insertTask(context, 'task-z', 'Zulu');
    insertTask(context, 'task-b', 'Beta');
    insertTask(context, 'task-a', 'Alpha');
    insertTask(context, 'task-d', 'Delta');
    insertTask(context, 'task-e', 'Echo');
    insertTask(context, 'task-f', 'Foxtrot');
    insertTask(context, 'task-orphan', 'No activity');
    insertInterval(context, 'z', 'task-z', 9_000, 9_100);
    insertInterval(context, 'b', 'task-b', 8_000, 8_100);
    insertInterval(context, 'a', 'task-a', 8_000, 8_100);
    insertInterval(context, 'd', 'task-d', 7_000, 7_100);
    insertInterval(context, 'e', 'task-e', 6_000, 6_100);
    insertInterval(context, 'f', 'task-f', 5_000, 5_100);

    expect(
      repository.findSuggestions('', 10_000).map((result) => result.task.id),
    ).toEqual(['task-z', 'task-a', 'task-b', 'task-d', 'task-e']);
  });

  it('prioritizes prefixes then applies recency and normalized-description tie-breakers', () => {
    insertTask(context, 'prefix-old', 'Authentication plan');
    insertTask(context, 'prefix-new-b', 'Auth review');
    insertTask(context, 'prefix-new-a', 'Auth analysis');
    insertTask(context, 'substring-new', 'Implement authentication');
    insertTask(context, 'non-match', 'Implementation planning');
    insertInterval(context, 'prefix-old-i', 'prefix-old', 1_000, 1_100);
    insertInterval(context, 'prefix-new-b-i', 'prefix-new-b', 3_000, 3_100);
    insertInterval(context, 'prefix-new-a-i', 'prefix-new-a', 3_000, 3_100);
    insertInterval(context, 'substring-new-i', 'substring-new', 9_000, 9_100);

    expect(
      repository
        .findSuggestions('auth', 10_000)
        .map((result) => result.task.id),
    ).toEqual(['prefix-new-a', 'prefix-new-b', 'prefix-old', 'substring-new']);
  });

  it('uses normalized contiguous substring matching and treats SQL wildcard characters literally', () => {
    insertTask(context, 'spaced', 'Implement   Authentication');
    insertTask(context, 'reordered', 'Authentication implementation');
    insertTask(context, 'percent', 'Reach 100% Focus');
    insertTask(context, 'underscore', 'Literal_underbar');

    expect(
      repository
        .findSuggestions('implement authentication', 10_000)
        .map((result) => result.task.id),
    ).toEqual(['spaced']);
    expect(
      repository.findSuggestions('%', 10_000).map((result) => result.task.id),
    ).toEqual(['percent']);
    expect(
      repository.findSuggestions('_', 10_000).map((result) => result.task.id),
    ).toEqual(['underscore']);
  });

  it('projects repeated, open, cross-midnight, and exact-boundary intervals at the supplied snapshot', () => {
    const now = localTime(2026, 8, 14, 12);
    const today = getLocalDayRange(now);
    insertTask(context, 'closed-task', 'Closed work');
    insertTask(context, 'open-task', 'Open work');
    insertTask(context, 'orphan', 'Orphan work');
    insertInterval(
      context,
      'cross-midnight',
      'closed-task',
      today.dayStartedAt - minutes(30),
      today.dayStartedAt + minutes(30),
    );
    insertInterval(
      context,
      'closed-today',
      'closed-task',
      today.dayStartedAt + hours(2),
      today.dayStartedAt + hours(2) + minutes(45),
    );
    insertInterval(
      context,
      'ends-at-midnight',
      'closed-task',
      today.dayStartedAt - hours(1),
      today.dayStartedAt,
    );
    insertInterval(context, 'open', 'open-task', now - minutes(20), null);

    const results = repository.findSuggestions('', now);
    expect(results).toEqual([
      {
        task: { id: 'open-task', description: 'Open work' },
        todayDurationMs: minutes(20),
        lifetimeDurationMs: minutes(20),
        mostRecentActivityAt: now - minutes(20),
      },
      {
        task: { id: 'closed-task', description: 'Closed work' },
        todayDurationMs: minutes(75),
        lifetimeDurationMs: minutes(165),
        mostRecentActivityAt: today.dayStartedAt + hours(2),
      },
      {
        task: { id: 'orphan', description: 'Orphan work' },
        todayDurationMs: 0,
        lifetimeDurationMs: 0,
        mostRecentActivityAt: null,
      },
    ]);
  });

  it('uses DST-safe local calendar boundaries', () => {
    process.env.TZ = 'America/New_York';
    const now = localTime(2026, 3, 8, 12);
    const today = getLocalDayRange(now);
    insertTask(context, 'dst', 'DST work');
    insertInterval(
      context,
      'spring-forward',
      'dst',
      today.dayStartedAt,
      localTime(2026, 3, 8, 4),
    );

    expect(repository.findSuggestions('', now)[0]).toMatchObject({
      todayDurationMs: hours(3),
      lifetimeDurationMs: hours(3),
    });
  });

  it('executes one bounded read query without mutating the database', () => {
    for (let index = 0; index < 20; index += 1) {
      const taskId = `task-${String(index).padStart(2, '0')}`;
      insertTask(context, taskId, `Task ${index}`);
      insertInterval(
        context,
        `interval-${index}`,
        taskId,
        index + 1,
        index + 2,
      );
    }
    const before = context.sqlite.serialize();
    const prepare = vi.spyOn(context.sqlite, 'prepare');

    const results = repository.findSuggestions('', 100);

    expect(results).toHaveLength(5);
    expect(prepare).toHaveBeenCalledOnce();
    expect(context.sqlite.serialize()).toEqual(before);
  });

  it('uses task ID as the final tie-breaker for anomalous duplicate normalized descriptions', () => {
    context.sqlite.exec('drop index tasks_normalized_description_unique_idx');
    insertTask(context, 'task-b', 'Same');
    insertTask(context, 'task-a', 'Same');

    expect(
      repository.findSuggestions('', 100).map((result) => result.task.id),
    ).toEqual(['task-a', 'task-b']);
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
    .run(id, description, normalizeTaskText(description), 100, 100);
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

const localTime = (
  year: number,
  month: number,
  day: number,
  hour: number,
): number => new Date(year, month - 1, day, hour).getTime();

const minutes = (value: number): number => value * 60_000;
const hours = (value: number): number => minutes(value * 60);
