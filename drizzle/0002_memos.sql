CREATE TABLE `memos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`body` text NOT NULL,
	`program_id` int,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `memos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `memos` ADD CONSTRAINT `memos_program_id_programs_id_fk` FOREIGN KEY (`program_id`) REFERENCES `programs`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_memos_program` ON `memos` (`program_id`);--> statement-breakpoint
CREATE INDEX `idx_memos_created` ON `memos` (`created_at`);