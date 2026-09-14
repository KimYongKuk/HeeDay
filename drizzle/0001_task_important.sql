ALTER TABLE `tasks` ADD `important` boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_tasks_important` ON `tasks` (`important`,`done`,`due_date`);