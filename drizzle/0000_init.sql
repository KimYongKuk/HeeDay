CREATE TABLE `action_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`category_id` int NOT NULL,
	`description` text,
	`default_checklist` json NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `action_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(40) NOT NULL,
	`color` varchar(20) NOT NULL DEFAULT 'stone',
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_categories_name` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `closure_days` (
	`id` int AUTO_INCREMENT NOT NULL,
	`date` date NOT NULL,
	`name` varchar(60) NOT NULL,
	`kind` enum('PUBLIC_HOLIDAY','SUBSTITUTE','CENTER') NOT NULL,
	`source` varchar(20) NOT NULL DEFAULT 'seed',
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `closure_days_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_closure_days_date` UNIQUE(`date`)
);
--> statement-breakpoint
CREATE TABLE `program_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`color` enum('rose','amber','green','blue','violet','teal') NOT NULL,
	`description` varchar(300),
	`default_assignee` varchar(60),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `program_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `programs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`template_id` int,
	`template_snapshot` json NOT NULL,
	`start_date` date NOT NULL,
	`end_date` date NOT NULL,
	`assignee` varchar(60),
	`color` enum('rose','amber','green','blue','violet','teal') NOT NULL,
	`status` enum('ACTIVE','ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
	`idempotency_key` varchar(36),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `programs_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_programs_idempotency` UNIQUE(`idempotency_key`)
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`program_id` int NOT NULL,
	`template_item_id` int,
	`title` varchar(120) NOT NULL,
	`category_id` int,
	`category_name` varchar(40),
	`due_date` date NOT NULL,
	`required` boolean NOT NULL DEFAULT true,
	`done` boolean NOT NULL DEFAULT false,
	`done_at` datetime(3),
	`checklist` json NOT NULL,
	`notes` text,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `template_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`template_id` int NOT NULL,
	`action_item_id` int NOT NULL,
	`required` boolean NOT NULL DEFAULT true,
	`checklist_override` json,
	`sort_order` int NOT NULL DEFAULT 0,
	CONSTRAINT `template_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `action_items` ADD CONSTRAINT `action_items_category_id_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_program_id_programs_id_fk` FOREIGN KEY (`program_id`) REFERENCES `programs`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `template_items` ADD CONSTRAINT `template_items_template_id_program_templates_id_fk` FOREIGN KEY (`template_id`) REFERENCES `program_templates`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `template_items` ADD CONSTRAINT `template_items_action_item_id_action_items_id_fk` FOREIGN KEY (`action_item_id`) REFERENCES `action_items`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_action_items_category` ON `action_items` (`category_id`);--> statement-breakpoint
CREATE INDEX `idx_action_items_name` ON `action_items` (`name`);--> statement-breakpoint
CREATE INDEX `idx_programs_range` ON `programs` (`start_date`,`end_date`);--> statement-breakpoint
CREATE INDEX `idx_programs_status` ON `programs` (`status`);--> statement-breakpoint
CREATE INDEX `idx_tasks_due` ON `tasks` (`due_date`);--> statement-breakpoint
CREATE INDEX `idx_tasks_program_due` ON `tasks` (`program_id`,`due_date`);--> statement-breakpoint
CREATE INDEX `idx_tasks_done_due` ON `tasks` (`done`,`due_date`);--> statement-breakpoint
CREATE INDEX `idx_template_items_template` ON `template_items` (`template_id`,`sort_order`);--> statement-breakpoint
CREATE INDEX `idx_template_items_action` ON `template_items` (`action_item_id`);