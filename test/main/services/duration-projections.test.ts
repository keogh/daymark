import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { DatabaseContext } from '@/main/database/database';
import { TimeIntervalRepository } from '@/main/database/repositories/time-interval-repository';
import type { TimeInterval } from '@/main/domain/time-interval';
import {
  DurationProjector,
  getLocalDayRange,
  sumIntervalDuration,
} from '@/main/services/duration-projections';

import {
  createDisposableDatabase,
  type DisposableDatabase,
} from '../database/support/disposable-database';

describe('duration projection calculations', () => {
  it('returns zero for no intervals and excludes paused gaps', () => {
    expect(sumIntervalDuration([], 10_000)).toBe(0);
    expect(
      sumIntervalDuration(
        [
          createInterval({ startedAt: 1_000, endedAt: 2_000 }),
          createInterval({ id: 'second', startedAt: 4_000, endedAt: 5_500 }),
        ],
        10_000,
      ),
    ).toBe(2_500);
  });

  it('caps open and closed intervals at now and ignores future time', () => {
    expect(
      sumIntervalDuration(
        [
          createInterval({ startedAt: 1_000, endedAt: null }),
          createInterval({
            id: 'future-end',
            startedAt: 2_000,
            endedAt: 8_000,
          }),
          createInterval({ id: 'future', startedAt: 6_000, endedAt: null }),
        ],
        5_000,
      ),
    ).toBe(7_000);
  });

  it('uses half-open overlap boundaries', () => {
    const range = { startedAt: 1_000, endedAt: 2_000 };

    expect(
      sumIntervalDuration(
        [
          createInterval({ startedAt: 500, endedAt: 1_000 }),
          createInterval({ id: 'inside', startedAt: 1_000, endedAt: 2_000 }),
          createInterval({ id: 'after', startedAt: 2_000, endedAt: 3_000 }),
        ],
        3_000,
        range,
      ),
    ).toBe(1_000);
  });
});

describe('DurationProjector', () => {
  let fixture: DisposableDatabase;
  let context: DatabaseContext;
  let intervals: TimeIntervalRepository;
  let projector: DurationProjector;

  beforeEach(async () => {
    fixture = await createDisposableDatabase();
    context = fixture.lifecycle.initialize();
    intervals = new TimeIntervalRepository(context.db);
    projector = new DurationProjector(intervals);
    insertTask(context, 'task-1');
    insertTask(context, 'task-2');
  });

  afterEach(async () => {
    await fixture.dispose();
  });

  it('projects zero durations when the task has no intervals', () => {
    const now = localTime(2026, 8, 14, 12);

    expect(
      projector.project({ taskId: 'task-1', sessionStartedAt: now, now }),
    ).toEqual({
      sessionDurationMs: 0,
      taskTodayDurationMs: 0,
      taskLifetimeDurationMs: 0,
    });
  });

  it('separates session, today, and lifetime durations', () => {
    const previousDay = localTime(2026, 8, 13, 10);
    const sessionStartedAt = localTime(2026, 8, 14, 9);
    const now = localTime(2026, 8, 14, 10, 20);
    intervals.insert(
      createInterval({
        id: 'previous-day',
        startedAt: previousDay,
        endedAt: previousDay + minutes(30),
      }),
    );
    intervals.insert(
      createInterval({
        id: 'first-session',
        startedAt: sessionStartedAt,
        endedAt: sessionStartedAt + minutes(45),
      }),
    );
    intervals.insert(
      createInterval({
        id: 'open-session',
        startedAt: localTime(2026, 8, 14, 10),
        endedAt: null,
      }),
    );

    expect(
      projector.project({ taskId: 'task-1', sessionStartedAt, now }),
    ).toEqual({
      sessionDurationMs: minutes(65),
      taskTodayDurationMs: minutes(65),
      taskLifetimeDurationMs: minutes(95),
    });
  });

  it('projects the Aug 13/14 midnight overlap in local time', () => {
    const startedAt = localTime(2026, 8, 13, 23, 45);
    const now = localTime(2026, 8, 14, 0, 15);
    intervals.insert(createInterval({ startedAt, endedAt: null }));

    expect(
      projector.project({ taskId: 'task-1', sessionStartedAt: startedAt, now }),
    ).toEqual({
      sessionDurationMs: minutes(30),
      taskTodayDurationMs: minutes(15),
      taskLifetimeDurationMs: minutes(30),
    });
  });

  it('uses exact local day boundaries and excludes another task', () => {
    const now = localTime(2026, 8, 14, 12);
    const today = getLocalDayRange(now);
    intervals.insert(
      createInterval({
        id: 'ends-at-midnight',
        startedAt: today.startedAt - minutes(10),
        endedAt: today.startedAt,
      }),
    );
    intervals.insert(
      createInterval({
        id: 'starts-at-midnight',
        startedAt: today.startedAt,
        endedAt: today.startedAt + minutes(10),
      }),
    );
    intervals.insert(
      createInterval({
        id: 'other-task',
        taskId: 'task-2',
        startedAt: today.startedAt,
        endedAt: today.startedAt + minutes(20),
      }),
    );

    expect(
      projector.project({
        taskId: 'task-1',
        sessionStartedAt: today.startedAt,
        now,
      }),
    ).toEqual({
      sessionDurationMs: minutes(10),
      taskTodayDurationMs: minutes(10),
      taskLifetimeDurationMs: minutes(20),
    });
  });
});

const minutes = (value: number): number => value * 60_000;

const localTime = (
  year: number,
  month: number,
  day: number,
  hour: number,
  minute = 0,
): number => new Date(year, month - 1, day, hour, minute).getTime();

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
  endedAt: 2_000,
  createdAt: 900,
  updatedAt: 900,
  ...overrides,
});
