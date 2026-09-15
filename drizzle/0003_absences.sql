CREATE TABLE `absences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`start_date` date NOT NULL,
	`end_date` date NOT NULL,
	`kind` enum('LEAVE','TRIP','OTHER') NOT NULL,
	`name` varchar(60) NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `absences_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_absences_range` ON `absences` (`start_date`,`end_date`);