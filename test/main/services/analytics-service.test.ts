import { describe, expect, it, vi } from 'vitest';

import type {
  AnalyticsIntervalRecord,
  AnalyticsQueries,
} from '@/main/database/repositories/analytics-query-repository';
import type { Clock } from '@/main/domain/clock';
import { AnalyticsService } from '@/main/services/analytics-service';

describe('AnalyticsService', () => {
  it('captures one authoritative time and composes one complete bounded summary', () => {
    const capturedAt = localTime(2026, 8, 19, 12);
    const now = vi.fn(() => capturedAt);
    const clock: Clock = { now };
    const findOverlappingUnion = vi.fn(() => [
      record(
        'alpha',
        'Alpha',
        'alpha-yesterday',
        localTime(2026, 8, 18, 23, 30),
        localTime(2026, 8, 19, 0, 30),
      ),
      record('alpha', 'Alpha', 'alpha-open', localTime(2026, 8, 19, 10), null),
      record(
        'beta',
        'Beta',
        'beta',
        localTime(2026, 8, 17, 8),
        localTime(2026, 8, 17, 9),
      ),
    ]);
    const queries: AnalyticsQueries = { findOverlappingUnion };

    const summary = new AnalyticsService({
      clock,
      analyticsQueries: queries,
      settings: { get: vi.fn(() => settings('monday')) },
    }).getSummary({ range: 'last-7-days' });

    expect(now).toHaveBeenCalledTimes(1);
    expect(findOverlappingUnion).toHaveBeenCalledTimes(1);
    expect(findOverlappingUnion).toHaveBeenCalledWith({
      selectedRangeStartedAt: localTime(2026, 8, 13),
      currentWeekStartedAt: localTime(2026, 8, 17),
      currentMonthStartedAt: localTime(2026, 8, 1),
      capturedAt,
    });
    expect(summary).toMatchObject({
      range: 'last-7-days',
      capturedAt,
      rangeStartedAt: localTime(2026, 8, 13),
      rangeEndedAt: localTime(2026, 8, 20),
      totalDurationMs: hours(4),
      dailyAverageDurationMs: Math.floor(hours(4) / 7),
      currentWeek: {
        periodStartedAt: localTime(2026, 8, 17),
        periodEndedAt: localTime(2026, 8, 24),
        durationMs: hours(4),
      },
      currentMonth: {
        periodStartedAt: localTime(2026, 8, 1),
        periodEndedAt: localTime(2026, 9, 1),
        durationMs: hours(4),
      },
      topTasks: [
        {
          task: { id: 'alpha', description: 'Alpha' },
          durationMs: hours(3),
          mostRecentActivityAt: capturedAt,
        },
        {
          task: { id: 'beta', description: 'Beta' },
          durationMs: hours(1),
        },
      ],
      runningTask: {
        task: { id: 'alpha', description: 'Alpha' },
        durationMs: hours(3),
        mostRecentActivityAt: capturedAt,
        intervalStartedAt: localTime(2026, 8, 19, 10),
      },
    });
    expect(summary.days).toHaveLength(7);
    expect(summary.days.map((day) => day.durationMs)).toEqual([
      0,
      0,
      0,
      0,
      hours(1),
      minutes(30),
      hours(2.5),
    ]);
  });

  it('returns a zero-filled 30-day summary without mutating query records', () => {
    const capturedAt = localTime(2026, 8, 19, 12);
    const records = [
      record(
        'future',
        'Future',
        'future-interval',
        capturedAt + hours(1),
        capturedAt + hours(2),
      ),
    ];
    const original = structuredClone(records);
    const service = new AnalyticsService({
      clock: { now: () => capturedAt },
      analyticsQueries: { findOverlappingUnion: () => records },
      settings: { get: () => settings('monday') },
    });

    const summary = service.getSummary({ range: 'last-30-days' });

    expect(summary.days).toHaveLength(30);
    expect(summary.totalDurationMs).toBe(0);
    expect(summary.dailyAverageDurationMs).toBe(0);
    expect(summary.topTasks).toEqual([]);
    expect(summary.runningTask).toBeNull();
    expect(records).toEqual(original);
  });

  it('reads the authoritative week start for every request', () => {
    const capturedAt = localTime(2026, 8, 19, 12);
    const get = vi
      .fn()
      .mockReturnValueOnce(settings('monday'))
      .mockReturnValueOnce(settings('sunday'));
    const findOverlappingUnion = vi.fn(() => []);
    const service = new AnalyticsService({
      clock: { now: () => capturedAt },
      analyticsQueries: { findOverlappingUnion },
      settings: { get },
    });

    const monday = service.getSummary({ range: 'last-7-days' });
    const sunday = service.getSummary({ range: 'last-7-days' });

    expect(get).toHaveBeenCalledTimes(2);
    expect(monday.currentWeek.periodStartedAt).toBe(localTime(2026, 8, 17));
    expect(sunday.currentWeek.periodStartedAt).toBe(localTime(2026, 8, 16));
    expect(findOverlappingUnion).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        currentWeekStartedAt: localTime(2026, 8, 16),
      }),
    );
  });
});

const record = (
  taskId: string,
  description: string,
  intervalId: string,
  startedAt: number,
  endedAt: number | null,
): AnalyticsIntervalRecord => ({
  task: { id: taskId, description },
  interval: {
    id: intervalId,
    taskId,
    startedAt,
    endedAt,
    createdAt: startedAt,
    updatedAt: startedAt,
  },
});

const localTime = (
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
): number => new Date(year, month - 1, day, hour, minute).getTime();

const minutes = (value: number): number => value * 60_000;
const hours = (value: number): number => minutes(value * 60);

const settings = (weekStartsOn: 'monday' | 'sunday') => ({
  weekStartsOn,
  theme: 'system' as const,
  updatedAt: 0,
});
