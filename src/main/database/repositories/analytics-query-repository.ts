import { and, asc, eq, gt, isNull, lt, or } from 'drizzle-orm';

import type { ApplicationDatabase } from '@/main/database/database';
import { tasks, timeIntervals } from '@/main/database/schema';
import type { TimeInterval } from '@/main/domain/time-interval';
import type { AnalyticsTaskSummary } from '@/shared/contracts/analytics';

export interface AnalyticsQueryInput {
  readonly selectedRangeStartedAt: number;
  readonly currentWeekStartedAt: number;
  readonly currentMonthStartedAt: number;
  readonly capturedAt: number;
}

export interface AnalyticsIntervalRecord {
  readonly task: AnalyticsTaskSummary;
  readonly interval: TimeInterval;
}

export interface AnalyticsQueries {
  findOverlappingUnion(input: AnalyticsQueryInput): AnalyticsIntervalRecord[];
}

export class AnalyticsQueryRepository implements AnalyticsQueries {
  readonly #db: ApplicationDatabase;

  constructor(db: ApplicationDatabase) {
    this.#db = db;
  }

  findOverlappingUnion(input: AnalyticsQueryInput): AnalyticsIntervalRecord[] {
    const boundedStartedAt = Math.min(
      input.selectedRangeStartedAt,
      input.currentWeekStartedAt,
      input.currentMonthStartedAt,
    );

    return this.#db
      .select({
        task: {
          id: tasks.id,
          description: tasks.description,
        },
        interval: {
          id: timeIntervals.id,
          taskId: timeIntervals.taskId,
          startedAt: timeIntervals.startedAt,
          endedAt: timeIntervals.endedAt,
          createdAt: timeIntervals.createdAt,
          updatedAt: timeIntervals.updatedAt,
        },
      })
      .from(timeIntervals)
      .innerJoin(tasks, eq(tasks.id, timeIntervals.taskId))
      .where(
        and(
          lt(timeIntervals.startedAt, input.capturedAt),
          or(
            isNull(timeIntervals.endedAt),
            gt(timeIntervals.endedAt, boundedStartedAt),
          ),
        ),
      )
      .orderBy(asc(timeIntervals.startedAt), asc(timeIntervals.id))
      .all();
  }
}
