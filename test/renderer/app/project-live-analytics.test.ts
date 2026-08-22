import { describe, expect, it } from 'vitest';

import { projectLiveAnalytics } from '@/renderer/app/project-live-analytics';
import type { AnalyticsSummary } from '@/shared/contracts/analytics';

const CAPTURED_AT = new Date(2026, 7, 21, 12).getTime();
const DAY_STARTED_AT = new Date(2026, 7, 21).getTime();

const makeSummary = (): AnalyticsSummary => ({
  range: 'last-7-days',
  rangeStartedAt: DAY_STARTED_AT - 6 * 86_400_000,
  rangeEndedAt: DAY_STARTED_AT + 86_400_000,
  capturedAt: CAPTURED_AT,
  days: Array.from({ length: 7 }, (_, index) => ({
    dayStartedAt: DAY_STARTED_AT - (6 - index) * 86_400_000,
    dayEndedAt: DAY_STARTED_AT - (5 - index) * 86_400_000,
    durationMs: index === 6 ? 1_000 : 0,
  })),
  totalDurationMs: 1_000,
  dailyAverageDurationMs: 142,
  currentWeek: {
    periodStartedAt: DAY_STARTED_AT - 4 * 86_400_000,
    periodEndedAt: DAY_STARTED_AT + 3 * 86_400_000,
    durationMs: 1_000,
  },
  currentMonth: {
    periodStartedAt: new Date(2026, 7, 1).getTime(),
    periodEndedAt: new Date(2026, 8, 1).getTime(),
    durationMs: 1_000,
  },
  topTasks: Array.from({ length: 5 }, (_, index) => ({
    task: { id: `task-${index}`, description: `Task ${index}` },
    durationMs: 10_000 - index * 1_000,
    mostRecentActivityAt: CAPTURED_AT - index,
  })),
  runningTask: {
    task: { id: 'running', description: 'Running' },
    durationMs: 5_500,
    mostRecentActivityAt: CAPTURED_AT,
    intervalStartedAt: CAPTURED_AT - 5_500,
  },
});

describe('projectLiveAnalytics', () => {
  it('advances every affected value and inserts the running Task into the top five', () => {
    const projected = projectLiveAnalytics(makeSummary(), CAPTURED_AT + 2_000);

    expect(projected.days.at(-1)?.durationMs).toBe(3_000);
    expect(projected.totalDurationMs).toBe(3_000);
    expect(projected.dailyAverageDurationMs).toBe(428);
    expect(projected.currentWeek.durationMs).toBe(3_000);
    expect(projected.currentMonth.durationMs).toBe(3_000);
    expect(projected.runningTask?.durationMs).toBe(7_500);
    expect(projected.topTasks).toHaveLength(5);
    expect(projected.topTasks.map((task) => task.task.id)).toEqual([
      'task-0',
      'task-1',
      'task-2',
      'running',
      'task-3',
    ]);
  });

  it('keeps paused data fixed and caps running projection at the next midnight', () => {
    const paused = { ...makeSummary(), runningTask: null };
    expect(projectLiveAnalytics(paused, CAPTURED_AT + 5_000)).toBe(paused);

    const running = makeSummary();
    const projected = projectLiveAnalytics(
      running,
      running.rangeEndedAt + 60_000,
    );
    expect(projected.totalDurationMs).toBe(
      running.totalDurationMs + running.rangeEndedAt - running.capturedAt,
    );
    expect(projected.runningTask?.mostRecentActivityAt).toBe(
      running.rangeEndedAt,
    );
  });
});
