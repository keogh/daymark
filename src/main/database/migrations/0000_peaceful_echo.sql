CREATE TABLE `app_state` (
	`id` integer PRIMARY KEY NOT NULL,
	`timer_status` text NOT NULL,
	`current_task_id` text,
	`session_started_at` integer,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`current_task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "app_state_singleton_id_check" CHECK("app_state"."id" = 1),
	CONSTRAINT "app_state_timer_status_check" CHECK("app_state"."timer_status" in ('idle', 'running', 'paused'))
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`description` text NOT NULL,
	`normalized_description` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `tasks_normalized_description_idx` ON `tasks` (`normalized_description`);--> statement-breakpoint
CREATE INDEX `tasks_updated_at_idx` ON `tasks` (`updated_at`);--> statement-breakpoint
CREATE TABLE `time_intervals` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`started_at` integer NOT NULL,
	`ended_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "time_intervals_valid_timestamp_order_check" CHECK("time_intervals"."ended_at" is null or "time_intervals"."ended_at" > "time_intervals"."started_at")
);
--> statement-breakpoint
CREATE INDEX `time_intervals_task_id_idx` ON `time_intervals` (`task_id`);--> statement-breakpoint
CREATE INDEX `time_intervals_started_at_idx` ON `time_intervals` (`started_at`);--> statement-breakpoint
CREATE INDEX `time_intervals_task_started_idx` ON `time_intervals` (`task_id`,`started_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `one_open_interval_only_idx` ON `time_intervals` ((1)) WHERE "time_intervals"."ended_at" is null;
