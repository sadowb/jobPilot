DROP INDEX `application_posting_live_uq`;--> statement-breakpoint
DROP INDEX `application_posting_id_idx`;--> statement-breakpoint
CREATE UNIQUE INDEX `application_posting_id_uq` ON `application` (`posting_id`);