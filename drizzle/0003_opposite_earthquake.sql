ALTER TABLE `run` ADD `attempts` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `run` ADD `claimed_at` integer;--> statement-breakpoint
ALTER TABLE `run` ADD `progress_at` integer;