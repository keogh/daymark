import type { TimeIntervalRepository } from '@/main/database/repositories/time-interval-repository';
import type { TimeInterval } from '@/main/domain/time-interval';

interface DurationRange {
  readonly startedAt: number;
  readonly endedAt: number;
}

export interface DurationProjectionInput {
  readonly taskId: string;
  readonly sessionStartedAt: number;
  readonly now: number;
}

export interface DurationProjections {
  readonly sessionDurationMs: number;
  readonly taskTodayDurationMs: number;
  readonly taskLifetimeDurationMs: number;
}

export const sumIntervalDuration = (
  intervals: readonly TimeInterval[],
  now: number,
  range?: DurationRange,
): number =>
  intervals.reduce((total, interval) => {
    const effectiveEnd = Math.min(interval.endedAt ?? now, now);
    const overlapStartedAt = Math.max(
      interval.startedAt,
      range?.startedAt ?? interval.startedAt,
    );
    const overlapEndedAt = Math.min(
      effectiveEnd,
      range?.endedAt ?? effectiveEnd,
    );

    return total + Math.max(0, overlapEndedAt - overlapStartedAt);
  }, 0);

export const getLocalDayRange = (now: number): DurationRange => {
  const date = new Date(now);
  const startedAt = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();
  const endedAt = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + 1,
  ).getTime();

  return { startedAt, endedAt };
};

export class DurationProjector {
  readonly #intervals: TimeIntervalRepository;

  constructor(intervals: TimeIntervalRepository) {
    this.#intervals = intervals;
  }

  project(input: DurationProjectionInput): DurationProjections {
    const today = getLocalDayRange(input.now);

    return {
      sessionDurationMs: sumIntervalDuration(
        this.#intervals.findForSession(
          input.taskId,
          input.sessionStartedAt,
          input.now,
        ),
        input.now,
      ),
      taskTodayDurationMs: sumIntervalDuration(
        this.#intervals.findOverlappingTaskRange(
          input.taskId,
          today.startedAt,
          today.endedAt,
        ),
        input.now,
        today,
      ),
      taskLifetimeDurationMs: sumIntervalDuration(
        this.#intervals.findByTask(input.taskId),
        input.now,
      ),
    };
  }
}
