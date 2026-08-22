import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

export const tasks = sqliteTable(
  'tasks',
  {
    id: text('id').primaryKey().notNull(),
    description: text('description').notNull(),
    normalizedDescription: text('normalized_description').notNull(),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => [
    uniqueIndex('tasks_normalized_description_unique_idx').on(
      table.normalizedDescription,
    ),
    index('tasks_updated_at_idx').on(table.updatedAt),
  ],
);

export const timeIntervals = sqliteTable(
  'time_intervals',
  {
    id: text('id').primaryKey().notNull(),
    taskId: text('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    startedAt: integer('started_at').notNull(),
    endedAt: integer('ended_at'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => [
    check(
      'time_intervals_valid_timestamp_order_check',
      sql`${table.endedAt} is null or ${table.endedAt} > ${table.startedAt}`,
    ),
    index('time_intervals_task_id_idx').on(table.taskId),
    index('time_intervals_started_at_idx').on(table.startedAt),
    index('time_intervals_task_started_idx').on(table.taskId, table.startedAt),
    uniqueIndex('one_open_interval_only_idx')
      .on(sql`(1)`)
      .where(sql`${table.endedAt} is null`),
  ],
);

export const appState = sqliteTable(
  'app_state',
  {
    id: integer('id').primaryKey().notNull(),
    timerStatus: text('timer_status', {
      enum: ['idle', 'running', 'paused'],
    }).notNull(),
    currentTaskId: text('current_task_id').references(() => tasks.id, {
      onDelete: 'set null',
    }),
    sessionStartedAt: integer('session_started_at'),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => [
    check('app_state_singleton_id_check', sql`${table.id} = 1`),
    check(
      'app_state_timer_status_check',
      sql`${table.timerStatus} in ('idle', 'running', 'paused')`,
    ),
  ],
);

export const applicationSettings = sqliteTable(
  'application_settings',
  {
    id: integer('id').primaryKey().notNull(),
    weekStartsOn: text('week_starts_on', {
      enum: ['monday', 'sunday'],
    })
      .notNull()
      .default('monday'),
    theme: text('theme', { enum: ['system', 'light', 'dark'] })
      .notNull()
      .default('system'),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => [
    check('application_settings_singleton_id_check', sql`${table.id} = 1`),
    check(
      'application_settings_week_start_check',
      sql`${table.weekStartsOn} in ('monday', 'sunday')`,
    ),
    check(
      'application_settings_theme_check',
      sql`${table.theme} in ('system', 'light', 'dark')`,
    ),
  ],
);
