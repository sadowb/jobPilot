CREATE TABLE `site_account` (
	`id` text PRIMARY KEY NOT NULL,
	`host` text NOT NULL,
	`username` text NOT NULL,
	`secret_enc` blob NOT NULL,
	`status` text DEFAULT 'unknown' NOT NULL,
	`last_login_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	CONSTRAINT "site_account_status_ck" CHECK("site_account"."status" IN ('ok', 'needs_relogin', 'unknown'))
) STRICT;
--> statement-breakpoint
CREATE UNIQUE INDEX `site_account_host_username_live_uq` ON `site_account` (`host`,`username`) WHERE "site_account"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX `site_account_host_idx` ON `site_account` (`host`);--> statement-breakpoint
CREATE TABLE `application` (
	`id` text PRIMARY KEY NOT NULL,
	`posting_id` text NOT NULL,
	`cv_version_id` text,
	`status` text DEFAULT 'queued' NOT NULL,
	`queue_rank` integer NOT NULL,
	`applied_at` integer,
	`last_activity_at` integer NOT NULL,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`posting_id`) REFERENCES `job_posting`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`cv_version_id`) REFERENCES `document_version`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "application_status_ck" CHECK("application"."status" IN ('queued', 'running', 'needs_answers', 'awaiting_approval', 'submitting', 'applied', 'interviewing', 'offer', 'rejected', 'withdrawn', 'blocked', 'failed'))
) STRICT;
--> statement-breakpoint
CREATE UNIQUE INDEX `application_posting_live_uq` ON `application` (`posting_id`) WHERE "application"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX `application_posting_id_idx` ON `application` (`posting_id`);--> statement-breakpoint
CREATE INDEX `application_status_queue_rank_idx` ON `application` (`status`,`queue_rank`);--> statement-breakpoint
CREATE INDEX `application_cv_version_id_idx` ON `application` (`cv_version_id`);--> statement-breakpoint
CREATE TABLE `application_answer` (
	`id` text PRIMARY KEY NOT NULL,
	`application_id` text NOT NULL,
	`question_id` text,
	`library_id` text,
	`field_key` text NOT NULL,
	`question_text` text NOT NULL,
	`answer` text,
	`source` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`application_id`) REFERENCES `application`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`question_id`) REFERENCES `posting_question`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`library_id`) REFERENCES `answer_library`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "application_answer_source_ck" CHECK("application_answer"."source" IN ('library', 'profile', 'agent', 'owner'))
) STRICT;
--> statement-breakpoint
CREATE UNIQUE INDEX `application_answer_field_uq` ON `application_answer` (`application_id`,`field_key`);--> statement-breakpoint
CREATE INDEX `application_answer_question_id_idx` ON `application_answer` (`question_id`);--> statement-breakpoint
CREATE INDEX `application_answer_library_id_idx` ON `application_answer` (`library_id`);--> statement-breakpoint
CREATE TABLE `application_event` (
	`id` text PRIMARY KEY NOT NULL,
	`application_id` text NOT NULL,
	`run_id` text,
	`type` text NOT NULL,
	`actor` text NOT NULL,
	`from_status` text,
	`to_status` text,
	`data` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`application_id`) REFERENCES `application`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`run_id`) REFERENCES `run`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "application_event_actor_ck" CHECK("application_event"."actor" IN ('owner', 'agent', 'system'))
) STRICT;
--> statement-breakpoint
CREATE INDEX `application_event_app_created_idx` ON `application_event` (`application_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `application_event_run_id_idx` ON `application_event` (`run_id`);--> statement-breakpoint
CREATE TABLE `cap_conversation` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text,
	`agent` text NOT NULL,
	`session_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	CONSTRAINT "cap_conversation_agent_ck" CHECK("cap_conversation"."agent" IN ('claude', 'codex', 'agy'))
) STRICT;
--> statement-breakpoint
CREATE TABLE `cap_message` (
	`id` text PRIMARY KEY NOT NULL,
	`conversation_id` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`conversation_id`) REFERENCES `cap_conversation`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "cap_message_role_ck" CHECK("cap_message"."role" IN ('user', 'assistant', 'system'))
) STRICT;
--> statement-breakpoint
CREATE INDEX `cap_message_conversation_created_idx` ON `cap_message` (`conversation_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `document` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	CONSTRAINT "document_kind_ck" CHECK("document"."kind" IN ('cv', 'cover_letter', 'transcript', 'other'))
) STRICT;
--> statement-breakpoint
CREATE TABLE `document_version` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`version` integer NOT NULL,
	`file_name` text NOT NULL,
	`mime` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`sha256` text NOT NULL,
	`storage_path` text NOT NULL,
	`parsed_text` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `document`(`id`) ON UPDATE no action ON DELETE cascade
) STRICT;
--> statement-breakpoint
CREATE UNIQUE INDEX `document_version_doc_version_uq` ON `document_version` (`document_id`,`version`);--> statement-breakpoint
CREATE INDEX `document_version_sha256_idx` ON `document_version` (`sha256`);--> statement-breakpoint
CREATE TABLE `email_signal` (
	`id` text PRIMARY KEY NOT NULL,
	`application_id` text,
	`thread_id` text,
	`message_id` text NOT NULL,
	`kind` text NOT NULL,
	`value` text,
	`received_at` integer NOT NULL,
	`consumed_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`application_id`) REFERENCES `application`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`thread_id`) REFERENCES `inbox_thread`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "email_signal_kind_ck" CHECK("email_signal"."kind" IN ('verification_code', 'confirmation', 'rejection', 'interview', 'reply', 'other'))
) STRICT;
--> statement-breakpoint
CREATE UNIQUE INDEX `email_signal_message_id_uq` ON `email_signal` (`message_id`);--> statement-breakpoint
CREATE INDEX `email_signal_application_id_idx` ON `email_signal` (`application_id`);--> statement-breakpoint
CREATE INDEX `email_signal_thread_id_idx` ON `email_signal` (`thread_id`);--> statement-breakpoint
CREATE TABLE `inbox_message` (
	`id` text PRIMARY KEY NOT NULL,
	`thread_id` text NOT NULL,
	`answer_id` text,
	`sender` text NOT NULL,
	`body` text NOT NULL,
	`external_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`thread_id`) REFERENCES `inbox_thread`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`answer_id`) REFERENCES `application_answer`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "inbox_message_sender_ck" CHECK("inbox_message"."sender" IN ('owner', 'agent', 'employer', 'system'))
) STRICT;
--> statement-breakpoint
CREATE INDEX `inbox_message_thread_created_idx` ON `inbox_message` (`thread_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `inbox_message_answer_id_idx` ON `inbox_message` (`answer_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `inbox_message_external_id_uq` ON `inbox_message` (`external_id`);--> statement-breakpoint
CREATE TABLE `inbox_thread` (
	`id` text PRIMARY KEY NOT NULL,
	`application_id` text,
	`kind` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`subject` text NOT NULL,
	`last_message_at` integer NOT NULL,
	`resolved_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`application_id`) REFERENCES `application`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "inbox_thread_kind_ck" CHECK("inbox_thread"."kind" IN ('needs_answer', 'approval', 'email', 'system')),
	CONSTRAINT "inbox_thread_status_ck" CHECK("inbox_thread"."status" IN ('open', 'resolved', 'snoozed'))
) STRICT;
--> statement-breakpoint
CREATE INDEX `inbox_thread_application_id_idx` ON `inbox_thread` (`application_id`);--> statement-breakpoint
CREATE INDEX `inbox_thread_status_last_message_idx` ON `inbox_thread` (`status`,`last_message_at`);--> statement-breakpoint
CREATE TABLE `answer_library` (
	`id` text PRIMARY KEY NOT NULL,
	`canonical_key` text NOT NULL,
	`question_text` text NOT NULL,
	`answer` text NOT NULL,
	`source` text NOT NULL,
	`times_used` integer DEFAULT 0 NOT NULL,
	`last_used_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "answer_library_source_ck" CHECK("answer_library"."source" IN ('profile', 'agent', 'owner'))
) STRICT;
--> statement-breakpoint
CREATE UNIQUE INDEX `answer_library_canonical_key_uq` ON `answer_library` (`canonical_key`);--> statement-breakpoint
CREATE TABLE `company` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`name_key` text NOT NULL,
	`domain` text,
	`website` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
) STRICT;
--> statement-breakpoint
CREATE UNIQUE INDEX `company_domain_uq` ON `company` (`domain`);--> statement-breakpoint
CREATE UNIQUE INDEX `company_name_key_uq` ON `company` (`name_key`);--> statement-breakpoint
CREATE TABLE `job_posting` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`url` text NOT NULL,
	`canonical_url` text NOT NULL,
	`ats` text NOT NULL,
	`ats_job_id` text,
	`title` text NOT NULL,
	`location` text,
	`remote` integer,
	`description` text,
	`salary_min` integer,
	`salary_max` integer,
	`salary_currency` text,
	`posted_at` integer,
	`fetched_at` integer,
	`form_hash` text,
	`closed_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`company_id`) REFERENCES `company`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "job_posting_ats_ck" CHECK("job_posting"."ats" IN ('greenhouse', 'lever', 'ashby', 'workable', 'smartrecruiters', 'bamboohr', 'custom'))
) STRICT;
--> statement-breakpoint
CREATE UNIQUE INDEX `job_posting_canonical_url_uq` ON `job_posting` (`canonical_url`);--> statement-breakpoint
CREATE UNIQUE INDEX `job_posting_ats_job_id_uq` ON `job_posting` (`ats`,`ats_job_id`);--> statement-breakpoint
CREATE INDEX `job_posting_company_id_idx` ON `job_posting` (`company_id`);--> statement-breakpoint
CREATE TABLE `posting_question` (
	`id` text PRIMARY KEY NOT NULL,
	`posting_id` text NOT NULL,
	`field_key` text NOT NULL,
	`position` integer NOT NULL,
	`label` text NOT NULL,
	`type` text NOT NULL,
	`required` integer DEFAULT false NOT NULL,
	`options` text,
	`canonical_key` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`posting_id`) REFERENCES `job_posting`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`canonical_key`) REFERENCES `answer_library`(`canonical_key`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "posting_question_type_ck" CHECK("posting_question"."type" IN ('text', 'textarea', 'select', 'multiselect', 'checkbox', 'radio', 'file', 'date', 'number'))
) STRICT;
--> statement-breakpoint
CREATE UNIQUE INDEX `posting_question_field_uq` ON `posting_question` (`posting_id`,`field_key`);--> statement-breakpoint
CREATE INDEX `posting_question_canonical_key_idx` ON `posting_question` (`canonical_key`);--> statement-breakpoint
CREATE TABLE `education` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_id` text NOT NULL,
	`institution` text NOT NULL,
	`degree` text,
	`field` text,
	`start_date` text,
	`end_date` text,
	`grade` text,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `profile`(`id`) ON UPDATE no action ON DELETE cascade
) STRICT;
--> statement-breakpoint
CREATE INDEX `education_profile_id_idx` ON `education` (`profile_id`);--> statement-breakpoint
CREATE TABLE `experience` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_id` text NOT NULL,
	`company` text NOT NULL,
	`title` text NOT NULL,
	`location` text,
	`start_date` text NOT NULL,
	`end_date` text,
	`description` text,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `profile`(`id`) ON UPDATE no action ON DELETE cascade
) STRICT;
--> statement-breakpoint
CREATE INDEX `experience_profile_id_idx` ON `experience` (`profile_id`);--> statement-breakpoint
CREATE TABLE `profile` (
	`id` text PRIMARY KEY NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text,
	`city` text,
	`country` text,
	`address` text,
	`linkedin_url` text,
	`github_url` text,
	`portfolio_url` text,
	`summary` text,
	`work_authorization` text,
	`requires_sponsorship` integer,
	`salary_min` integer,
	`salary_max` integer,
	`salary_currency` text,
	`notice_period_days` integer,
	`preferences` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
) STRICT;
--> statement-breakpoint
CREATE TABLE `approval` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`application_id` text NOT NULL,
	`cv_version_id` text,
	`form_hash` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`decided_by` text,
	`summary` text,
	`decided_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`run_id`) REFERENCES `run`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`application_id`) REFERENCES `application`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`cv_version_id`) REFERENCES `document_version`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "approval_status_ck" CHECK("approval"."status" IN ('pending', 'approved', 'rejected', 'expired')),
	CONSTRAINT "approval_decided_by_ck" CHECK("approval"."decided_by" IN ('owner', 'auto'))
) STRICT;
--> statement-breakpoint
CREATE INDEX `approval_run_id_idx` ON `approval` (`run_id`);--> statement-breakpoint
CREATE INDEX `approval_application_id_idx` ON `approval` (`application_id`);--> statement-breakpoint
CREATE INDEX `approval_cv_version_id_idx` ON `approval` (`cv_version_id`);--> statement-breakpoint
CREATE INDEX `approval_status_idx` ON `approval` (`status`);--> statement-breakpoint
CREATE TABLE `run` (
	`id` text PRIMARY KEY NOT NULL,
	`application_id` text NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`agent` text NOT NULL,
	`browser` text NOT NULL,
	`model` text,
	`session_id` text,
	`tab_id` text,
	`attempt` integer DEFAULT 1 NOT NULL,
	`form_hash` text,
	`result` text,
	`error` text,
	`input_tokens` integer,
	`output_tokens` integer,
	`cost_micros` integer,
	`started_at` integer,
	`finished_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`application_id`) REFERENCES `application`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "run_status_ck" CHECK("run"."status" IN ('queued', 'running', 'needs_you', 'owner_in_control', 'awaiting_approval', 'submitted', 'failed', 'cancelled')),
	CONSTRAINT "run_agent_ck" CHECK("run"."agent" IN ('claude', 'codex', 'agy')),
	CONSTRAINT "run_browser_ck" CHECK("run"."browser" IN ('neo', 'playwright', 'embedded'))
) STRICT;
--> statement-breakpoint
CREATE UNIQUE INDEX `run_one_active_per_application_uq` ON `run` (`application_id`) WHERE "run"."status" IN ('queued', 'running');--> statement-breakpoint
CREATE INDEX `run_application_created_idx` ON `run` (`application_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `run_status_idx` ON `run` (`status`);--> statement-breakpoint
CREATE TABLE `run_event` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`seq` integer NOT NULL,
	`type` text NOT NULL,
	`payload` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`run_id`) REFERENCES `run`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "run_event_type_ck" CHECK("run_event"."type" IN ('session', 'message', 'tool_call', 'tool_result', 'status', 'cost', 'error'))
) STRICT;
--> statement-breakpoint
CREATE UNIQUE INDEX `run_event_run_seq_uq` ON `run_event` (`run_id`,`seq`);--> statement-breakpoint
CREATE INDEX `run_event_run_created_idx` ON `run_event` (`run_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer NOT NULL
) STRICT;
