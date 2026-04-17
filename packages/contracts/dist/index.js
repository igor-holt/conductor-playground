// src/index.ts
import { z } from "zod";
var promptStatusSchema = z.enum([
  "ACTIVE",
  "SUPERSEDED",
  "ROLLED_BACK"
]);
var promotionStateSchema = z.enum([
  "PENDING",
  "EVALUATING",
  "PROMOTED",
  "REJECTED"
]);
var cycleStatusSchema = z.enum([
  "PASSED",
  "FAILED",
  "ROLLED_BACK"
]);
var promptVersionSchema = z.object({
  versionId: z.string(),
  status: promptStatusSchema,
  promptText: z.string(),
  promotedAt: z.number().int(),
  proposerHash: z.string(),
  model: z.string()
});
var promotionCandidateSchema = z.object({
  candidateId: z.string(),
  proposerHash: z.string(),
  promptText: z.string(),
  model: z.string(),
  sourceFeedback: z.array(z.string()),
  state: promotionStateSchema,
  scorePrior: z.number(),
  createdAt: z.number().int(),
  ttlCycles: z.number().int()
});
var graderFeedbackSchema = z.object({
  id: z.number().int(),
  cycleId: z.string(),
  sectionId: z.string(),
  grader: z.string(),
  score: z.number(),
  reasoning: z.string()
});
var cycleTelemetrySchema = z.object({
  cycleId: z.string(),
  status: cycleStatusSchema,
  executedAt: z.number().int(),
  totalTokens: z.number().int(),
  computeMs: z.number().int(),
  sectionId: z.string(),
  summary: z.string(),
  averageScore: z.number(),
  residualDrift: z.number().default(0),
  graderFeedback: z.array(graderFeedbackSchema)
});
var rollbackAuditSchema = z.object({
  id: z.number().int(),
  auditBlob: z.object({
    reason: z.string(),
    from: z.string(),
    to: z.string(),
    ts: z.number().int()
  }),
  signature: z.string(),
  createdAt: z.number().int()
});
var quotaSnapshotSchema = z.object({
  dailyTokenLimit: z.number().int(),
  tokensUsedToday: z.number().int(),
  burnRatio: z.number(),
  remainingTokens: z.number().int()
});
var apiKeyRecordSchema = z.object({
  keyId: z.string(),
  label: z.string(),
  tokenHash: z.string(),
  scopes: z.array(z.string()),
  rateLimitPerMinute: z.number().int().positive(),
  meterEventName: z.string(),
  active: z.boolean(),
  createdAt: z.number().int()
});
var capsuleEventSchema = z.object({
  id: z.number().int().optional(),
  eventType: z.enum(["billable.response", "deploy.completed", "rollback.completed"]),
  source: z.enum(["worker", "ci", "watchdog"]),
  route: z.string().nullable().optional(),
  statusCode: z.number().int().nullable().optional(),
  actorKeyId: z.string().nullable().optional(),
  requestFingerprint: z.string(),
  scrubbedPayload: z.record(z.unknown()),
  createdAt: z.number().int()
});
var meterEventSchema = z.object({
  idempotencyKey: z.string(),
  meterEventName: z.string(),
  tokenHash: z.string(),
  route: z.string(),
  units: z.number().int().positive(),
  duplicate: z.boolean(),
  createdAt: z.number().int()
});
var a2aRequestSchema = z.object({
  requestId: z.string(),
  model: z.string().optional(),
  messages: z.array(
    z.object({
      role: z.enum(["system", "user", "assistant"]),
      content: z.string()
    })
  ).optional(),
  prompt: z.string().optional(),
  metadata: z.record(z.unknown()).optional()
}).refine((value) => Boolean(value.prompt) || Boolean(value.messages?.length), {
  message: "prompt or messages is required"
});
var inferRequestSchema = z.object({
  requestId: z.string(),
  model: z.string().optional(),
  input: z.string().min(1),
  metadata: z.record(z.unknown()).optional()
});
var billableResponseSchema = z.object({
  requestId: z.string(),
  route: z.enum(["/a2a", "/v1/infer"]),
  provider: z.string(),
  model: z.string(),
  output: z.string(),
  usage: z.object({
    prompt_tokens: z.number().int(),
    completion_tokens: z.number().int(),
    total_tokens: z.number().int()
  }),
  duplicateMeterEvent: z.boolean()
});
var pufBenchResultSchema = z.object({
  runId: z.string(),
  challengeSize: z.number().int(),
  helperHash: z.string(),
  etaThermoSignature: z.string(),
  driftScore: z.number(),
  intruderRejected: z.boolean(),
  createdAt: z.number().int()
});
var pufProbeStatusSchema = z.object({
  deviceId: z.string(),
  state: z.enum(["SIM_READY", "SIM_DRIFT_OK", "SIM_DRIFT_ALERT"]),
  lastVerifiedAt: z.number().int(),
  notes: z.array(z.string())
});
var operatorAlertSchema = z.object({
  id: z.string(),
  severity: z.enum(["P0", "P1", "P2"]),
  title: z.string(),
  summary: z.string(),
  createdAt: z.number().int()
});
var operatorSnapshotSchema = z.object({
  promptVersions: z.array(promptVersionSchema),
  promotions: z.array(promotionCandidateSchema),
  cycles: z.array(cycleTelemetrySchema),
  quota: quotaSnapshotSchema,
  rollbackAudit: z.array(rollbackAuditSchema),
  pufBench: pufBenchResultSchema,
  pufProbe: pufProbeStatusSchema,
  alerts: z.array(operatorAlertSchema)
});
var operatorErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.unknown()).optional()
});
var searchResultSchema = z.object({
  id: z.string(),
  title: z.string(),
  kind: z.enum(["prompt", "promotion", "cycle", "alert", "document"]),
  summary: z.string(),
  url: z.string()
});
var fetchDocumentSchema = z.object({
  id: z.string(),
  title: z.string(),
  text: z.string(),
  url: z.string(),
  metadata: z.record(z.string())
});
var now = Date.parse("2026-04-17T03:30:00Z");
var seedOperatorSnapshot = operatorSnapshotSchema.parse({
  promptVersions: [
    {
      versionId: "pv-2026-04-17-active",
      status: "ACTIVE",
      promptText: "Summarize each section accurately, preserve chemical names, and explain failure modes explicitly.",
      promotedAt: now - 18e5,
      proposerHash: "sha256-active-001",
      model: "gpt-5"
    },
    {
      versionId: "pv-2026-04-15-baseline",
      status: "SUPERSEDED",
      promptText: "Summarize each section in 100 words with high factual density.",
      promotedAt: now - 1728e5,
      proposerHash: "sha256-baseline-001",
      model: "gpt-5-mini"
    }
  ],
  promotions: [
    {
      candidateId: "c-f3ce8b4418d3a6d2a4d01f4a",
      proposerHash: "sha256-candidate-001",
      promptText: "Preserve chemical names, surface grader disagreement, and avoid speculative scope expansion.",
      model: "gpt-5",
      sourceFeedback: [
        "chemical_name coverage dropped on section chem-17",
        "llm_judge flagged omitted catalyst concentration"
      ],
      state: "PENDING",
      scorePrior: 0.91,
      createdAt: now - 9e5,
      ttlCycles: 2
    }
  ],
  cycles: [
    {
      cycleId: "cycle-2026-04-17-001",
      status: "FAILED",
      executedAt: now - 36e5,
      totalTokens: 11420,
      computeMs: 14200,
      sectionId: "chem-17",
      summary: "Catalyst behavior was summarized, but the concentration threshold and reagent ordering drifted from the source.",
      averageScore: 0.79,
      residualDrift: 0.028,
      graderFeedback: [
        {
          id: 1,
          cycleId: "cycle-2026-04-17-001",
          sectionId: "chem-17",
          grader: "chemical_name",
          score: 0.74,
          reasoning: "Missed cobalt-III acetate reference."
        },
        {
          id: 2,
          cycleId: "cycle-2026-04-17-001",
          sectionId: "chem-17",
          grader: "word_length",
          score: 0.92,
          reasoning: "Summary length stayed inside target range."
        },
        {
          id: 3,
          cycleId: "cycle-2026-04-17-001",
          sectionId: "chem-17",
          grader: "cosine_sim",
          score: 0.83,
          reasoning: "Semantic overlap acceptable but incomplete."
        },
        {
          id: 4,
          cycleId: "cycle-2026-04-17-001",
          sectionId: "chem-17",
          grader: "llm_judge",
          score: 0.69,
          reasoning: "Important concentration detail omitted."
        }
      ]
    },
    {
      cycleId: "cycle-2026-04-17-002",
      status: "PASSED",
      executedAt: now - 9e5,
      totalTokens: 8950,
      computeMs: 11e3,
      sectionId: "ops-05",
      summary: "Quota flush completed, the Stripe meter event was batched, and no regression was detected across the post-promotion window.",
      averageScore: 0.93,
      residualDrift: 4e-3,
      graderFeedback: [
        {
          id: 5,
          cycleId: "cycle-2026-04-17-002",
          sectionId: "ops-05",
          grader: "chemical_name",
          score: 1,
          reasoning: "No chemical names present."
        },
        {
          id: 6,
          cycleId: "cycle-2026-04-17-002",
          sectionId: "ops-05",
          grader: "word_length",
          score: 0.95,
          reasoning: "Summary length stayed close to target."
        },
        {
          id: 7,
          cycleId: "cycle-2026-04-17-002",
          sectionId: "ops-05",
          grader: "cosine_sim",
          score: 0.89,
          reasoning: "High semantic overlap."
        },
        {
          id: 8,
          cycleId: "cycle-2026-04-17-002",
          sectionId: "ops-05",
          grader: "llm_judge",
          score: 0.9,
          reasoning: "Faithful summary."
        }
      ]
    }
  ],
  quota: {
    dailyTokenLimit: 125e3,
    tokensUsedToday: 36500,
    burnRatio: 0.292,
    remainingTokens: 88500
  },
  rollbackAudit: [
    {
      id: 1,
      auditBlob: {
        reason: "regression_watchdog",
        from: "pv-2026-04-10-candidate",
        to: "pv-2026-04-09-stable",
        ts: now - 6048e5
      },
      signature: "ed25519sig-roll-001",
      createdAt: now - 6048e5
    }
  ],
  pufBench: {
    runId: "bench-2026-04-17-001",
    challengeSize: 16384,
    helperHash: "sha256-helper-eta-001",
    etaThermoSignature: "sha256-eta-thermo-001",
    driftScore: 41e-8,
    intruderRejected: true,
    createdAt: now - 3e5
  },
  pufProbe: {
    deviceId: "hotpocket-local",
    state: "SIM_DRIFT_OK",
    lastVerifiedAt: now - 18e4,
    notes: [
      "Hash-only capsule emission enabled.",
      "Remote dispatch disabled by policy tier etp_sealed."
    ]
  },
  alerts: [
    {
      id: "alert-p1-rollback",
      severity: "P1",
      title: "Auto rollback executed",
      summary: "Regression watchdog rolled back the active prompt after three degraded cycles.",
      createdAt: now - 6048e5
    },
    {
      id: "alert-p2-quota",
      severity: "P2",
      title: "Quota burn below threshold",
      summary: "Burn ratio remains below the 80% alert threshold.",
      createdAt: now - 12e4
    }
  ]
});
var referenceDocuments = [
  {
    id: "doc-retraining-spec",
    title: "Retraining worker phase 1 implementation",
    text: "Covers proposer, evaluator, watchdog, audit, quota, and deployment gates for the Cloudflare retraining worker.",
    url: "https://genesis.local/docs/retraining-worker",
    metadata: {
      source: "docs",
      category: "implementation"
    }
  },
  {
    id: "doc-puf-safety",
    title: "eta_thermo sim harness safety policy",
    text: "Hash-only capsule writes, no raw vectors, no remote dispatch, and intruder-device paths fail closed.",
    url: "https://genesis.local/docs/puf-safety",
    metadata: {
      source: "docs",
      category: "security"
    }
  }
];
function listReferenceDocuments() {
  return referenceDocuments.map((document) => fetchDocumentSchema.parse(document));
}
function findReferenceDocument(id) {
  return listReferenceDocuments().find((document) => document.id === id);
}
function createSearchIndex(snapshot = seedOperatorSnapshot) {
  const promptResults = snapshot.promptVersions.map((prompt) => ({
    id: prompt.versionId,
    title: `Prompt ${prompt.versionId}`,
    kind: "prompt",
    summary: `${prompt.status} on ${new Date(prompt.promotedAt).toISOString()} via ${prompt.model}`,
    url: `https://genesis.local/prompts/${prompt.versionId}`
  }));
  const promotionResults = snapshot.promotions.map((promotion) => ({
    id: promotion.candidateId,
    title: `Promotion ${promotion.candidateId}`,
    kind: "promotion",
    summary: `${promotion.state} candidate with prior score ${promotion.scorePrior.toFixed(2)}`,
    url: `https://genesis.local/promotions/${promotion.candidateId}`
  }));
  const cycleResults = snapshot.cycles.map((cycle) => ({
    id: cycle.cycleId,
    title: `Cycle ${cycle.cycleId}`,
    kind: "cycle",
    summary: `${cycle.status} on ${cycle.sectionId} with average score ${cycle.averageScore.toFixed(2)}. ${cycle.summary} ${cycle.graderFeedback.map((feedback) => `${feedback.grader} ${feedback.reasoning}`).join(" ")}`,
    url: `https://genesis.local/cycles/${cycle.cycleId}`
  }));
  const alertResults = snapshot.alerts.map((alert) => ({
    id: alert.id,
    title: alert.title,
    kind: "alert",
    summary: alert.summary,
    url: `https://genesis.local/alerts/${alert.id}`
  }));
  const documentResults = listReferenceDocuments().map((document) => ({
    id: document.id,
    title: document.title,
    kind: "document",
    summary: document.text,
    url: document.url
  }));
  return [...promptResults, ...promotionResults, ...cycleResults, ...alertResults, ...documentResults].map((result) => searchResultSchema.parse(result));
}
function searchOperatorData(query, snapshot = seedOperatorSnapshot) {
  const lowered = query.toLowerCase();
  return createSearchIndex(snapshot).filter((entry) => {
    return [entry.title, entry.summary, entry.kind, entry.id].some(
      (field) => field.toLowerCase().includes(lowered)
    );
  });
}
function getCycleById(cycleId, snapshot = seedOperatorSnapshot) {
  return snapshot.cycles.find((cycle) => cycle.cycleId === cycleId);
}
function getPromptById(versionId, snapshot = seedOperatorSnapshot) {
  return snapshot.promptVersions.find((prompt) => prompt.versionId === versionId);
}
export {
  a2aRequestSchema,
  apiKeyRecordSchema,
  billableResponseSchema,
  capsuleEventSchema,
  createSearchIndex,
  cycleStatusSchema,
  cycleTelemetrySchema,
  fetchDocumentSchema,
  findReferenceDocument,
  getCycleById,
  getPromptById,
  graderFeedbackSchema,
  inferRequestSchema,
  listReferenceDocuments,
  meterEventSchema,
  operatorAlertSchema,
  operatorErrorSchema,
  operatorSnapshotSchema,
  promotionCandidateSchema,
  promotionStateSchema,
  promptStatusSchema,
  promptVersionSchema,
  pufBenchResultSchema,
  pufProbeStatusSchema,
  quotaSnapshotSchema,
  rollbackAuditSchema,
  searchOperatorData,
  searchResultSchema,
  seedOperatorSnapshot
};
