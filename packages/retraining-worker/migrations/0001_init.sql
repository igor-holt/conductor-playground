CREATE TABLE IF NOT EXISTS prompt_ledger (
  version_id TEXT PRIMARY KEY,
  prompt_text TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'SUPERSEDED', 'ROLLED_BACK')),
  promoted_at INTEGER NOT NULL,
  proposer_hash TEXT NOT NULL,
  model TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS promotion_queue (
  candidate_id TEXT PRIMARY KEY,
  proposer_hash TEXT NOT NULL,
  prompt_text TEXT NOT NULL,
  model TEXT NOT NULL,
  source_feedback TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('PENDING', 'EVALUATING', 'PROMOTED', 'REJECTED')),
  score_prior REAL NOT NULL,
  created_at INTEGER NOT NULL,
  ttl_cycles INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS cycle_telemetry (
  cycle_id TEXT PRIMARY KEY,
  section_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PASSED', 'FAILED', 'ROLLED_BACK')),
  total_tokens INTEGER NOT NULL,
  compute_ms INTEGER NOT NULL,
  executed_at INTEGER NOT NULL,
  summary TEXT NOT NULL,
  average_score REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS grader_feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cycle_id TEXT NOT NULL,
  section_id TEXT NOT NULL,
  grader TEXT NOT NULL,
  score REAL NOT NULL,
  reasoning TEXT,
  FOREIGN KEY (cycle_id) REFERENCES cycle_telemetry(cycle_id)
);

CREATE INDEX IF NOT EXISTS idx_grader_feedback_cycle ON grader_feedback(cycle_id);

CREATE TABLE IF NOT EXISTS rollback_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  audit_blob TEXT NOT NULL,
  signature TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS quota_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  daily_token_limit INTEGER NOT NULL
);
