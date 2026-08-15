import {
  and,
  asc,
  desc,
  eq,
  gt,
  inArray,
  isNull,
  lt,
  or,
  sql,
} from 'drizzle-orm';

import type { ApplicationDatabase } from '@/main/database/database';
import { tasks, timeIntervals } from '@/main/database/schema';
import type { TimeInterval } from '@/main/domain/time-interval';
import type { HistoryTaskSummary } from '@/shared/contracts/history';

export interface HistoryActivityCandidate {
  readonly id: string;
  readonly startedAt: number;
  readonly endedAt: number | null;
}

export interface HistoryIntervalRecord {
  readonly task: HistoryTaskSummary;
  readonly interval: TimeInterval;
}

export interface TaskLifetimeDuration {
  readonly taskId: string;
  readonly durationMs: number;
}

export interface HistoryQueries {
  findActivityCandidatesBefore(
    beforeExclusive: number,
    now: number,
    limit: number,
    offset: number,
  ): HistoryActivityCandidate[];
  findOverlappingRange(
    rangeStartedAt: number,
    rangeEndedAt: number,
    now: number,
  ): HistoryIntervalRecord[];
  sumLifetimeDurations(
    taskIds: readonly string[],
    now: number,
  ): TaskLifetimeDuration[];
}

export class HistoryQueryRepository implements HistoryQueries {
  readonly #db: ApplicationDatabase;

  constructor(db: ApplicationDatabase) {
    this.#db = db;
  }

  findActivityCandidatesBefore(
    beforeExclusive: number,
    now: number,
    limit: number,
    offset: number,
  ): HistoryActivityCandidate[] {
    const effectiveEnd = sql<number>`min(coalesce(${timeIntervals.endedAt}, ${now}), ${now}, ${beforeExclusive})`;

    return this.#db
      .select({
        id: timeIntervals.id,
        startedAt: timeIntervals.startedAt,
        endedAt: timeIntervals.endedAt,
      })
      .from(timeIntervals)
      .where(
        and(
          lt(timeIntervals.startedAt, beforeExclusive),
          lt(timeIntervals.startedAt, now),
        ),
      )
      .orderBy(desc(effectiveEnd), asc(timeIntervals.id))
      .limit(limit)
      .offset(offset)
      .all();
  }

  findOverlappingRange(
    rangeStartedAt: number,
    rangeEndedAt: number,
    now: number,
  ): HistoryIntervalRecord[] {
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
          lt(timeIntervals.startedAt, rangeEndedAt),
          lt(timeIntervals.startedAt, now),
          or(
            isNull(timeIntervals.endedAt),
            gt(timeIntervals.endedAt, rangeStartedAt),
          ),
        ),
      )
      .orderBy(asc(timeIntervals.startedAt), asc(timeIntervals.id))
      .all();
  }

  sumLifetimeDurations(
    taskIds: readonly string[],
    now: number,
  ): TaskLifetimeDuration[] {
    if (taskIds.length === 0) {
      return [];
    }

    const duration = sql<number>`sum(case
      when ${timeIntervals.startedAt} >= ${now} then 0
      else min(coalesce(${timeIntervals.endedAt}, ${now}), ${now}) - ${timeIntervals.startedAt}
    end)`;

    return this.#db
      .select({
        taskId: timeIntervals.taskId,
        durationMs: duration,
      })
      .from(timeIntervals)
      .where(inArray(timeIntervals.taskId, [...taskIds]))
      .groupBy(timeIntervals.taskId)
      .orderBy(asc(timeIntervals.taskId))
      .all();
  }
}
