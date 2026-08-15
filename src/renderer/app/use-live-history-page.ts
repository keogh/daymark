import { useEffect, useState } from 'react';

import type {
  HistoryDay,
  HistoryPage,
  HistoryTask,
} from '@/shared/contracts/history';

const DISPLAY_TICK_MS = 1_000;

const advanceTask = (
  task: HistoryTask,
  rendererNow: number,
  snapshotNow: number,
  dayEndedAt: number,
): HistoryTask => {
  const runningInterval = task.intervals.find((interval) => interval.isRunning);
  if (runningInterval === undefined) {
    return task;
  }

  const projectedEndedAt = Math.min(rendererNow, dayEndedAt);
  const projectedDelta = Math.max(
    0,
    projectedEndedAt - runningInterval.projectedEndedAt,
  );
  const lifetimeDelta = Math.max(0, rendererNow - snapshotNow);

  return {
    ...task,
    dayDurationMs: task.dayDurationMs + projectedDelta,
    lifetimeDurationMs: task.lifetimeDurationMs + lifetimeDelta,
    mostRecentActivityAt: projectedEndedAt,
    intervals: task.intervals.map((interval) =>
      interval.id === runningInterval.id
        ? {
            ...interval,
            projectedEndedAt,
            durationMs: interval.durationMs + projectedDelta,
          }
        : interval,
    ),
  };
};

const advanceDay = (
  day: HistoryDay,
  rendererNow: number,
  snapshotNow: number,
): HistoryDay => {
  let totalDelta = 0;
  const tasks = day.tasks.map((task) => {
    const advancedTask = advanceTask(
      task,
      rendererNow,
      snapshotNow,
      day.dayEndedAt,
    );
    totalDelta += advancedTask.dayDurationMs - task.dayDurationMs;
    return advancedTask;
  });

  return totalDelta === 0
    ? day
    : { ...day, totalDurationMs: day.totalDurationMs + totalDelta, tasks };
};

export const deriveLiveHistoryPage = (
  page: HistoryPage,
  rendererNow: number,
): HistoryPage => {
  if (
    !page.days.some((day) =>
      day.tasks.some((task) =>
        task.intervals.some((interval) => interval.isRunning),
      ),
    )
  ) {
    return page;
  }

  return {
    ...page,
    days: page.days.map((day) => advanceDay(day, rendererNow, page.now)),
  };
};

export const useLiveHistoryPage = (page: HistoryPage): HistoryPage => {
  const [rendererNow, setRendererNow] = useState(() => Date.now());
  const hasRunningInterval = page.days.some((day) =>
    day.tasks.some((task) =>
      task.intervals.some((interval) => interval.isRunning),
    ),
  );

  useEffect(() => {
    if (!hasRunningInterval) {
      return;
    }

    const interval = window.setInterval(() => {
      setRendererNow(Date.now());
    }, DISPLAY_TICK_MS);
    return () => window.clearInterval(interval);
  }, [hasRunningInterval, page.now]);

  return deriveLiveHistoryPage(page, rendererNow);
};
