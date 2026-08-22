import type { TimeInterval } from '@/main/domain/time-interval';
import type {
  AnalyticsDay,
  AnalyticsPeriodTotal,
  AnalyticsRange,
  AnalyticsRunningTask,
  AnalyticsSummary,
  AnalyticsTaskSummary,
  AnalyticsTaskTotal,
} from '@/shared/contracts/analytics';
import type { WeekStartsOn } from '@/shared/contracts/settings';

export interface AnalyticsCalendarPeriod {
  readonly periodStartedAt: number;
  readonly periodEndedAt: number;
}

export interface AnalyticsTaskProjectionInput {
  readonly task: AnalyticsTaskSummary;
  readonly intervals: readonly TimeInterval[];
}

export interface AnalyticsProjectionInput {
  readonly range: AnalyticsRange;
  readonly capturedAt: number;
  readonly weekStartsOn: WeekStartsOn;
  readonly tasks: readonly AnalyticsTaskProjectionInput[];
}

export const getAnalyticsDayCount = (range: AnalyticsRange): number =>
  range === 'last-7-days' ? 7 : 30;

export const resolveAnalyticsDays = (
  range: AnalyticsRange,
  capturedAt: number,
): readonly AnalyticsDay[] => {
  const dayCount = getAnalyticsDayCount(range);
  const capturedDate = new Date(capturedAt);

  return Array.from({ length: dayCount }, (_, index) => {
    const daysBeforeToday = dayCount - index - 1;
    const dayStartedAt = new Date(
      capturedDate.getFullYear(),
      capturedDate.getMonth(),
      capturedDate.getDate() - daysBeforeToday,
    ).getTime();
    const dayEndedAt = new Date(
      capturedDate.getFullYear(),
      capturedDate.getMonth(),
      capturedDate.getDate() - daysBeforeToday + 1,
    ).getTime();

    return { dayStartedAt, dayEndedAt, durationMs: 0 };
  });
};

export const resolveCurrentWeek = (
  capturedAt: number,
  weekStartsOn: WeekStartsOn = 'monday',
): AnalyticsCalendarPeriod => {
  const date = new Date(capturedAt);
  const weekStartDay = weekStartsOn === 'monday' ? 1 : 0;
  const daysSinceWeekStart = (date.getDay() - weekStartDay + 7) % 7;
  const periodStartedAt = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() - daysSinceWeekStart,
  ).getTime();
  const start = new Date(periodStartedAt);
  const periodEndedAt = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate() + 7,
  ).getTime();

  return { periodStartedAt, periodEndedAt };
};

export const resolveCurrentMonth = (
  capturedAt: number,
): AnalyticsCalendarPeriod => {
  const date = new Date(capturedAt);
  return {
    periodStartedAt: new Date(date.getFullYear(), date.getMonth(), 1).getTime(),
    periodEndedAt: new Date(
      date.getFullYear(),
      date.getMonth() + 1,
      1,
    ).getTime(),
  };
};

export const projectIntervalDuration = (
  interval: TimeInterval,
  period: AnalyticsCalendarPeriod,
  capturedAt: number,
): number => {
  const effectiveEndedAt = Math.min(interval.endedAt ?? capturedAt, capturedAt);
  const projectedStartedAt = Math.max(
    interval.startedAt,
    period.periodStartedAt,
  );
  const projectedEndedAt = Math.min(effectiveEndedAt, period.periodEndedAt);
  return Math.max(0, projectedEndedAt - projectedStartedAt);
};

export const projectAnalyticsSummary = (
  input: AnalyticsProjectionInput,
): AnalyticsSummary => {
  const emptyDays = resolveAnalyticsDays(input.range, input.capturedAt);
  const rangeStartedAt = emptyDays[0]!.dayStartedAt;
  const rangeEndedAt = emptyDays.at(-1)!.dayEndedAt;
  const rangePeriod = {
    periodStartedAt: rangeStartedAt,
    periodEndedAt: rangeEndedAt,
  };
  const weekPeriod = resolveCurrentWeek(input.capturedAt, input.weekStartsOn);
  const monthPeriod = resolveCurrentMonth(input.capturedAt);
  const intervals = input.tasks.flatMap((task) => task.intervals);
  const days = emptyDays.map((day) => ({
    ...day,
    durationMs: sumPeriodDuration(
      intervals,
      { periodStartedAt: day.dayStartedAt, periodEndedAt: day.dayEndedAt },
      input.capturedAt,
    ),
  }));
  const totalDurationMs = days.reduce(
    (total, day) => total + day.durationMs,
    0,
  );
  const taskTotals = input.tasks
    .map((task) => projectTaskTotal(task, rangePeriod, input.capturedAt))
    .filter((task): task is AnalyticsTaskTotal => task !== null)
    .sort(compareAnalyticsTaskTotals);

  return {
    range: input.range,
    rangeStartedAt,
    rangeEndedAt,
    capturedAt: input.capturedAt,
    days,
    totalDurationMs,
    dailyAverageDurationMs: Math.floor(
      totalDurationMs / getAnalyticsDayCount(input.range),
    ),
    currentWeek: projectPeriodTotal(intervals, weekPeriod, input.capturedAt),
    currentMonth: projectPeriodTotal(intervals, monthPeriod, input.capturedAt),
    topTasks: taskTotals.slice(0, 5),
    runningTask: projectRunningTask(input.tasks, rangePeriod, input.capturedAt),
  };
};

const projectPeriodTotal = (
  intervals: readonly TimeInterval[],
  period: AnalyticsCalendarPeriod,
  capturedAt: number,
): AnalyticsPeriodTotal => ({
  ...period,
  durationMs: sumPeriodDuration(intervals, period, capturedAt),
});

const sumPeriodDuration = (
  intervals: readonly TimeInterval[],
  period: AnalyticsCalendarPeriod,
  capturedAt: number,
): number =>
  intervals.reduce(
    (total, interval) =>
      total + projectIntervalDuration(interval, period, capturedAt),
    0,
  );

const projectTaskTotal = (
  input: AnalyticsTaskProjectionInput,
  period: AnalyticsCalendarPeriod,
  capturedAt: number,
): AnalyticsTaskTotal | null => {
  const contributions = input.intervals
    .map((interval) => ({
      durationMs: projectIntervalDuration(interval, period, capturedAt),
      effectiveEndpoint: Math.min(
        interval.endedAt ?? capturedAt,
        capturedAt,
        period.periodEndedAt,
      ),
    }))
    .filter((contribution) => contribution.durationMs > 0);

  if (contributions.length === 0) {
    return null;
  }

  return {
    task: input.task,
    durationMs: contributions.reduce(
      (total, contribution) => total + contribution.durationMs,
      0,
    ),
    mostRecentActivityAt: Math.max(
      ...contributions.map((contribution) => contribution.effectiveEndpoint),
    ),
  };
};

const projectRunningTask = (
  tasks: readonly AnalyticsTaskProjectionInput[],
  period: AnalyticsCalendarPeriod,
  capturedAt: number,
): AnalyticsRunningTask | null => {
  for (const task of tasks) {
    const openInterval = task.intervals.find(
      (interval) => interval.endedAt === null,
    );
    if (openInterval === undefined) {
      continue;
    }

    const total = projectTaskTotal(task, period, capturedAt);
    return {
      task: task.task,
      durationMs: total?.durationMs ?? 0,
      mostRecentActivityAt: total?.mostRecentActivityAt ?? capturedAt,
      intervalStartedAt: openInterval.startedAt,
    };
  }

  return null;
};

export const compareAnalyticsTaskTotals = (
  left: AnalyticsTaskTotal,
  right: AnalyticsTaskTotal,
): number =>
  right.durationMs - left.durationMs ||
  right.mostRecentActivityAt - left.mostRecentActivityAt ||
  compareStrings(left.task.description, right.task.description) ||
  compareStrings(left.task.id, right.task.id);

const compareStrings = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0;
