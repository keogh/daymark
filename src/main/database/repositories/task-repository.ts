import { and, eq, ne, sql } from 'drizzle-orm';

import type { ApplicationDatabase } from '@/main/database/database';
import { tasks, timeIntervals } from '@/main/database/schema';
import type { Task } from '@/main/domain/task';

export interface TaskDeletionSummaryRecord {
  readonly task: Task;
  readonly intervalCount: number;
  readonly lifetimeDurationMs: number;
}

export class TaskRepository {
  readonly #db: ApplicationDatabase;

  constructor(db: ApplicationDatabase) {
    this.#db = db;
  }

  findById(id: string): Task | undefined {
    return this.#db.select().from(tasks).where(eq(tasks.id, id)).get();
  }

  findByNormalizedDescription(normalizedDescription: string): Task | undefined {
    return this.#db
      .select()
      .from(tasks)
      .where(eq(tasks.normalizedDescription, normalizedDescription))
      .get();
  }

  findByNormalizedDescriptionExcluding(
    normalizedDescription: string,
    excludedTaskId: string,
  ): Task | undefined {
    return this.#db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.normalizedDescription, normalizedDescription),
          ne(tasks.id, excludedTaskId),
        ),
      )
      .get();
  }

  updateDescription(
    id: string,
    description: string,
    normalizedDescription: string,
    updatedAt: number,
  ): Task | undefined {
    return this.#db
      .update(tasks)
      .set({ description, normalizedDescription, updatedAt })
      .where(eq(tasks.id, id))
      .returning()
      .get();
  }

  delete(id: string): Task | undefined {
    return this.#db.delete(tasks).where(eq(tasks.id, id)).returning().get();
  }

  findDeletionSummary(
    id: string,
    now: number,
  ): TaskDeletionSummaryRecord | undefined {
    const intervalCount = sql<number>`count(${timeIntervals.id})`;
    const effectiveEndedAt = sql<number>`min(coalesce(${timeIntervals.endedAt}, ${now}), ${now})`;
    const lifetimeDurationMs = sql<number>`coalesce(sum(case
      when ${timeIntervals.id} is null then 0
      else max(0, ${effectiveEndedAt} - ${timeIntervals.startedAt})
    end), 0)`;

    return this.#db
      .select({ task: tasks, intervalCount, lifetimeDurationMs })
      .from(tasks)
      .leftJoin(timeIntervals, eq(timeIntervals.taskId, tasks.id))
      .where(eq(tasks.id, id))
      .groupBy(tasks.id)
      .get();
  }

  insert(task: Task): Task {
    const existing = this.findByNormalizedDescription(
      task.normalizedDescription,
    );
    if (existing !== undefined) {
      return existing;
    }

    try {
      this.#db.insert(tasks).values(task).run();
      return task;
    } catch (error: unknown) {
      const concurrentlyInserted = this.findByNormalizedDescription(
        task.normalizedDescription,
      );
      if (concurrentlyInserted !== undefined) {
        return concurrentlyInserted;
      }

      throw error;
    }
  }
}
