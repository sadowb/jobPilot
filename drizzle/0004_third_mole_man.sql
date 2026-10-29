ALTER TABLE `job_posting` ADD `verified` integer DEFAULT true NOT NULL;
--> statement-breakpoint
DROP VIEW v_up_next;
--> statement-breakpoint
DROP VIEW v_application_list;
--> statement-breakpoint
CREATE VIEW v_application_list AS
SELECT
  a.id AS id,
  a.status AS status,
  a.queue_rank AS queue_rank,
  a.applied_at AS applied_at,
  a.last_activity_at AS last_activity_at,
  a.created_at AS created_at,
  a.cv_version_id AS cv_version_id,
  p.id AS posting_id,
  p.title AS title,
  p.location AS location,
  p.url AS url,
  p.verified AS verified,
  c.id AS company_id,
  c.name AS company_name,
  r.id AS latest_run_id,
  r.status AS latest_run_status,
  r.agent AS latest_run_agent
FROM application a
JOIN job_posting p ON p.id = a.posting_id
JOIN company c ON c.id = p.company_id
LEFT JOIN run r ON r.id = (
  SELECT r2.id FROM run r2 WHERE r2.application_id = a.id ORDER BY r2.created_at DESC, r2.id DESC LIMIT 1
)
WHERE a.deleted_at IS NULL;
--> statement-breakpoint
CREATE VIEW v_up_next AS
SELECT * FROM v_application_list WHERE status = 'queued' ORDER BY queue_rank ASC, created_at ASC;
