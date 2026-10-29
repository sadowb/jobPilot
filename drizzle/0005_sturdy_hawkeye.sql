-- ADD COLUMN, not drizzle-kit's table rebuild: job_posting is referenced by views and cascading foreign keys.
ALTER TABLE `job_posting` ADD `source` text DEFAULT 'fetch' NOT NULL CONSTRAINT "job_posting_source_ck" CHECK("source" IN ('fetch', 'agent'));
