import { z } from "zod";

export const promptStatusSchema = z.enum([
  "ACTIVE",
  "SUPERSEDED",
  "ROLLED_BACK",
]);

export const promotionStateSchema = z.enum([
  "PENDING",
  "EVALUATING",
  "PROMOTED",
  "REJECTED",
]);

export const cycleStatusSchema = z.enum([
  "PASSED",
  "FAILED",
  "ROLLED_BACK",
]);

export const promptVersionSchema = z.object({
  versionId: z.string(),
  status: promptStatusSchema,
  promptText: z.string(),
  promotedAt: z.number().int(),
  proposerHash: z.string(),
  model: z.string(),
});

export const promotionCandidateSchema = z.object({
  candidateId: z.string(),
  proposerHash: z.string(),
  promptText: z.string(),
  model: z.string(),
  sourceFeedback: z.array(z.string()),
  state: promotionStateSchema,
  scorePrior: z.number(),
  createdAt: z.number().int(),
  ttlCycles: z.number().int(),
});

export const graderFeedbackSchema = z.object({
  id: z.number().int(),
  cycleId: z.string(),
  sectionId: z.string(),
  grader: z.string(),
  score: z.number(),
  reasoning: z.string(),
});

export const cycleTelemetrySchema = z.object({
  cycleId: z.string(),
  status: cycleStatusSchema,
  executedAt: z.number().int(),
  totalTokens: z.number().int(),
  computeMs: z.number().int(),
  sectionId: z.string(),
  summary: z.string(),
  averageScore: z.number(),
  residualDrift: z.number().default(0),
  graderFeedback: z.array(graderFeedbackSchema),
});

export const rollbackAuditSchema = z.object({
  id: z.number().int(),
  auditBlob: z.object({
    reason: z.string(),
    from: z.string(),
    to: z.string(),
    ts: z.number().int(),
  }),
  signature: z.string(),
  createdAt: z.number().int(),
});

export const quotaSnapshotSchema = z.object({
  dailyTokenLimit: z.number().int(),
  tokensUsedToday: z.number().int(),
  burnRatio: z.number(),
  remainingTokens: z.number().int(),
});

export const apiKeyRecordSchema = z.object({
  keyId: z.string(),
  label: z.string(),
  tokenHash: z.string(),
  scopes: z.array(z.string()),
  rateLimitPerMinute: z.number().int().positive(),
  meterEventName: z.string(),
  active: z.boolean(),
  createdAt: z.number().int(),
});

export const capsuleEventSchema = z.object({
  id: z.number().int().optional(),
  eventType: z.enum(["billable.response", "deploy.completed", "rollback.completed"]),
  source: z.enum(["worker", "ci", "watchdog"]),
  route: z.string().nullable().optional(),
  statusCode: z.number().int().nullable().optional(),
  actorKeyId: z.string().nullable().optional(),
  requestFingerprint: z.string(),
  scrubbedPayload: z.record(z.unknown()),
  createdAt: z.number().int(),
});

export const meterEventSchema = z.object({
  idempotencyKey: z.string(),
  meterEventName: z.string(),
  tokenHash: z.string(),
  route: z.string(),
  units: z.number().int().positive(),
  duplicate: z.boolean(),
  createdAt: z.number().int(),
});

export const a2aRequestSchema = z
  .object({
    requestId: z.string(),
    model: z.string().optional(),
    messages: z
      .array(
        z.object({
          role: z.enum(["system", "user", "assistant"]),
          content: z.string(),
        })
      )
      .optional(),
    prompt: z.string().optional(),
    metadata: z.record(z.unknown()).optional(),
  })
  .refine((value) => Boolean(value.prompt) || Boolean(value.messages?.length), {
    message: "prompt or messages is required",
  });

export const inferRequestSchema = z.object({
  requestId: z.string(),
  model: z.string().optional(),
  input: z.string().min(1),
  metadata: z.record(z.unknown()).optional(),
});

export const billableResponseSchema = z.object({
  requestId: z.string(),
  route: z.enum(["/a2a", "/v1/infer"]),
  provider: z.string(),
  model: z.string(),
  output: z.string(),
  usage: z.object({
    prompt_tokens: z.number().int(),
    completion_tokens: z.number().int(),
    total_tokens: z.number().int(),
  }),
  duplicateMeterEvent: z.boolean(),
});

export const pufBenchResultSchema = z.object({
  runId: z.string(),
  challengeSize: z.number().int(),
  helperHash: z.string(),
  etaThermoSignature: z.string(),
  driftScore: z.number(),
  intruderRejected: z.boolean(),
  createdAt: z.number().int(),
});

export const pufProbeStatusSchema = z.object({
  deviceId: z.string(),
  state: z.enum(["SIM_READY", "SIM_DRIFT_OK", "SIM_DRIFT_ALERT"]),
  lastVerifiedAt: z.number().int(),
  notes: z.array(z.string()),
});

export const operatorAlertSchema = z.object({
  id: z.string(),
  severity: z.enum(["P0", "P1", "P2"]),
  title: z.string(),
  summary: z.string(),
  createdAt: z.number().int(),
});

export const operatorSnapshotSchema = z.object({
  promptVersions: z.array(promptVersionSchema),
  promotions: z.array(promotionCandidateSchema),
  cycles: z.array(cycleTelemetrySchema),
  quota: quotaSnapshotSchema,
  rollbackAudit: z.array(rollbackAuditSchema),
  pufBench: pufBenchResultSchema,
  pufProbe: pufProbeStatusSchema,
  alerts: z.array(operatorAlertSchema),
});

export const operatorErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.unknown()).optional(),
});

export const searchResultSchema = z.object({
  id: z.string(),
  title: z.string(),
  kind: z.enum(["prompt", "promotion", "cycle", "alert", "document"]),
  summary: z.string(),
  url: z.string(),
});

export const fetchDocumentSchema = z.object({
  id: z.string(),
  title: z.string(),
  text: z.string(),
  url: z.string(),
  metadata: z.record(z.string()),
});

export type PromptVersion = z.infer<typeof promptVersionSchema>;
export type PromotionCandidate = z.infer<typeof promotionCandidateSchema>;
export type CycleTelemetry = z.infer<typeof cycleTelemetrySchema>;
export type GraderFeedback = z.infer<typeof graderFeedbackSchema>;
export type RollbackAudit = z.infer<typeof rollbackAuditSchema>;
export type QuotaSnapshot = z.infer<typeof quotaSnapshotSchema>;
export type ApiKeyRecord = z.infer<typeof apiKeyRecordSchema>;
export type CapsuleEvent = z.infer<typeof capsuleEventSchema>;
export type MeterEvent = z.infer<typeof meterEventSchema>;
export type PufBenchResult = z.infer<typeof pufBenchResultSchema>;
export type PufProbeStatus = z.infer<typeof pufProbeStatusSchema>;
export type OperatorAlert = z.infer<typeof operatorAlertSchema>;
export type OperatorSnapshot = z.infer<typeof operatorSnapshotSchema>;
export type OperatorError = z.infer<typeof operatorErrorSchema>;
export type SearchResult = z.infer<typeof searchResultSchema>;
export type FetchDocument = z.infer<typeof fetchDocumentSchema>;
export type A2ARequest = z.infer<typeof a2aRequestSchema>;
export type InferRequest = z.infer<typeof inferRequestSchema>;
export type BillableResponse = z.infer<typeof billableResponseSchema>;

const now = Date.parse("2026-04-17T03:30:00Z");

export const seedOperatorSnapshot: OperatorSnapshot = operatorSnapshotSchema.parse({
  promptVersions: [
    {
      versionId: "pv-2026-04-17-active",
      status: "ACTIVE",
      promptText:
        "Summarize each section accurately, preserve chemical names, and explain failure modes explicitly.",
      promotedAt: now - 1_800_000,
      proposerHash: "sha256-active-001",
      model: "gpt-5",
    },
    {
      versionId: "pv-2026-04-15-baseline",
      status: "SUPERSEDED",
      promptText: "Summarize each section in 100 words with high factual density.",
      promotedAt: now - 172_800_000,
      proposerHash: "sha256-baseline-001",
      model: "gpt-5-mini",
    },
  ],
  promotions: [
    {
      candidateId: "c-f3ce8b4418d3a6d2a4d01f4a",
      proposerHash: "sha256-candidate-001",
      promptText:
        "Preserve chemical names, surface grader disagreement, and avoid speculative scope expansion.",
      model: "gpt-5",
      sourceFeedback: [
        "chemical_name coverage dropped on section chem-17",
        "llm_judge flagged omitted catalyst concentration",
      ],
      state: "PENDING",
      scorePrior: 0.91,
      createdAt: now - 900_000,
      ttlCycles: 2,
    },
  ],
  cycles: [
    {
      cycleId: "cycle-2026-04-17-001",
      status: "FAILED",
      executedAt: now - 3_600_000,
      totalTokens: 11_420,
      computeMs: 14_200,
      sectionId: "chem-17",
      summary:
        "Catalyst behavior was summarized, but the concentration threshold and reagent ordering drifted from the source.",
      averageScore: 0.79,
      residualDrift: 0.028,
      graderFeedback: [
        {
          id: 1,
          cycleId: "cycle-2026-04-17-001",
          sectionId: "chem-17",
          grader: "chemical_name",
          score: 0.74,
          reasoning: "Missed cobalt-III acetate reference.",
        },
        {
          id: 2,
          cycleId: "cycle-2026-04-17-001",
          sectionId: "chem-17",
          grader: "word_length",
          score: 0.92,
          reasoning: "Summary length stayed inside target range.",
        },
        {
          id: 3,
          cycleId: "cycle-2026-04-17-001",
          sectionId: "chem-17",
          grader: "cosine_sim",
          score: 0.83,
          reasoning: "Semantic overlap acceptable but incomplete.",
        },
        {
          id: 4,
          cycleId: "cycle-2026-04-17-001",
          sectionId: "chem-17",
          grader: "llm_judge",
          score: 0.69,
          reasoning: "Important concentration detail omitted.",
        },
      ],
    },
    {
      cycleId: "cycle-2026-04-17-002",
      status: "PASSED",
      executedAt: now - 900_000,
      totalTokens: 8_950,
      computeMs: 11_000,
      sectionId: "ops-05",
      summary:
        "Quota flush completed, the Stripe meter event was batched, and no regression was detected across the post-promotion window.",
      averageScore: 0.93,
      residualDrift: 0.004,
      graderFeedback: [
        {
          id: 5,
          cycleId: "cycle-2026-04-17-002",
          sectionId: "ops-05",
          grader: "chemical_name",
          score: 1,
          reasoning: "No chemical names present.",
        },
        {
          id: 6,
          cycleId: "cycle-2026-04-17-002",
          sectionId: "ops-05",
          grader: "word_length",
          score: 0.95,
          reasoning: "Summary length stayed close to target.",
        },
        {
          id: 7,
          cycleId: "cycle-2026-04-17-002",
          sectionId: "ops-05",
          grader: "cosine_sim",
          score: 0.89,
          reasoning: "High semantic overlap.",
        },
        {
          id: 8,
          cycleId: "cycle-2026-04-17-002",
          sectionId: "ops-05",
          grader: "llm_judge",
          score: 0.9,
          reasoning: "Faithful summary.",
        },
      ],
    },
  ],
  quota: {
    dailyTokenLimit: 125_000,
    tokensUsedToday: 36_500,
    burnRatio: 0.292,
    remainingTokens: 88_500,
  },
  rollbackAudit: [
    {
      id: 1,
      auditBlob: {
        reason: "regression_watchdog",
        from: "pv-2026-04-10-candidate",
        to: "pv-2026-04-09-stable",
        ts: now - 604_800_000,
      },
      signature: "ed25519sig-roll-001",
      createdAt: now - 604_800_000,
    },
  ],
  pufBench: {
    runId: "bench-2026-04-17-001",
    challengeSize: 16_384,
    helperHash: "sha256-helper-eta-001",
    etaThermoSignature: "sha256-eta-thermo-001",
    driftScore: 0.00000041,
    intruderRejected: true,
    createdAt: now - 300_000,
  },
  pufProbe: {
    deviceId: "hotpocket-local",
    state: "SIM_DRIFT_OK",
    lastVerifiedAt: now - 180_000,
    notes: [
      "Hash-only capsule emission enabled.",
      "Remote dispatch disabled by policy tier etp_sealed.",
    ],
  },
  alerts: [
    {
      id: "alert-p1-rollback",
      severity: "P1",
      title: "Auto rollback executed",
      summary: "Regression watchdog rolled back the active prompt after three degraded cycles.",
      createdAt: now - 604_800_000,
    },
    {
      id: "alert-p2-quota",
      severity: "P2",
      title: "Quota burn below threshold",
      summary: "Burn ratio remains below the 80% alert threshold.",
      createdAt: now - 120_000,
    },
  ],
});

const referenceDocuments = [
  {
    id: "doc-retraining-spec",
    title: "Retraining worker phase 1 implementation",
    text: "Covers proposer, evaluator, watchdog, audit, quota, and deployment gates for the Cloudflare retraining worker.",
    url: "https://genesis.local/docs/retraining-worker",
    metadata: {
      source: "docs",
      category: "implementation",
    },
  },
  {
    id: "doc-puf-safety",
    title: "eta_thermo sim harness safety policy",
    text: "Hash-only capsule writes, no raw vectors, no remote dispatch, and intruder-device paths fail closed.",
    url: "https://genesis.local/docs/puf-safety",
    metadata: {
      source: "docs",
      category: "security",
    },
  },
] as const satisfies readonly FetchDocument[];

export function listReferenceDocuments(): FetchDocument[] {
  return referenceDocuments.map((document) => fetchDocumentSchema.parse(document));
}

export function findReferenceDocument(id: string): FetchDocument | undefined {
  return listReferenceDocuments().find((document) => document.id === id);
}

export function createSearchIndex(snapshot: OperatorSnapshot = seedOperatorSnapshot): SearchResult[] {
  const promptResults = snapshot.promptVersions.map((prompt) => ({
    id: prompt.versionId,
    title: `Prompt ${prompt.versionId}`,
    kind: "prompt" as const,
    summary: `${prompt.status} on ${new Date(prompt.promotedAt).toISOString()} via ${prompt.model}`,
    url: `https://genesis.local/prompts/${prompt.versionId}`,
  }));

  const promotionResults = snapshot.promotions.map((promotion) => ({
    id: promotion.candidateId,
    title: `Promotion ${promotion.candidateId}`,
    kind: "promotion" as const,
    summary: `${promotion.state} candidate with prior score ${promotion.scorePrior.toFixed(2)}`,
    url: `https://genesis.local/promotions/${promotion.candidateId}`,
  }));

  const cycleResults = snapshot.cycles.map((cycle) => ({
    id: cycle.cycleId,
    title: `Cycle ${cycle.cycleId}`,
    kind: "cycle" as const,
    summary: `${cycle.status} on ${cycle.sectionId} with average score ${cycle.averageScore.toFixed(2)}. ${cycle.summary} ${cycle.graderFeedback
      .map((feedback) => `${feedback.grader} ${feedback.reasoning}`)
      .join(" ")}`,
    url: `https://genesis.local/cycles/${cycle.cycleId}`,
  }));

  const alertResults = snapshot.alerts.map((alert) => ({
    id: alert.id,
    title: alert.title,
    kind: "alert" as const,
    summary: alert.summary,
    url: `https://genesis.local/alerts/${alert.id}`,
  }));

  const documentResults = listReferenceDocuments().map((document) => ({
    id: document.id,
    title: document.title,
    kind: "document" as const,
    summary: document.text,
    url: document.url,
  }));

  return [...promptResults, ...promotionResults, ...cycleResults, ...alertResults, ...documentResults]
    .map((result) => searchResultSchema.parse(result));
}

export function searchOperatorData(
  query: string,
  snapshot: OperatorSnapshot = seedOperatorSnapshot
): SearchResult[] {
  const lowered = query.toLowerCase();
  return createSearchIndex(snapshot).filter((entry) => {
    return [entry.title, entry.summary, entry.kind, entry.id].some((field) =>
      field.toLowerCase().includes(lowered)
    );
  });
}

export function getCycleById(
  cycleId: string,
  snapshot: OperatorSnapshot = seedOperatorSnapshot
): CycleTelemetry | undefined {
  return snapshot.cycles.find((cycle) => cycle.cycleId === cycleId);
}

export function getPromptById(
  versionId: string,
  snapshot: OperatorSnapshot = seedOperatorSnapshot
): PromptVersion | undefined {
  return snapshot.promptVersions.find((prompt) => prompt.versionId === versionId);
}
