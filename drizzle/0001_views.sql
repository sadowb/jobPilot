-- Read models for the screens. Typed handles live next to the entities (`.existing()` views); keep both in sync.
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
--> statement-breakpoint
CREATE VIEW v_inbox AS
SELECT
  t.id AS thread_id,
  t.kind AS kind,
  t.status AS status,
  t.subject AS subject,
  t.last_message_at AS last_message_at,
  (SELECT COUNT(*) FROM inbox_message m WHERE m.thread_id = t.id) AS message_count,
  (SELECT m.body FROM inbox_message m WHERE m.thread_id = t.id ORDER BY m.created_at DESC, m.id DESC LIMIT 1) AS last_message_body,
  t.application_id AS application_id,
  p.title AS title,
  c.name AS company_name
FROM inbox_thread t
LEFT JOIN application a ON a.id = t.application_id
LEFT JOIN job_posting p ON p.id = a.posting_id
LEFT JOIN company c ON c.id = p.company_id
WHERE t.status <> 'resolved'
ORDER BY t.last_message_at DESC;
--> statement-breakpoint
CREATE VIEW v_analytics_funnel AS
SELECT
  COUNT(*) AS total,
  COALESCE(SUM(a.applied_at IS NOT NULL), 0) AS applied,
  COALESCE(SUM(EXISTS (
    SELECT 1 FROM inbox_thread t JOIN inbox_message m ON m.thread_id = t.id
    WHERE t.application_id = a.id AND m.sender = 'employer'
  )), 0) AS replied,
  COALESCE(SUM(a.status = 'interviewing'), 0) AS interviewing,
  COALESCE(SUM(a.status = 'offer'), 0) AS offers,
  COALESCE(SUM(a.status = 'rejected'), 0) AS rejected,
  COALESCE((SELECT SUM(r.cost_micros) FROM run r JOIN application a2 ON a2.id = r.application_id WHERE a2.deleted_at IS NULL), 0) AS spend_micros
FROM application a
WHERE a.deleted_at IS NULL;
