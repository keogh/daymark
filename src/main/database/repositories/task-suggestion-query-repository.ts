import { asc, desc, eq, sql } from 'drizzle-orm';

import type { ApplicationDatabase } from '@/main/database/database';
import { tasks, timeIntervals } from '@/main/database/schema';
import { getLocalDayRange } from '@/main/services/history-projections';
import {
  TASK_SUGGESTION_LIMIT,
  type TaskSuggestion,
} from '@/shared/contracts/tasks';

export interface TaskSuggestionQueries {
  findSuggestions(normalizedQuery: string, now: number): TaskSuggestion[];
}

export class TaskSuggestionQueryRepository implements TaskSuggestionQueries {
  readonly #db: ApplicationDatabase;

  constructor(db: ApplicationDatabase) {
    this.#db = db;
  }

  findSuggestions(normalizedQuery: string, now: number): TaskSuggestion[] {
    const today = getLocalDayRange(now);
    const matchPosition = sql<number>`instr(${tasks.normalizedDescription}, ${normalizedQuery})`;
    const mostRecentActivityAt = sql<
      number | null
    >`max(${timeIntervals.startedAt})`;
    const effectiveEndedAt = sql<number>`min(coalesce(${timeIntervals.endedAt}, ${now}), ${now})`;
    const lifetimeDurationMs = sql<number>`coalesce(sum(case
      when ${timeIntervals.id} is null then 0
      else max(0, ${effectiveEndedAt} - ${timeIntervals.startedAt})
    end), 0)`;
    const todayDurationMs = sql<number>`coalesce(sum(case
      when ${timeIntervals.id} is null then 0
      else max(
        0,
        min(${effectiveEndedAt}, ${today.dayEndedAt}) -
          max(${timeIntervals.startedAt}, ${today.dayStartedAt})
      )
    end), 0)`;
    const prefixGroup = sql<number>`case when ${matchPosition} = 1 then 0 else 1 end`;
    const missingActivityGroup = sql<number>`case when ${mostRecentActivityAt} is null then 1 else 0 end`;

    return this.#db
      .select({
        task: {
          id: tasks.id,
          description: tasks.description,
        },
        todayDurationMs,
        lifetimeDurationMs,
        mostRecentActivityAt,
      })
      .from(tasks)
      .leftJoin(timeIntervals, eq(timeIntervals.taskId, tasks.id))
      .where(
        normalizedQuery.length === 0 ? undefined : sql`${matchPosition} > 0`,
      )
      .groupBy(tasks.id, tasks.description, tasks.normalizedDescription)
      .orderBy(
        ...(normalizedQuery.length === 0 ? [] : [asc(prefixGroup)]),
        asc(missingActivityGroup),
        desc(mostRecentActivityAt),
        asc(tasks.normalizedDescription),
        asc(tasks.id),
      )
      .limit(TASK_SUGGESTION_LIMIT)
      .all();
  }
}
