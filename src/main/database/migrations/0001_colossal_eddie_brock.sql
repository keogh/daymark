UPDATE `time_intervals`
SET `task_id` = (
	SELECT `canonical`.`id`
	FROM `tasks` AS `duplicate`
	JOIN `tasks` AS `canonical`
		ON `canonical`.`normalized_description` = `duplicate`.`normalized_description`
	WHERE `duplicate`.`id` = `time_intervals`.`task_id`
	ORDER BY `canonical`.`rowid`
	LIMIT 1
);--> statement-breakpoint
UPDATE `app_state`
SET `current_task_id` = (
	SELECT `canonical`.`id`
	FROM `tasks` AS `duplicate`
	JOIN `tasks` AS `canonical`
		ON `canonical`.`normalized_description` = `duplicate`.`normalized_description`
	WHERE `duplicate`.`id` = `app_state`.`current_task_id`
	ORDER BY `canonical`.`rowid`
	LIMIT 1
)
WHERE `current_task_id` IS NOT NULL;--> statement-breakpoint
DELETE FROM `tasks`
WHERE `rowid` NOT IN (
	SELECT MIN(`rowid`)
	FROM `tasks`
	GROUP BY `normalized_description`
);--> statement-breakpoint
DROP INDEX `tasks_normalized_description_idx`;--> statement-breakpoint
CREATE UNIQUE INDEX `tasks_normalized_description_unique_idx` ON `tasks` (`normalized_description`);
