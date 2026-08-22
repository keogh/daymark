import type {
  AnalyticsSummary,
  AnalyticsTaskTotal,
} from '@/shared/contracts/analytics';

const compareTasks = (
  left: AnalyticsTaskTotal,
  right: AnalyticsTaskTotal,
): number => {
  if (left.durationMs !== right.durationMs) {
    return right.durationMs - left.durationMs;
  }
  if (left.mostRecentActivityAt !== right.mostRecentActivityAt) {
    return right.mostRecentActivityAt - left.mostRecentActivityAt;
  }
  if (left.task.description !== right.task.description) {
    return left.task.description < right.task.description ? -1 : 1;
  }
  if (left.task.id === right.task.id) return 0;
  return left.task.id < right.task.id ? -1 : 1;
};

export const projectLiveAnalytics = (
  summary: AnalyticsSummary,
  now: number,
): AnalyticsSummary => {
  const runningTask = summary.runningTask;
  if (runningTask === null || now <= summary.capturedAt) return summary;

  const projectedAt = Math.min(now, summary.rangeEndedAt);
  const elapsedMs = Math.max(0, projectedAt - summary.capturedAt);
  if (elapsedMs === 0) return summary;

  const todayIndex = summary.days.length - 1;
  const days = summary.days.map((day, index) =>
    index === todayIndex
      ? { ...day, durationMs: day.durationMs + elapsedMs }
      : day,
  );
  const totalDurationMs = summary.totalDurationMs + elapsedMs;
  const projectedRunningTask = {
    ...runningTask,
    durationMs: runningTask.durationMs + elapsedMs,
    mostRecentActivityAt: projectedAt,
  };
  const tasks = summary.topTasks.filter(
    (entry) => entry.task.id !== runningTask.task.id,
  );
  tasks.push(projectedRunningTask);
  tasks.sort(compareTasks);

  return {
    ...summary,
    days,
    totalDurationMs,
    dailyAverageDurationMs: Math.floor(totalDurationMs / summary.days.length),
    currentWeek: {
      ...summary.currentWeek,
      durationMs: summary.currentWeek.durationMs + elapsedMs,
    },
    currentMonth: {
      ...summary.currentMonth,
      durationMs: summary.currentMonth.durationMs + elapsedMs,
    },
    topTasks: tasks.slice(0, 5),
    runningTask: projectedRunningTask,
  };
};
