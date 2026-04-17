// src/scripts/autoRollbackCore.ts
import { createRequestFingerprint } from "@genesis/capsule";

// src/db.ts
import {
  apiKeyRecordSchema,
  capsuleEventSchema,
  cycleTelemetrySchema,
  meterEventSchema,
  promptVersionSchema,
  promotionCandidateSchema,
  quotaSnapshotSchema,
  rollbackAuditSchema
} from "@genesis/contracts";
function toCapsuleEvent(row) {
  return capsuleEventSchema.parse({
    id: row.id,
    eventType: row.event_type,
    source: row.source,
    route: row.route,
    statusCode: row.status_code,
    actorKeyId: row.actor_key_id,
    requestFingerprint: row.request_fingerprint,
    scrubbedPayload: JSON.parse(row.scrubbed_payload),
    createdAt: row.created_at
  });
}
function toPromptVersion(row) {
  return promptVersionSchema.parse({
    versionId: row.version_id,
    promptText: row.prompt_text,
    status: row.status,
    promotedAt: row.promoted_at,
    proposerHash: row.proposer_hash,
    model: row.model
  });
}
function toPromotionCandidate(row) {
  return promotionCandidateSchema.parse({
    candidateId: row.candidate_id,
    proposerHash: row.proposer_hash,
    promptText: row.prompt_text,
    model: row.model,
    sourceFeedback: JSON.parse(row.source_feedback),
    state: row.state,
    scorePrior: row.score_prior,
    createdAt: row.created_at,
    ttlCycles: row.ttl_cycles
  });
}
async function getActivePrompt(db) {
  const row = await db.prepare(
    `SELECT version_id, prompt_text, status, promoted_at, proposer_hash, model
       FROM prompt_ledger
       WHERE status = 'ACTIVE'
       LIMIT 1`
  ).first();
  return row ? toPromptVersion(row) : null;
}
async function listPromptVersions(db) {
  const { results } = await db.prepare(
    `SELECT version_id, prompt_text, status, promoted_at, proposer_hash, model
       FROM prompt_ledger
       ORDER BY promoted_at DESC`
  ).all();
  return results.map(toPromptVersion);
}
async function listPromotions(db) {
  const { results } = await db.prepare(
    `SELECT candidate_id, proposer_hash, prompt_text, model, source_feedback,
              state, score_prior, created_at, ttl_cycles
       FROM promotion_queue
       ORDER BY created_at DESC`
  ).all();
  return results.map(toPromotionCandidate);
}
async function listFeedbackForCycle(db, cycleId) {
  const { results } = await db.prepare(
    `SELECT id, cycle_id, section_id, grader, score, reasoning
       FROM grader_feedback
       WHERE cycle_id = ?
       ORDER BY id ASC`
  ).bind(cycleId).all();
  return results.map((row) => ({
    id: row.id,
    cycleId: row.cycle_id,
    sectionId: row.section_id,
    grader: row.grader,
    score: row.score,
    reasoning: row.reasoning ?? ""
  }));
}
async function listCycles(db) {
  const { results } = await db.prepare(
    `SELECT cycle_id, section_id, status, total_tokens, compute_ms, executed_at, summary, average_score
              , residual_drift
       FROM cycle_telemetry
       ORDER BY executed_at DESC`
  ).all();
  return Promise.all(
    results.map(
      async (row) => cycleTelemetrySchema.parse({
        cycleId: row.cycle_id,
        sectionId: row.section_id,
        status: row.status,
        totalTokens: row.total_tokens,
        computeMs: row.compute_ms,
        executedAt: row.executed_at,
        summary: row.summary,
        averageScore: row.average_score,
        residualDrift: row.residual_drift ?? 0,
        graderFeedback: await listFeedbackForCycle(db, row.cycle_id)
      })
    )
  );
}
async function getCycle(db, cycleId) {
  const row = await db.prepare(
    `SELECT cycle_id, section_id, status, total_tokens, compute_ms, executed_at, summary, average_score
              , residual_drift
       FROM cycle_telemetry
       WHERE cycle_id = ?
       LIMIT 1`
  ).bind(cycleId).first();
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
    graderFeedback: await listFeedbackForCycle(db, row.cycle_id)
  });
}
async function getQuotaSnapshot(db) {
  const quotaRow = await db.prepare(`SELECT daily_token_limit FROM quota_config WHERE id = 1 LIMIT 1`).first();
  const usageRow = await db.prepare(
    `SELECT COALESCE(SUM(total_tokens), 0) AS tokens_used
       FROM cycle_telemetry
       WHERE executed_at >= ?`
  ).bind(Date.now() - 864e5).first();
  const dailyTokenLimit = quotaRow?.daily_token_limit ?? 1;
  const tokensUsedToday = usageRow?.tokens_used ?? 0;
  return quotaSnapshotSchema.parse({
    dailyTokenLimit,
    tokensUsedToday,
    burnRatio: tokensUsedToday / dailyTokenLimit,
    remainingTokens: Math.max(dailyTokenLimit - tokensUsedToday, 0)
  });
}
async function listRollbackAudit(db) {
  const { results } = await db.prepare(
    `SELECT id, audit_blob, signature, created_at
       FROM rollback_audit
       ORDER BY created_at DESC`
  ).all();
  return results.map(
    (row) => rollbackAuditSchema.parse({
      id: row.id,
      auditBlob: JSON.parse(row.audit_blob),
      signature: row.signature,
      createdAt: row.created_at
    })
  );
}
async function listRecentFailures(db, cutoff) {
  const { results } = await db.prepare(
    `SELECT cycle_id, total_tokens, compute_ms
       FROM cycle_telemetry
       WHERE executed_at >= ? AND status = 'FAILED'
       ORDER BY executed_at DESC
       LIMIT 5`
  ).bind(cutoff).all();
  return results;
}
async function listFeedbackForCycles(db, cycleIds) {
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
  const { results } = await statement.bind(...cycleIds).all();
  return results.map((row) => ({
    sectionId: row.section_id,
    grader: row.grader,
    score: row.score,
    reasoning: row.reasoning ?? ""
  }));
}
async function insertPromotionCandidate(db, candidate) {
  await db.prepare(
    `INSERT INTO promotion_queue
       (candidate_id, proposer_hash, prompt_text, model, source_feedback, state, score_prior, created_at, ttl_cycles)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    candidate.candidateId,
    candidate.proposerHash,
    candidate.promptText,
    candidate.model,
    JSON.stringify(candidate.sourceFeedback),
    candidate.state,
    candidate.scorePrior,
    candidate.createdAt,
    candidate.ttlCycles
  ).run();
}
async function revertToVersion(db, versionId) {
  const target = await db.prepare(`SELECT version_id FROM prompt_ledger WHERE version_id = ? LIMIT 1`).bind(versionId).first();
  if (!target) {
    throw new Error(`E_VERSION_NOT_FOUND:${versionId}`);
  }
  await db.batch([
    db.prepare(`UPDATE prompt_ledger SET status = 'ROLLED_BACK' WHERE status = 'ACTIVE'`),
    db.prepare(`UPDATE prompt_ledger SET status = 'ACTIVE' WHERE version_id = ?`).bind(versionId)
  ]);
}
async function latestRollbackTarget(db) {
  const row = await db.prepare(
    `SELECT version_id
       FROM prompt_ledger
       WHERE status IN ('SUPERSEDED', 'ROLLED_BACK')
       ORDER BY promoted_at DESC
       LIMIT 1`
  ).first();
  return row?.version_id ?? null;
}
async function writeRollbackAudit(db, auditBlob, signature, createdAt) {
  await db.prepare(
    `INSERT INTO rollback_audit (audit_blob, signature, created_at)
       VALUES (?, ?, ?)`
  ).bind(JSON.stringify(auditBlob), signature, createdAt).run();
}
async function appendCapsuleEventRow(db, event) {
  const parsed = capsuleEventSchema.parse(event);
  await db.prepare(
    `INSERT INTO capsule_events
         (event_type, source, route, status_code, actor_key_id, request_fingerprint, scrubbed_payload, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    parsed.eventType,
    parsed.source,
    parsed.route ?? null,
    parsed.statusCode ?? null,
    parsed.actorKeyId ?? null,
    parsed.requestFingerprint,
    JSON.stringify(parsed.scrubbedPayload),
    parsed.createdAt
  ).run();
  const inserted = await db.prepare(
    `SELECT id, event_type, source, route, status_code, actor_key_id, request_fingerprint, scrubbed_payload, created_at
       FROM capsule_events
       WHERE request_fingerprint = ?
       ORDER BY id DESC
       LIMIT 1`
  ).bind(parsed.requestFingerprint).first();
  if (!inserted) {
    throw new Error(`E_CAPSULE_EVENT_NOT_FOUND:${parsed.requestFingerprint}`);
  }
  return toCapsuleEvent(inserted);
}
async function consumeRateLimitSlot(db, input) {
  const windowStart = input.now - input.now % input.windowMs;
  const existing = await db.prepare(
    `SELECT request_count
       FROM rate_limit_rollups
       WHERE token_hash = ? AND route = ? AND window_start = ?
       LIMIT 1`
  ).bind(input.tokenHash, input.route, windowStart).first();
  const currentCount = existing?.request_count ?? 0;
  if (currentCount >= input.limit) {
    return {
      allowed: false,
      remaining: 0,
      windowStart
    };
  }
  if (existing) {
    await db.prepare(
      `UPDATE rate_limit_rollups
         SET request_count = ?, updated_at = ?
         WHERE token_hash = ? AND route = ? AND window_start = ?`
    ).bind(currentCount + 1, input.now, input.tokenHash, input.route, windowStart).run();
  } else {
    await db.prepare(
      `INSERT INTO rate_limit_rollups (token_hash, route, window_start, request_count, updated_at)
         VALUES (?, ?, ?, 1, ?)`
    ).bind(input.tokenHash, input.route, windowStart, input.now).run();
  }
  return {
    allowed: true,
    remaining: input.limit - (currentCount + 1),
    windowStart
  };
}
async function recordMeterEvent(db, input) {
  const existing = await db.prepare(`SELECT idempotency_key FROM meter_events WHERE idempotency_key = ? LIMIT 1`).bind(input.idempotencyKey).first();
  const duplicate = Boolean(existing);
  if (!duplicate) {
    await db.prepare(
      `INSERT INTO meter_events
           (idempotency_key, meter_event_name, token_hash, route, units, stripe_status, source_request_id, created_at)
         VALUES (?, ?, ?, ?, ?, 'queued', ?, ?)`
    ).bind(
      input.idempotencyKey,
      input.meterEventName,
      input.tokenHash,
      input.route,
      input.units,
      input.idempotencyKey,
      input.createdAt
    ).run();
  }
  return meterEventSchema.parse({
    ...input,
    duplicate
  });
}

// src/utils/crypto.ts
var encoder = new TextEncoder();
async function sha256Hex(input) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(input));
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join("");
}
function decodePkcs8(signingKeyB64) {
  if (typeof Buffer !== "undefined") {
    return Uint8Array.from(Buffer.from(signingKeyB64, "base64"));
  }
  const raw = atob(signingKeyB64);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}
async function signPayload(payload, signingKeyB64) {
  const raw = decodePkcs8(signingKeyB64);
  const keyData = new Uint8Array(Array.from(raw));
  const key = await crypto.subtle.importKey("pkcs8", keyData, { name: "Ed25519" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("Ed25519", key, encoder.encode(payload));
  return Array.from(new Uint8Array(signature), (value) => value.toString(16).padStart(2, "0")).join("");
}
async function hdDeriveCandidateId(serial, signingKeyB64) {
  const path = `m/44'/256'/0'/0/${serial}`;
  const hash = await sha256Hex(`${signingKeyB64}|${path}`);
  return `c-${hash.slice(0, 24)}`;
}

// src/scripts/autoRollbackCore.ts
async function autoRollback(env, input) {
  const targetVersion = await latestRollbackTarget(env.genesis_seismic_log);
  if (!targetVersion) {
    throw new Error("E_NO_ROLLBACK_TARGET");
  }
  await revertToVersion(env.genesis_seismic_log, targetVersion);
  const audit = {
    reason: input.reason,
    from: input.fromVersion,
    to: targetVersion,
    ts: Date.now()
  };
  const signature = await signPayload(JSON.stringify(audit), env.CODEOWNER_SIGNING_KEY ?? "");
  await writeRollbackAudit(env.genesis_seismic_log, audit, signature, audit.ts);
  await appendCapsuleEventRow(env.genesis_seismic_log, {
    eventType: "rollback.completed",
    source: "watchdog",
    route: "/rollback",
    statusCode: 200,
    actorKeyId: null,
    requestFingerprint: await createRequestFingerprint({
      route: "/rollback",
      requestId: `${input.fromVersion}:${audit.ts}`
    }),
    scrubbedPayload: audit,
    createdAt: audit.ts
  });
  if (env.SLACK_WEBHOOK_URL) {
    await (input.fetchImpl ?? fetch)(env.SLACK_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `P1 Auto-Rollback Executed: ${JSON.stringify(audit)}`
      })
    });
  }
  return audit;
}

export {
  getActivePrompt,
  listPromptVersions,
  listPromotions,
  listCycles,
  getCycle,
  getQuotaSnapshot,
  listRollbackAudit,
  listRecentFailures,
  listFeedbackForCycles,
  insertPromotionCandidate,
  appendCapsuleEventRow,
  consumeRateLimitSlot,
  recordMeterEvent,
  sha256Hex,
  hdDeriveCandidateId,
  autoRollback
};
