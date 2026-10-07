DROP INDEX `idx_tasks_important` ON `tasks`;--> statement-breakpoint
ALTER TABLE `tasks` ADD `status` enum('TODO','DOING','DONE') DEFAULT 'TODO' NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_tasks_status_due` ON `tasks` (`status`,`due_date`);--> statement-breakpoint
CREATE INDEX `idx_tasks_important` ON `tasks` (`important`,`status`,`due_date`);--> statement-breakpoint
UPDATE `tasks` SET `status` = 'DONE' WHERE `done` = 1;