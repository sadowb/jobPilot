CREATE TABLE `grant` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`provider` text NOT NULL,
	`scope` text NOT NULL,
	`executable_path` text,
	`executable_sha256` text,
	`granted_at` integer NOT NULL,
	`revoked_at` integer,
	`created_at` integer NOT NULL,
	CONSTRAINT "grant_kind_ck" CHECK("grant"."kind" IN ('agent', 'browser')),
	CONSTRAINT "grant_scope_ck" CHECK("grant"."scope" IN ('agent_run', 'browser_tab'))
) STRICT;
--> statement-breakpoint
CREATE UNIQUE INDEX `grant_active_uq` ON `grant` (`kind`,`provider`) WHERE "grant"."revoked_at" IS NULL;--> statement-breakpoint
CREATE INDEX `grant_kind_idx` ON `grant` (`kind`);