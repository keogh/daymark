import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { DatabaseContext } from '@/main/database/database';
import { HistoryQueryRepository } from '@/main/database/repositories/history-query-repository';
import { HistoryService } from '@/main/services/history-service';

import {
  createDisposableDatabase,
  type DisposableDatabase,
} from '../database/support/disposable-database';
import { FakeClock } from '../domain/support/fake-clock';

const originalTimezone = process.env.TZ;

describe('HistoryService with SQLite', () => {
  let fixture: DisposableDatabase;
  let context: DatabaseContext;

  beforeEach(async () => {
    process.env.TZ = 'America/New_York';
    fixture = await createDisposableDatabase();
    context = fixture.lifecycle.initialize();
  });

  afterEach(async () => {
    process.env.TZ = originalTimezone;
    await fixture.dispose();
  });

  it('projects repeated, cross-midnight, open, and exact-boundary intervals read-only', () => {
    const now = localTime(2026, 8, 14, 10, 30);
    insertTask(context, 'alpha', 'Alpha');
    insertTask(context, 'beta', 'Beta');
    insertInterval(
      context,
      'cross-midnight',
      'alpha',
      localTime(2026, 8, 13, 23, 30),
      localTime(2026, 8, 14, 0, 30),
    );
    insertInterval(
      context,
      'morning',
      'alpha',
      localTime(2026, 8, 14, 8),
      localTime(2026, 8, 14, 9),
    );
    insertInterval(context, 'open', 'beta', localTime(2026, 8, 14, 10), null);
    insertInterval(
      context,
      'ends-at-midnight',
      'beta',
      localTime(2026, 8, 12, 23),
      localTime(2026, 8, 13),
    );
    const before = context.sqlite.serialize();

    const page = createService(context, now).getPage({});

    expect(page.now).toBe(now);
    expect(page.days.map((day) => day.dayStartedAt)).toEqual([
      localTime(2026, 8, 14),
      localTime(2026, 8, 13),
      localTime(2026, 8, 12),
    ]);
    expect(page.days[0]?.totalDurationMs).toBe(minutes(120));
    expect(page.days[0]?.tasks.map((task) => task.task.id)).toEqual([
      'beta',
      'alpha',
    ]);
    expect(
      page.days[0]?.tasks.find((task) => task.task.id === 'alpha'),
    ).toMatchObject({
      dayDurationMs: minutes(90),
      lifetimeDurationMs: minutes(120),
    });
    expect(page.days[1]?.tasks[0]?.intervals[0]).toMatchObject({
      id: 'cross-midnight',
      durationMs: minutes(30),
    });
    expect(page.days[0]?.tasks[0]?.intervals[0]).toMatchObject({
      id: 'open',
      durationMs: minutes(30),
      isRunning: true,
      projectedEndedAt: now,
    });
    expect(context.sqlite.serialize()).toEqual(before);
  });

  it('includes empty Today, pages exclusively beyond 30 activity days, and terminates', () => {
    const now = localTime(2026, 8, 14, 12);
    insertTask(context, 'task', 'Task');
    for (let offset = 1; offset <= 62; offset += 1) {
      const day = localTime(2026, 8, 14 - offset, 9);
      insertInterval(
        context,
        `interval-${offset}`,
        'task',
        day,
        day + minutes(10),
      );
    }
    const service = createService(context, now);

    const first = service.getPage({});
    const second = service.getPage({
      beforeDayStartedAt: first.nextBeforeDayStartedAt!,
    });
    const third = service.getPage({
      beforeDayStartedAt: second.nextBeforeDayStartedAt!,
    });

    expect(first.days).toHaveLength(31);
    expect(first.days[0]).toMatchObject({ totalDurationMs: 0, tasks: [] });
    expect(second.days).toHaveLength(30);
    expect(third.days).toHaveLength(2);
    expect(third.nextBeforeDayStartedAt).toBeNull();
    const activityStarts = [
      ...first.days.slice(1),
      ...second.days,
      ...third.days,
    ].map((day) => day.dayStartedAt);
    expect(new Set(activityStarts).size).toBe(62);
  });

  it('uses calendar boundaries across a daylight-saving transition', () => {
    const now = localTime(2026, 3, 9, 12);
    insertTask(context, 'task', 'Task');
    insertInterval(
      context,
      'spring-forward',
      'task',
      localTime(2026, 3, 8),
      localTime(2026, 3, 9),
    );

    const activityDay = createService(context, now).getPage({}).days[1]!;
    expect(activityDay.dayEndedAt - activityDay.dayStartedAt).toBe(hours(23));
    expect(activityDay.totalDurationMs).toBe(hours(23));
  });
});

const createService = (context: DatabaseContext, now: number): HistoryService =>
  new HistoryService({
    clock: new FakeClock(now),
    historyQueries: new HistoryQueryRepository(context.db),
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

const localTime = (
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
): number => new Date(year, month - 1, day, hour, minute).getTime();

const minutes = (value: number): number => value * 60_000;
const hours = (value: number): number => value * 60 * 60_000;
