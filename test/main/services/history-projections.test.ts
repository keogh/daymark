import { afterEach, describe, expect, it } from 'vitest';

import type { TimeInterval } from '@/main/domain/time-interval';
import {
  getLocalDayRange,
  getPreviousLocalDayRange,
  projectHistoryDay,
  projectIntervalToDay,
  selectHistoryPage,
  sumLifetimeDuration,
  type LocalDayRange,
} from '@/main/services/history-projections';
import type { HistoryDay } from '@/shared/contracts/history';

const originalTimezone = process.env.TZ;

afterEach(() => {
  process.env.TZ = originalTimezone;
});

describe('local calendar boundaries', () => {
  it('uses local midnight and calendar operations instead of fixed durations', () => {
    process.env.TZ = 'America/New_York';

    const spring = getLocalDayRange(localTime(2026, 3, 8, 12));
    const fall = getLocalDayRange(localTime(2026, 11, 1, 12));

    expect(spring.dayEndedAt - spring.dayStartedAt).toBe(hours(23));
    expect(fall.dayEndedAt - fall.dayStartedAt).toBe(hours(25));
    expect(getPreviousLocalDayRange(fall.dayStartedAt)).toEqual(
      getLocalDayRange(localTime(2026, 10, 31, 12)),
    );
  });
});

describe('history interval projection', () => {
  it('clips one stored cross-midnight interval into both local days', () => {
    const firstDay = getLocalDayRange(localTime(2026, 8, 13, 12));
    const secondDay = getLocalDayRange(localTime(2026, 8, 14, 12));
    const interval = createInterval({
      startedAt: localTime(2026, 8, 13, 23, 30),
      endedAt: localTime(2026, 8, 14, 0, 30),
    });

    expect(projectIntervalToDay(interval, firstDay, interval.endedAt!)).toEqual(
      {
        id: interval.id,
        startedAt: interval.startedAt,
        endedAt: interval.endedAt,
        projectedStartedAt: interval.startedAt,
        projectedEndedAt: firstDay.dayEndedAt,
        durationMs: minutes(30),
        isRunning: false,
      },
    );
    expect(
      projectIntervalToDay(interval, secondDay, interval.endedAt!),
    ).toEqual({
      id: interval.id,
      startedAt: interval.startedAt,
      endedAt: interval.endedAt,
      projectedStartedAt: secondDay.dayStartedAt,
      projectedEndedAt: interval.endedAt,
      durationMs: minutes(30),
      isRunning: false,
    });
  });

  it('uses the snapshot for an open interval and excludes exact-boundary contact', () => {
    const day = getLocalDayRange(localTime(2026, 8, 14, 12));
    const now = localTime(2026, 8, 14, 10, 15);
    const open = createInterval({
      startedAt: localTime(2026, 8, 14, 10),
      endedAt: null,
    });

    expect(projectIntervalToDay(open, day, now)).toMatchObject({
      durationMs: minutes(15),
      projectedEndedAt: now,
      isRunning: true,
    });
    expect(
      projectIntervalToDay(
        createInterval({
          startedAt: day.dayStartedAt - minutes(10),
          endedAt: day.dayStartedAt,
        }),
        day,
        now,
      ),
    ).toBeNull();
    expect(
      projectIntervalToDay(
        createInterval({
          startedAt: day.dayEndedAt,
          endedAt: day.dayEndedAt + minutes(10),
        }),
        day,
        now,
      ),
    ).toBeNull();
  });

  it('caps lifetime totals at the same snapshot and ignores future duration', () => {
    expect(
      sumLifetimeDuration(
        [
          createInterval({ startedAt: 1_000, endedAt: 3_000 }),
          createInterval({ id: 'open', startedAt: 4_000, endedAt: null }),
          createInterval({ id: 'future', startedAt: 7_000, endedAt: null }),
        ],
        6_000,
      ),
    ).toBe(4_000);
  });
});

describe('history day projection', () => {
  it('calculates totals and applies deterministic task and interval ordering', () => {
    const day = getLocalDayRange(localTime(2026, 8, 14, 12));
    const now = localTime(2026, 8, 14, 13);
    const projected = projectHistoryDay(
      day,
      [
        {
          task: { id: 'z-task', description: 'Alpha' },
          lifetimeDurationMs: minutes(70),
          intervals: [
            createInterval({
              id: 'z-interval',
              taskId: 'z-task',
              startedAt: localTime(2026, 8, 14, 9),
              endedAt: localTime(2026, 8, 14, 10),
            }),
          ],
        },
        {
          task: { id: 'a-task', description: 'Alpha' },
          lifetimeDurationMs: minutes(20),
          intervals: [
            createInterval({
              id: 'b-interval',
              taskId: 'a-task',
              startedAt: localTime(2026, 8, 14, 9, 50),
              endedAt: localTime(2026, 8, 14, 10),
            }),
            createInterval({
              id: 'a-interval',
              taskId: 'a-task',
              startedAt: localTime(2026, 8, 14, 9, 50),
              endedAt: localTime(2026, 8, 14, 10),
            }),
          ],
        },
      ],
      now,
    );

    expect(projected.totalDurationMs).toBe(minutes(80));
    expect(projected.tasks.map((task) => task.task.id)).toEqual([
      'a-task',
      'z-task',
    ]);
    expect(
      projected.tasks[0]?.intervals.map((interval) => interval.id),
    ).toEqual(['a-interval', 'b-interval']);
    expect(projected.tasks[0]).toMatchObject({
      dayDurationMs: minutes(20),
      lifetimeDurationMs: minutes(20),
      mostRecentActivityAt: localTime(2026, 8, 14, 10),
    });
  });
});

describe('history page selection', () => {
  it('includes empty Today without consuming an activity-day slot', () => {
    const today = getLocalDayRange(localTime(2026, 8, 14, 12));
    const activityDays = Array.from({ length: 31 }, (_, index) =>
      createActivityDay(getPreviousLocalDayRangeFromOffset(today, index + 1)),
    );

    const page = selectHistoryPage(activityDays, today);

    expect(page.days).toHaveLength(31);
    expect(page.days[0]).toEqual({
      dayStartedAt: today.dayStartedAt,
      dayEndedAt: today.dayEndedAt,
      totalDurationMs: 0,
      tasks: [],
    });
    expect(page.nextBeforeDayStartedAt).toBe(page.days.at(-1)?.dayStartedAt);
  });

  it('counts active Today, de-duplicates days, and applies an exclusive cursor', () => {
    const today = getLocalDayRange(localTime(2026, 8, 14, 12));
    const yesterday = getPreviousLocalDayRange(today.dayStartedAt);
    const activeToday = createActivityDay(today);
    const activeYesterday = createActivityDay(yesterday);

    expect(
      selectHistoryPage(
        [activeYesterday, activeToday, activeYesterday],
        today,
      ).days.map((day) => day.dayStartedAt),
    ).toEqual([today.dayStartedAt, yesterday.dayStartedAt]);
    expect(
      selectHistoryPage(
        [activeToday, activeYesterday],
        today,
        today.dayStartedAt,
      ).days.map((day) => day.dayStartedAt),
    ).toEqual([yesterday.dayStartedAt]);
  });
});

const getPreviousLocalDayRangeFromOffset = (
  today: LocalDayRange,
  offset: number,
): LocalDayRange => {
  let day = today;
  for (let index = 0; index < offset; index += 1) {
    day = getPreviousLocalDayRange(day.dayStartedAt);
  }
  return day;
};

const createActivityDay = (day: LocalDayRange): HistoryDay => ({
  dayStartedAt: day.dayStartedAt,
  dayEndedAt: day.dayEndedAt,
  totalDurationMs: minutes(1),
  tasks: [],
});

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

const localTime = (
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
): number => new Date(year, month - 1, day, hour, minute).getTime();

const minutes = (value: number): number => value * 60_000;
const hours = (value: number): number => value * 60 * 60_000;
