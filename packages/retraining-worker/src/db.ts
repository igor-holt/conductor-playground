import {
  apiKeyRecordSchema,
  capsuleEventSchema,
  cycleTelemetrySchema,
  meterEventSchema,
  promptVersionSchema,
  promotionCandidateSchema,
  quotaSnapshotSchema,
  rollbackAuditSchema,
  type ApiKeyRecord,
  type CapsuleEvent,
  type CycleTelemetry,
  type MeterEvent,
  type PromptVersion,
  type PromotionCandidate,
  type QuotaSnapshot,
  type RollbackAudit,
} from "@genesis/contracts";

import type { D1DatabaseLike } from "./types.js";

interface PromptRow {
  version_id: string;
  prompt_text: string;
  status: PromptVersion["status"];
  promoted_at: number;
  proposer_hash: string;
  model: string;
}

interface PromotionRow {
  candidate_id: string;
  proposer_hash: string;
  prompt_text: string;
  model: string;
  source_feedback: string;
  state: PromotionCandidate["state"];
  score_prior: number;
  created_at: number;
  ttl_cycles: number;
}

interface CycleRow {
  cycle_id: string;
  section_id: string;
  status: CycleTelemetry["status"];
  total_tokens: number;
  compute_ms: number;
  executed_at: number;
  summary: string;
  average_score: number;
  residual_drift: number;
}

interface FeedbackRow {
  id: number;
  cycle_id: string;
  section_id: string;
  grader: string;
  score: number;
  reasoning: string | null;
}

interface RollbackAuditRow {
  id: number;
  audit_blob: string;
  signature: string;
  created_at: number;
}

interface CapsuleEventRow {
  id: number;
  event_type: CapsuleEvent["eventType"];
  source: CapsuleEvent["source"];
  route: string | null;
  status_code: number | null;
  actor_key_id: string | null;
  request_fingerprint: string;
  scrubbed_payload: string;
  created_at: number;
}

function toCapsuleEvent(row: CapsuleEventRow): CapsuleEvent {
  return capsuleEventSchema.parse({
    id: row.id,
    eventType: row.event_type,
    source: row.source,
    route: row.route,
    statusCode: row.status_code,
    actorKeyId: row.actor_key_id,
    requestFingerprint: row.request_fingerprint,
    scrubbedPayload: JSON.parse(row.scrubbed_payload) as Record<string, unknown>,
    createdAt: row.created_at,
  });
}

function toPromptVersion(row: PromptRow): PromptVersion {
  return promptVersionSchema.parse({
    versionId: row.version_id,
    promptText: row.prompt_text,
    status: row.status,
    promotedAt: row.promoted_at,
    proposerHash: row.proposer_hash,
    model: row.model,
  });
}

function toPromotionCandidate(row: PromotionRow): PromotionCandidate {
  return promotionCandidateSchema.parse({
    candidateId: row.candidate_id,
    proposerHash: row.proposer_hash,
    promptText: row.prompt_text,
    model: row.model,
    sourceFeedback: JSON.parse(row.source_feedback) as string[],
    state: row.state,
    scorePrior: row.score_prior,
    createdAt: row.created_at,
    ttlCycles: row.ttl_cycles,
  });
}

export async function getActivePrompt(db: D1DatabaseLike): Promise<PromptVersion | null> {
  const row = await db
    .prepare(
      `SELECT version_id, prompt_text, status, promoted_at, proposer_hash, model
       FROM prompt_ledger
       WHERE status = 'ACTIVE'
       LIMIT 1`
    )
    .first<PromptRow>();
  return row ? toPromptVersion(row) : null;
}

export async function listPromptVersions(db: D1DatabaseLike): Promise<PromptVersion[]> {
  const { results } = await db
    .prepare(
      `SELECT version_id, prompt_text, status, promoted_at, proposer_hash, model
       FROM prompt_ledger
       ORDER BY promoted_at DESC`
    )
    .all<PromptRow>();
  return results.map(toPromptVersion);
}

export async function listPromotions(db: D1DatabaseLike): Promise<PromotionCandidate[]> {
  const { results } = await db
    .prepare(
      `SELECT candidate_id, proposer_hash, prompt_text, model, source_feedback,
              state, score_prior, created_at, ttl_cycles
       FROM promotion_queue
       ORDER BY created_at DESC`
    )
    .all<PromotionRow>();
  return results.map(toPromotionCandidate);
}

async function listFeedbackForCycle(db: D1DatabaseLike, cycleId: string) {
  const { results } = await db
    .prepare(
      `SELECT id, cycle_id, section_id, grader, score, reasoning
       FROM grader_feedback
       WHERE cycle_id = ?
       ORDER BY id ASC`
    )
    .bind(cycleId)
    .all<FeedbackRow>();

  return results.map((row) => ({
    id: row.id,
    cycleId: row.cycle_id,
    sectionId: row.section_id,
    grader: row.grader,
    score: row.score,
    reasoning: row.reasoning ?? "",
  }));
}

export async function listCycles(db: D1DatabaseLike): Promise<CycleTelemetry[]> {
  const { results } = await db
    .prepare(
      `SELECT cycle_id, section_id, status, total_tokens, compute_ms, executed_at, summary, average_score
              , residual_drift
       FROM cycle_telemetry
       ORDER BY executed_at DESC`
    )
    .all<CycleRow>();

  return Promise.all(
    results.map(async (row) =>
      cycleTelemetrySchema.parse({
        cycleId: row.cycle_id,
        sectionId: row.section_id,
        status: row.status,
        totalTokens: row.total_tokens,
        computeMs: row.compute_ms,
        executedAt: row.executed_at,
        summary: row.summary,
        averageScore: row.average_score,
        residualDrift: row.residual_drift ?? 0,
        graderFeedback: await listFeedbackForCycle(db, row.cycle_id),
      })
    )
  );
}

export async function getCycle(db: D1DatabaseLike, cycleId: string): Promise<CycleTelemetry | null> {
  const row = await db
    .prepare(
      `SELECT cycle_id, section_id, status, total_tokens, compute_ms, executed_at, summary, average_score
              , residual_drift
       FROM cycle_telemetry
       WHERE cycle_id = ?
       LIMIT 1`
    )
    .bind(cycleId)
    .first<CycleRow>();

  if (!row) {
    return null;
  }

  return cycleTelemetrySchema.parse({
    cycleId: row.cycle_id,
    sectionId: row.section_id,
    status: row.status,
    totalTokens: row.total_tokens,
    computeMs: row.compute_ms,
    executedAt: row.executed_at,
    summary: row.summary,
    averageScore: row.average_score,
    residualDrift: row.residual_drift ?? 0,
    graderFeedback: await listFeedbackForCycle(db, row.cycle_id),
  });
}

export async function getQuotaSnapshot(db: D1DatabaseLike): Promise<QuotaSnapshot> {
  const quotaRow = await db
    .prepare(`SELECT daily_token_limit FROM quota_config WHERE id = 1 LIMIT 1`)
    .first<{ daily_token_limit: number }>();

  const usageRow = await db
    .prepare(
      `SELECT COALESCE(SUM(total_tokens), 0) AS tokens_used
       FROM cycle_telemetry
       WHERE executed_at >= ?`
    )
    .bind(Date.now() - 86_400_000)
    .first<{ tokens_used: number }>();

  const dailyTokenLimit = quotaRow?.daily_token_limit ?? 1;
  const tokensUsedToday = usageRow?.tokens_used ?? 0;
  return quotaSnapshotSchema.parse({
    dailyTokenLimit,
    tokensUsedToday,
    burnRatio: tokensUsedToday / dailyTokenLimit,
    remainingTokens: Math.max(dailyTokenLimit - tokensUsedToday, 0),
  });
}

export async function listRollbackAudit(db: D1DatabaseLike): Promise<RollbackAudit[]> {
  const { results } = await db
    .prepare(
      `SELECT id, audit_blob, signature, created_at
       FROM rollback_audit
       ORDER BY created_at DESC`
    )
    .all<RollbackAuditRow>();
  return results.map((row) =>
    rollbackAuditSchema.parse({
      id: row.id,
      auditBlob: JSON.parse(row.audit_blob) as RollbackAudit["auditBlob"],
      signature: row.signature,
      createdAt: row.created_at,
    })
  );
}

export async function listRecentFailures(db: D1DatabaseLike, cutoff: number) {
  const { results } = await db
    .prepare(
      `SELECT cycle_id, total_tokens, compute_ms
       FROM cycle_telemetry
       WHERE executed_at >= ? AND status = 'FAILED'
       ORDER BY executed_at DESC
       LIMIT 5`
    )
    .bind(cutoff)
    .all<{ cycle_id: string; total_tokens: number; compute_ms: number }>();
  return results;
}

export async function listFeedbackForCycles(db: D1DatabaseLike, cycleIds: string[]) {
  if (cycleIds.length === 0) {
    return [];
  }

  const placeholders = cycleIds.map(() => "?").join(",");
  const statement = db.prepare(
    `SELECT section_id, grader, score, reasoning
     FROM grader_feedback
     WHERE cycle_id IN (${placeholders})
     ORDER BY score ASC`
  );

  const { results } = await statement.bind(...cycleIds).all<{
    section_id: string;
    grader: string;
    score: number;
    reasoning: string | null;
  }>();

  return results.map((row) => ({
    sectionId: row.section_id,
    grader: row.grader,
    score: row.score,
    reasoning: row.reasoning ?? "",
  }));
}

export async function insertPromotionCandidate(
  db: D1DatabaseLike,
  candidate: PromotionCandidate
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO promotion_queue
       (candidate_id, proposer_hash, prompt_text, model, source_feedback, state, score_prior, created_at, ttl_cycles)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      candidate.candidateId,
      candidate.proposerHash,
      candidate.promptText,
      candidate.model,
      JSON.stringify(candidate.sourceFeedback),
      candidate.state,
      candidate.scorePrior,
      candidate.createdAt,
      candidate.ttlCycles
    )
    .run();
}

export async function revertToVersion(db: D1DatabaseLike, versionId: string): Promise<void> {
  const target = await db
    .prepare(`SELECT version_id FROM prompt_ledger WHERE version_id = ? LIMIT 1`)
    .bind(versionId)
    .first<{ version_id: string }>();
  if (!target) {
    throw new Error(`E_VERSION_NOT_FOUND:${versionId}`);
  }

  await db.batch([
    db.prepare(`UPDATE prompt_ledger SET status = 'ROLLED_BACK' WHERE status = 'ACTIVE'`),
    db.prepare(`UPDATE prompt_ledger SET status = 'ACTIVE' WHERE version_id = ?`).bind(versionId),
  ]);
}

export async function latestRollbackTarget(db: D1DatabaseLike): Promise<string | null> {
  const row = await db
    .prepare(
      `SELECT version_id
       FROM prompt_ledger
       WHERE status IN ('SUPERSEDED', 'ROLLED_BACK')
       ORDER BY promoted_at DESC
       LIMIT 1`
    )
    .first<{ version_id: string }>();
  return row?.version_id ?? null;
}

export async function writeRollbackAudit(
  db: D1DatabaseLike,
  auditBlob: Record<string, unknown>,
  signature: string,
  createdAt: number
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO rollback_audit (audit_blob, signature, created_at)
       VALUES (?, ?, ?)`
    )
    .bind(JSON.stringify(auditBlob), signature, createdAt)
    .run();
}

export async function upsertApiKeyMirror(db: D1DatabaseLike, record: ApiKeyRecord): Promise<void> {
  const parsed = apiKeyRecordSchema.parse(record);
  await db
    .prepare(
      `INSERT INTO api_keys
         (key_id, token_hash, label, scopes, rate_limit_per_minute, meter_event_name, active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(key_id) DO UPDATE SET
         token_hash = excluded.token_hash,
         label = excluded.label,
         scopes = excluded.scopes,
         rate_limit_per_minute = excluded.rate_limit_per_minute,
         meter_event_name = excluded.meter_event_name,
         active = excluded.active,
         created_at = excluded.created_at`
    )
    .bind(
      parsed.keyId,
      parsed.tokenHash,
      parsed.label,
      JSON.stringify(parsed.scopes),
      parsed.rateLimitPerMinute,
      parsed.meterEventName,
      parsed.active ? 1 : 0,
      parsed.createdAt
    )
    .run();
}

export async function appendCapsuleEventRow(
  db: D1DatabaseLike,
  event: Omit<CapsuleEvent, "id"> & { id?: number }
): Promise<CapsuleEvent> {
  const parsed = capsuleEventSchema.parse(event);
  await db
    .prepare(
      `INSERT INTO capsule_events
         (event_type, source, route, status_code, actor_key_id, request_fingerprint, scrubbed_payload, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      parsed.eventType,
      parsed.source,
      parsed.route ?? null,
      parsed.statusCode ?? null,
      parsed.actorKeyId ?? null,
      parsed.requestFingerprint,
      JSON.stringify(parsed.scrubbedPayload),
      parsed.createdAt
    )
    .run();

  const inserted = await db
    .prepare(
      `SELECT id, event_type, source, route, status_code, actor_key_id, request_fingerprint, scrubbed_payload, created_at
       FROM capsule_events
       WHERE request_fingerprint = ?
       ORDER BY id DESC
       LIMIT 1`
    )
    .bind(parsed.requestFingerprint)
    .first<CapsuleEventRow>();

  if (!inserted) {
    throw new Error(`E_CAPSULE_EVENT_NOT_FOUND:${parsed.requestFingerprint}`);
  }

  return toCapsuleEvent(inserted);
}

export async function listCapsuleEvents(db: D1DatabaseLike): Promise<CapsuleEvent[]> {
  const { results } = await db
    .prepare(
      `SELECT id, event_type, source, route, status_code, actor_key_id, request_fingerprint, scrubbed_payload, created_at
       FROM capsule_events
       ORDER BY created_at DESC`
    )
    .all<CapsuleEventRow>();
  return results.map(toCapsuleEvent);
}

export async function consumeRateLimitSlot(
  db: D1DatabaseLike,
  input: { tokenHash: string; route: string; limit: number; windowMs: number; now: number }
): Promise<{ allowed: boolean; remaining: number; windowStart: number }> {
  const windowStart = input.now - (input.now % input.windowMs);
  const existing = await db
    .prepare(
      `SELECT request_count
       FROM rate_limit_rollups
       WHERE token_hash = ? AND route = ? AND window_start = ?
       LIMIT 1`
    )
    .bind(input.tokenHash, input.route, windowStart)
    .first<{ request_count: number }>();

  const currentCount = existing?.request_count ?? 0;
  if (currentCount >= input.limit) {
    return {
      allowed: false,
      remaining: 0,
      windowStart,
    };
  }

  if (existing) {
    await db
      .prepare(
        `UPDATE rate_limit_rollups
         SET request_count = ?, updated_at = ?
         WHERE token_hash = ? AND route = ? AND window_start = ?`
      )
      .bind(currentCount + 1, input.now, input.tokenHash, input.route, windowStart)
      .run();
  } else {
    await db
      .prepare(
        `INSERT INTO rate_limit_rollups (token_hash, route, window_start, request_count, updated_at)
         VALUES (?, ?, ?, 1, ?)`
      )
      .bind(input.tokenHash, input.route, windowStart, input.now)
      .run();
  }

  return {
    allowed: true,
    remaining: input.limit - (currentCount + 1),
    windowStart,
  };
}

export async function recordMeterEvent(
  db: D1DatabaseLike,
  input: Omit<MeterEvent, "duplicate">
): Promise<MeterEvent> {
  const existing = await db
    .prepare(`SELECT idempotency_key FROM meter_events WHERE idempotency_key = ? LIMIT 1`)
    .bind(input.idempotencyKey)
    .first<{ idempotency_key: string }>();

  const duplicate = Boolean(existing);
  if (!duplicate) {
    await db
      .prepare(
        `INSERT INTO meter_events
           (idempotency_key, meter_event_name, token_hash, route, units, stripe_status, source_request_id, created_at)
         VALUES (?, ?, ?, ?, ?, 'queued', ?, ?)`
      )
      .bind(
        input.idempotencyKey,
        input.meterEventName,
        input.tokenHash,
        input.route,
        input.units,
        input.idempotencyKey,
        input.createdAt
      )
      .run();
  }

  return meterEventSchema.parse({
    ...input,
    duplicate,
  });
}
