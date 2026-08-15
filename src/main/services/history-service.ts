import type {
  HistoryActivityCandidate,
  HistoryIntervalRecord,
  HistoryQueries,
} from '@/main/database/repositories/history-query-repository';
import type { Clock } from '@/main/domain/clock';
import {
  getLocalDayRange,
  getPreviousLocalDayRange,
  projectHistoryDay,
  type HistoryTaskProjectionInput,
  type LocalDayRange,
} from '@/main/services/history-projections';
import {
  HISTORY_ACTIVITY_DAY_LIMIT,
  type HistoryPage,
  type HistoryPageInput,
} from '@/shared/contracts/history';

const ACTIVITY_CANDIDATE_BATCH_SIZE = 128;

export interface HistoryServiceDependencies {
  readonly clock: Clock;
  readonly historyQueries: HistoryQueries;
}

export class HistoryService {
  readonly #clock: Clock;
  readonly #historyQueries: HistoryQueries;

  constructor(dependencies: HistoryServiceDependencies) {
    this.#clock = dependencies.clock;
    this.#historyQueries = dependencies.historyQueries;
  }

  getPage(input: HistoryPageInput): HistoryPage {
    const now = this.#clock.now();
    const today = getLocalDayRange(now);
    const beforeExclusive = input.beforeDayStartedAt ?? today.dayEndedAt;
    const activityDays = this.#findActivityDays(beforeExclusive, now);
    const selectedDays = activityDays.slice(0, HISTORY_ACTIVITY_DAY_LIMIT);
    const hasOlderActivity = activityDays.length > HISTORY_ACTIVITY_DAY_LIMIT;

    if (selectedDays.length === 0) {
      return {
        days: input.beforeDayStartedAt === undefined ? [emptyDay(today)] : [],
        nextBeforeDayStartedAt: null,
        now,
      };
    }

    const oldestDay = selectedDays.at(-1)!;
    const newestDay = selectedDays[0]!;
    const records = this.#historyQueries.findOverlappingRange(
      oldestDay.dayStartedAt,
      newestDay.dayEndedAt,
      now,
    );
    const taskInputs = createTaskProjectionInputs(
      records,
      this.#historyQueries,
      now,
    );
    const projectedDays = selectedDays.map((day) =>
      projectHistoryDay(day, taskInputs, now),
    );
    const days =
      input.beforeDayStartedAt === undefined &&
      selectedDays[0]?.dayStartedAt !== today.dayStartedAt
        ? [emptyDay(today), ...projectedDays]
        : projectedDays;

    return {
      days,
      nextBeforeDayStartedAt: hasOlderActivity ? oldestDay.dayStartedAt : null,
      now,
    };
  }

  #findActivityDays(beforeExclusive: number, now: number): LocalDayRange[] {
    const days = new Map<number, LocalDayRange>();
    let offset = 0;

    while (days.size <= HISTORY_ACTIVITY_DAY_LIMIT) {
      const candidates = this.#historyQueries.findActivityCandidatesBefore(
        beforeExclusive,
        now,
        ACTIVITY_CANDIDATE_BATCH_SIZE,
        offset,
      );

      for (const candidate of candidates) {
        addCandidateDays(days, candidate, beforeExclusive, now);
        if (days.size > HISTORY_ACTIVITY_DAY_LIMIT) {
          break;
        }
      }

      if (
        days.size > HISTORY_ACTIVITY_DAY_LIMIT ||
        candidates.length < ACTIVITY_CANDIDATE_BATCH_SIZE
      ) {
        break;
      }
      offset += candidates.length;
    }

    return [...days.values()].sort(
      (left, right) => right.dayStartedAt - left.dayStartedAt,
    );
  }
}

const addCandidateDays = (
  days: Map<number, LocalDayRange>,
  candidate: HistoryActivityCandidate,
  beforeExclusive: number,
  now: number,
): void => {
  const effectiveEnd = Math.min(candidate.endedAt ?? now, now, beforeExclusive);
  if (effectiveEnd <= candidate.startedAt) {
    return;
  }

  let day = getLocalDayRange(effectiveEnd - 1);
  while (day.dayEndedAt > candidate.startedAt) {
    days.set(day.dayStartedAt, day);
    if (days.size > HISTORY_ACTIVITY_DAY_LIMIT) {
      return;
    }
    day = getPreviousLocalDayRange(day.dayStartedAt);
  }
};

const createTaskProjectionInputs = (
  records: readonly HistoryIntervalRecord[],
  historyQueries: HistoryQueries,
  now: number,
): HistoryTaskProjectionInput[] => {
  const grouped = new Map<
    string,
    Omit<HistoryTaskProjectionInput, 'lifetimeDurationMs'>
  >();
  for (const record of records) {
    const existing = grouped.get(record.task.id);
    if (existing === undefined) {
      grouped.set(record.task.id, {
        task: record.task,
        intervals: [record.interval],
      });
    } else {
      (existing.intervals as (typeof record.interval)[]).push(record.interval);
    }
  }

  const lifetimeByTaskId = new Map(
    historyQueries
      .sumLifetimeDurations([...grouped.keys()], now)
      .map((total) => [total.taskId, total.durationMs]),
  );

  return [...grouped.values()].map((input) => ({
    ...input,
    lifetimeDurationMs: lifetimeByTaskId.get(input.task.id) ?? 0,
  }));
};

const emptyDay = (day: LocalDayRange) => ({
  dayStartedAt: day.dayStartedAt,
  dayEndedAt: day.dayEndedAt,
  totalDurationMs: 0,
  tasks: [],
});
