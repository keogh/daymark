import { afterEach, describe, expect, it } from 'vitest';

import type { TimeInterval } from '@/main/domain/time-interval';
import {
  projectAnalyticsSummary,
  projectIntervalDuration,
  resolveAnalyticsDays,
  resolveCurrentMonth,
  resolveCurrentWeek,
  type AnalyticsTaskProjectionInput,
} from '@/main/services/analytics-projections';

const originalTimezone = process.env.TZ;

afterEach(() => {
  process.env.TZ = originalTimezone;
});

describe('analytics calendar ranges', () => {
  it.each([
    ['last-7-days', 7],
    ['last-30-days', 30],
  ] as const)(
    'resolves %s as zero-filled oldest-first local days',
    (range, count) => {
      const capturedAt = localTime(2026, 1, 2, 15);
      const days = resolveAnalyticsDays(range, capturedAt);

      expect(days).toHaveLength(count);
      expect(days[0]?.dayStartedAt).toBe(localTime(2026, 1, 3 - count));
      expect(days.at(-1)).toEqual({
        dayStartedAt: localTime(2026, 1, 2),
        dayEndedAt: localTime(2026, 1, 3),
        durationMs: 0,
      });
      expect(days.every((day) => day.durationMs === 0)).toBe(true);
    },
  );

  it('uses calendar operations across DST instead of fixed 24-hour days', () => {
    process.env.TZ = 'America/New_York';
    const days = resolveAnalyticsDays(
      'last-7-days',
      localTime(2026, 3, 10, 12),
    );

    const springDay = days.find(
      (day) => day.dayStartedAt === localTime(2026, 3, 8),
    );
    expect(springDay!.dayEndedAt - springDay!.dayStartedAt).toBe(hours(23));
  });

  it('resolves a Monday-based week at local midnight', () => {
    expect(resolveCurrentWeek(localTime(2026, 8, 21, 14))).toEqual({
      periodStartedAt: localTime(2026, 8, 17),
      periodEndedAt: localTime(2026, 8, 24),
    });
    expect(resolveCurrentWeek(localTime(2026, 8, 17))).toEqual({
      periodStartedAt: localTime(2026, 8, 17),
      periodEndedAt: localTime(2026, 8, 24),
    });
  });

  it('resolves Sunday-based weeks with DST-safe local calendar boundaries', () => {
    process.env.TZ = 'America/New_York';

    expect(resolveCurrentWeek(localTime(2026, 3, 10, 12), 'sunday')).toEqual({
      periodStartedAt: localTime(2026, 3, 8),
      periodEndedAt: localTime(2026, 3, 15),
    });
    expect(resolveCurrentWeek(localTime(2026, 3, 8), 'sunday')).toEqual({
      periodStartedAt: localTime(2026, 3, 8),
      periodEndedAt: localTime(2026, 3, 15),
    });
    expect(
      resolveCurrentWeek(localTime(2026, 3, 10, 12), 'sunday').periodEndedAt -
        resolveCurrentWeek(localTime(2026, 3, 10, 12), 'sunday')
          .periodStartedAt,
    ).toBe(hours(167));
  });

  it('resolves month boundaries through leap February and year transition', () => {
    expect(resolveCurrentMonth(localTime(2028, 2, 29, 12))).toEqual({
      periodStartedAt: localTime(2028, 2, 1),
      periodEndedAt: localTime(2028, 3, 1),
    });
    expect(resolveCurrentMonth(localTime(2026, 12, 31, 12))).toEqual({
      periodStartedAt: localTime(2026, 12, 1),
      periodEndedAt: localTime(2027, 1, 1),
    });
  });
});

describe('analytics interval projection', () => {
  it('clips cross-midnight intervals and excludes exact-boundary contact', () => {
    const capturedAt = localTime(2026, 8, 14, 12);
    const interval = createInterval({
      startedAt: localTime(2026, 8, 13, 23, 30),
      endedAt: localTime(2026, 8, 14, 0, 30),
    });

    expect(
      projectIntervalDuration(
        interval,
        {
          periodStartedAt: localTime(2026, 8, 13),
          periodEndedAt: localTime(2026, 8, 14),
        },
        capturedAt,
      ),
    ).toBe(minutes(30));
    expect(
      projectIntervalDuration(
        createInterval({ endedAt: localTime(2026, 8, 13) }),
        {
          periodStartedAt: localTime(2026, 8, 13),
          periodEndedAt: localTime(2026, 8, 14),
        },
        capturedAt,
      ),
    ).toBe(0);
  });

  it('caps open and future-ending intervals at one snapshot', () => {
    const period = { periodStartedAt: 0, periodEndedAt: 20_000 };
    expect(
      projectIntervalDuration(
        createInterval({ startedAt: 1_000, endedAt: null }),
        period,
        5_000,
      ),
    ).toBe(4_000);
    expect(
      projectIntervalDuration(
        createInterval({ startedAt: 1_000, endedAt: 10_000 }),
        period,
        5_000,
      ),
    ).toBe(4_000);
    expect(
      projectIntervalDuration(
        createInterval({ startedAt: 6_000, endedAt: null }),
        period,
        5_000,
      ),
    ).toBe(0);
  });
});

describe('analytics summary projection', () => {
  it('produces day, total, floored average, independent week, and month totals', () => {
    const capturedAt = localTime(2026, 8, 21, 12);
    const summary = projectAnalyticsSummary({
      weekStartsOn: 'monday',
      range: 'last-7-days',
      capturedAt,
      tasks: [
        task('task-1', 'Work', [
          createInterval({
            startedAt: localTime(2026, 8, 14, 23, 30),
            endedAt: localTime(2026, 8, 15, 0, 30),
          }),
          createInterval({
            id: 'interval-2',
            startedAt: localTime(2026, 8, 17, 9),
            endedAt: localTime(2026, 8, 17, 10),
          }),
        ]),
      ],
    });

    expect(summary.days).toHaveLength(7);
    expect(summary.days.map((day) => day.durationMs)).toEqual([
      minutes(30),
      0,
      minutes(60),
      0,
      0,
      0,
      0,
    ]);
    expect(summary.totalDurationMs).toBe(minutes(90));
    expect(summary.dailyAverageDurationMs).toBe(Math.floor(minutes(90) / 7));
    expect(summary.currentWeek.durationMs).toBe(minutes(60));
    expect(summary.currentMonth.durationMs).toBe(minutes(120));
  });

  it('ranks five positive task totals by every deterministic tie-breaker', () => {
    const capturedAt = localTime(2026, 8, 21, 12);
    const intervalAt = (id: string, endHour: number, durationMinutes = 30) =>
      createInterval({
        id,
        startedAt: localTime(2026, 8, 20, endHour) - minutes(durationMinutes),
        endedAt: localTime(2026, 8, 20, endHour),
      });
    const summary = projectAnalyticsSummary({
      weekStartsOn: 'monday',
      range: 'last-7-days',
      capturedAt,
      tasks: [
        task('z', 'Alpha', [intervalAt('z', 10)]),
        task('a', 'Beta', [intervalAt('a', 10)]),
        task('b', 'Alpha', [intervalAt('b', 10)]),
        task('recent', 'Later', [intervalAt('recent', 11)]),
        task('long', 'Longest', [intervalAt('long', 9, 60)]),
        task('sixth', 'Sixth', [intervalAt('sixth', 8, 10)]),
        task('zero', 'No contribution', [
          createInterval({ startedAt: 0, endedAt: 1 }),
        ]),
      ],
    });

    expect(summary.topTasks.map(({ task }) => task.id)).toEqual([
      'long',
      'recent',
      'b',
      'z',
      'a',
    ]);
  });

  it('returns the running Task separately inside or outside the top five', () => {
    const capturedAt = localTime(2026, 8, 21, 12);
    const closedTasks = Array.from({ length: 5 }, (_, index) =>
      task(`closed-${index}`, `Closed ${index}`, [
        createInterval({
          id: `closed-interval-${index}`,
          startedAt: localTime(2026, 8, 20, 8),
          endedAt: localTime(2026, 8, 20, 9 + index),
        }),
      ]),
    );
    const running = task('running', 'Running', [
      createInterval({
        id: 'running-interval',
        startedAt: capturedAt - minutes(1),
        endedAt: null,
      }),
    ]);
    const summary = projectAnalyticsSummary({
      weekStartsOn: 'monday',
      range: 'last-7-days',
      capturedAt,
      tasks: [...closedTasks, running],
    });

    expect(summary.topTasks).toHaveLength(5);
    expect(summary.topTasks.some(({ task }) => task.id === 'running')).toBe(
      false,
    );
    expect(summary.runningTask).toEqual({
      task: running.task,
      durationMs: minutes(1),
      mostRecentActivityAt: capturedAt,
      intervalStartedAt: capturedAt - minutes(1),
    });

    const inside = projectAnalyticsSummary({
      weekStartsOn: 'monday',
      range: 'last-7-days',
      capturedAt,
      tasks: [running],
    });
    expect(inside.topTasks[0]).toEqual(
      inside.runningTask && {
        task: inside.runningTask.task,
        durationMs: inside.runningTask.durationMs,
        mostRecentActivityAt: inside.runningTask.mostRecentActivityAt,
      },
    );
  });

  it('does not mutate projection inputs', () => {
    const capturedAt = localTime(2026, 8, 21, 12);
    const tasks = [
      task('task-1', 'Work', [
        createInterval({
          startedAt: capturedAt - minutes(10),
          endedAt: null,
        }),
      ]),
    ];
    const before = structuredClone(tasks);

    projectAnalyticsSummary({
      range: 'last-30-days',
      capturedAt,
      weekStartsOn: 'monday',
      tasks,
    });

    expect(tasks).toEqual(before);
  });
});

const task = (
  id: string,
  description: string,
  intervals: readonly TimeInterval[],
): AnalyticsTaskProjectionInput => ({ task: { id, description }, intervals });

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
