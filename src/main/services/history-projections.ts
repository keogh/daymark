import type { TimeInterval } from '@/main/domain/time-interval';
import {
  HISTORY_ACTIVITY_DAY_LIMIT,
  type HistoryDay,
  type HistoryInterval,
  type HistoryTask,
  type HistoryTaskSummary,
} from '@/shared/contracts/history';

export interface LocalDayRange {
  readonly dayStartedAt: number;
  readonly dayEndedAt: number;
}

export interface HistoryTaskProjectionInput {
  readonly task: HistoryTaskSummary;
  readonly intervals: readonly TimeInterval[];
  readonly lifetimeDurationMs: number;
}

export interface HistoryPageSelection {
  readonly days: HistoryDay[];
  readonly nextBeforeDayStartedAt: number | null;
}

export const getLocalDayRange = (timestamp: number): LocalDayRange => {
  const date = new Date(timestamp);
  const dayStartedAt = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();
  const dayEndedAt = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + 1,
  ).getTime();

  return { dayStartedAt, dayEndedAt };
};

export const getPreviousLocalDayRange = (
  dayStartedAt: number,
): LocalDayRange => {
  const date = new Date(dayStartedAt);
  return getLocalDayRange(
    new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1).getTime(),
  );
};

export const projectIntervalToDay = (
  interval: TimeInterval,
  day: LocalDayRange,
  now: number,
): HistoryInterval | null => {
  const effectiveEndedAt = Math.min(interval.endedAt ?? now, now);
  const projectedStartedAt = Math.max(interval.startedAt, day.dayStartedAt);
  const projectedEndedAt = Math.min(effectiveEndedAt, day.dayEndedAt);
  const durationMs = Math.max(0, projectedEndedAt - projectedStartedAt);

  if (durationMs === 0) {
    return null;
  }

  return {
    id: interval.id,
    projectedStartedAt,
    projectedEndedAt,
    durationMs,
    isRunning: interval.endedAt === null,
  };
};

export const sumLifetimeDuration = (
  intervals: readonly TimeInterval[],
  now: number,
): number =>
  intervals.reduce(
    (total, interval) =>
      total +
      Math.max(0, Math.min(interval.endedAt ?? now, now) - interval.startedAt),
    0,
  );

export const projectHistoryTask = (
  input: HistoryTaskProjectionInput,
  day: LocalDayRange,
  now: number,
): HistoryTask | null => {
  const intervals = input.intervals
    .map((interval) => projectIntervalToDay(interval, day, now))
    .filter((interval): interval is HistoryInterval => interval !== null)
    .sort(compareHistoryIntervals);

  if (intervals.length === 0) {
    return null;
  }

  return {
    task: input.task,
    dayDurationMs: intervals.reduce(
      (total, interval) => total + interval.durationMs,
      0,
    ),
    lifetimeDurationMs: input.lifetimeDurationMs,
    mostRecentActivityAt: Math.max(
      ...intervals.map((interval) => interval.projectedEndedAt),
    ),
    intervals,
  };
};

export const projectHistoryDay = (
  day: LocalDayRange,
  tasks: readonly HistoryTaskProjectionInput[],
  now: number,
): HistoryDay => {
  const projectedTasks = tasks
    .map((task) => projectHistoryTask(task, day, now))
    .filter((task): task is HistoryTask => task !== null)
    .sort(compareHistoryTasks);

  return {
    dayStartedAt: day.dayStartedAt,
    dayEndedAt: day.dayEndedAt,
    totalDurationMs: projectedTasks.reduce(
      (total, task) => total + task.dayDurationMs,
      0,
    ),
    tasks: projectedTasks,
  };
};

export const selectHistoryPage = (
  activityDays: readonly HistoryDay[],
  today: LocalDayRange,
  beforeDayStartedAt?: number,
): HistoryPageSelection => {
  const uniqueActivityDays = [
    ...new Map(
      activityDays
        .filter((day) => day.totalDurationMs > 0)
        .map((day) => [day.dayStartedAt, day]),
    ).values(),
  ]
    .filter(
      (day) =>
        beforeDayStartedAt === undefined ||
        day.dayStartedAt < beforeDayStartedAt,
    )
    .sort((left, right) => right.dayStartedAt - left.dayStartedAt);

  const selectedActivityDays = uniqueActivityDays.slice(
    0,
    HISTORY_ACTIVITY_DAY_LIMIT,
  );
  const hasOlderActivity =
    uniqueActivityDays.length > HISTORY_ACTIVITY_DAY_LIMIT;
  const days =
    beforeDayStartedAt === undefined &&
    !selectedActivityDays.some((day) => day.dayStartedAt === today.dayStartedAt)
      ? [createEmptyDay(today), ...selectedActivityDays]
      : selectedActivityDays;

  return {
    days,
    nextBeforeDayStartedAt: hasOlderActivity
      ? (selectedActivityDays.at(-1)?.dayStartedAt ?? null)
      : null,
  };
};

const compareHistoryTasks = (left: HistoryTask, right: HistoryTask): number =>
  right.mostRecentActivityAt - left.mostRecentActivityAt ||
  compareStrings(left.task.description, right.task.description) ||
  compareStrings(left.task.id, right.task.id);

const compareHistoryIntervals = (
  left: HistoryInterval,
  right: HistoryInterval,
): number =>
  left.projectedStartedAt - right.projectedStartedAt ||
  compareStrings(left.id, right.id);

const compareStrings = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0;

const createEmptyDay = (day: LocalDayRange): HistoryDay => ({
  dayStartedAt: day.dayStartedAt,
  dayEndedAt: day.dayEndedAt,
  totalDurationMs: 0,
  tasks: [],
});
