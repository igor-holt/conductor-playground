ALTER TABLE cycle_telemetry
ADD COLUMN residual_drift REAL NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS api_keys (
  key_id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  scopes TEXT NOT NULL,
  rate_limit_per_minute INTEGER NOT NULL,
  meter_event_name TEXT NOT NULL,
  active INTEGER NOT NULL CHECK (active IN (0, 1)),
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS capsule_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL CHECK (event_type IN ('billable.response', 'deploy.completed', 'rollback.completed')),
  source TEXT NOT NULL CHECK (source IN ('worker', 'ci', 'watchdog')),
  route TEXT,
  status_code INTEGER,
  actor_key_id TEXT,
  request_fingerprint TEXT NOT NULL,
  scrubbed_payload TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_capsule_events_created_at ON capsule_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_capsule_events_fingerprint ON capsule_events(request_fingerprint);

CREATE TRIGGER IF NOT EXISTS capsule_events_no_update
BEFORE UPDATE ON capsule_events
BEGIN
  SELECT RAISE(ABORT, 'capsule_events append-only');
END;

CREATE TRIGGER IF NOT EXISTS capsule_events_no_delete
BEFORE DELETE ON capsule_events
BEGIN
  SELECT RAISE(ABORT, 'capsule_events append-only');
END;

CREATE TABLE IF NOT EXISTS rate_limit_rollups (
  token_hash TEXT NOT NULL,
  route TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  request_count INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (token_hash, route, window_start)
);

CREATE TABLE IF NOT EXISTS meter_events (
  idempotency_key TEXT PRIMARY KEY,
  meter_event_name TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  route TEXT NOT NULL,
  units INTEGER NOT NULL,
  stripe_status TEXT NOT NULL,
  source_request_id TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_meter_events_created_at ON meter_events(created_at DESC);
