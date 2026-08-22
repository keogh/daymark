CREATE TABLE `application_settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`week_starts_on` text DEFAULT 'monday' NOT NULL,
	`theme` text DEFAULT 'system' NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "application_settings_singleton_id_check" CHECK("application_settings"."id" = 1),
	CONSTRAINT "application_settings_week_start_check" CHECK("application_settings"."week_starts_on" in ('monday', 'sunday')),
	CONSTRAINT "application_settings_theme_check" CHECK("application_settings"."theme" in ('system', 'light', 'dark'))
);
--> statement-breakpoint
INSERT INTO `application_settings` (`id`, `week_starts_on`, `theme`, `updated_at`)
VALUES (1, 'monday', 'system', 0);
