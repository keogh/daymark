import { eq } from 'drizzle-orm';

import type { ApplicationDatabase } from '@/main/database/database';
import { tasks } from '@/main/database/schema';
import type { Task } from '@/main/domain/task';

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
