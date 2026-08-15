import {
  and,
  asc,
  eq,
  gt,
  gte,
  isNotNull,
  isNull,
  lt,
  lte,
  ne,
  or,
} from 'drizzle-orm';

import type { ApplicationDatabase } from '@/main/database/database';
import { timeIntervals } from '@/main/database/schema';
import type { TimeInterval } from '@/main/domain/time-interval';

export class TimeIntervalRepository {
  readonly #db: ApplicationDatabase;

  constructor(db: ApplicationDatabase) {
    this.#db = db;
  }

  insert(interval: TimeInterval): TimeInterval {
    this.#db.insert(timeIntervals).values(interval).run();
    return interval;
  }

  findById(id: string): TimeInterval | undefined {
    return this.#db
      .select()
      .from(timeIntervals)
      .where(eq(timeIntervals.id, id))
      .get();
  }

  findOpen(): TimeInterval | undefined {
    return this.#db
      .select()
      .from(timeIntervals)
      .where(isNull(timeIntervals.endedAt))
      .get();
  }

  close(
    id: string,
    endedAt: number,
    updatedAt: number,
  ): TimeInterval | undefined {
    return this.#db
      .update(timeIntervals)
      .set({ endedAt, updatedAt })
      .where(and(eq(timeIntervals.id, id), isNull(timeIntervals.endedAt)))
      .returning()
      .get();
  }

  updateClosed(
    id: string,
    startedAt: number,
    endedAt: number,
    updatedAt: number,
  ): TimeInterval | undefined {
    return this.#db
      .update(timeIntervals)
      .set({ startedAt, endedAt, updatedAt })
      .where(and(eq(timeIntervals.id, id), isNotNull(timeIntervals.endedAt)))
      .returning()
      .get();
  }

  deleteClosed(id: string): TimeInterval | undefined {
    return this.#db
      .delete(timeIntervals)
      .where(and(eq(timeIntervals.id, id), isNotNull(timeIntervals.endedAt)))
      .returning()
      .get();
  }

  findForSession(
    taskId: string,
    sessionStartedAt: number,
    now: number,
  ): TimeInterval[] {
    return this.#db
      .select()
      .from(timeIntervals)
      .where(
        and(
          eq(timeIntervals.taskId, taskId),
          gte(timeIntervals.startedAt, sessionStartedAt),
          lte(timeIntervals.startedAt, now),
        ),
      )
      .orderBy(asc(timeIntervals.startedAt))
      .all();
  }

  findOverlappingTaskRange(
    taskId: string,
    rangeStartedAt: number,
    rangeEndedAt: number,
  ): TimeInterval[] {
    return this.#db
      .select()
      .from(timeIntervals)
      .where(
        and(
          eq(timeIntervals.taskId, taskId),
          lt(timeIntervals.startedAt, rangeEndedAt),
          or(
            isNull(timeIntervals.endedAt),
            gt(timeIntervals.endedAt, rangeStartedAt),
          ),
        ),
      )
      .orderBy(asc(timeIntervals.startedAt))
      .all();
  }

  findOverlappingClosedRange(
    rangeStartedAt: number,
    rangeEndedAt: number,
  ): TimeInterval[] {
    return this.#db
      .select()
      .from(timeIntervals)
      .where(
        and(
          isNotNull(timeIntervals.endedAt),
          lt(timeIntervals.startedAt, rangeEndedAt),
          gt(timeIntervals.endedAt, rangeStartedAt),
        ),
      )
      .orderBy(asc(timeIntervals.startedAt))
      .all();
  }

  findOverlappingClosedRangeExcluding(
    excludedIntervalId: string,
    rangeStartedAt: number,
    rangeEndedAt: number,
  ): TimeInterval[] {
    return this.#db
      .select()
      .from(timeIntervals)
      .where(
        and(
          ne(timeIntervals.id, excludedIntervalId),
          isNotNull(timeIntervals.endedAt),
          lt(timeIntervals.startedAt, rangeEndedAt),
          gt(timeIntervals.endedAt, rangeStartedAt),
        ),
      )
      .orderBy(asc(timeIntervals.startedAt))
      .all();
  }

  findByTask(taskId: string): TimeInterval[] {
    return this.#db
      .select()
      .from(timeIntervals)
      .where(eq(timeIntervals.taskId, taskId))
      .orderBy(asc(timeIntervals.startedAt))
      .all();
  }
}
