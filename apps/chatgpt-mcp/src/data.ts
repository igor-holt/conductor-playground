import {
  createSearchIndex,
  fetchDocumentSchema,
  findReferenceDocument,
  getCycleById,
  getPromptById,
  listReferenceDocuments,
  operatorAlertSchema,
  quotaSnapshotSchema,
  rollbackAuditSchema,
  seedOperatorSnapshot,
  cycleTelemetrySchema,
  promotionCandidateSchema,
  promptVersionSchema,
} from "@genesis/contracts";

async function fetchJson<T>(baseUrl: string, path: string): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`E_HTTP_${response.status}:${path}`);
  }
  return (await response.json()) as T;
}

async function getLiveSnapshot() {
  const baseUrl = process.env.GENESIS_API_BASE_URL;
  if (!baseUrl) {
    return seedOperatorSnapshot;
  }

  try {
    const [promptVersions, promotions, cycles, quota, rollbackAudit] = await Promise.all([
      fetchJson<unknown[]>(baseUrl, "/prompts"),
      fetchJson<unknown[]>(baseUrl, "/promotions"),
      fetchJson<unknown[]>(baseUrl, "/cycles"),
      fetchJson<unknown>(baseUrl, "/quota"),
      fetchJson<unknown[]>(baseUrl, "/rollback-audit"),
    ]);

    const parsedPromptVersions = promptVersions.map((entry) => promptVersionSchema.parse(entry));
    const parsedPromotions = promotions.map((entry) => promotionCandidateSchema.parse(entry));
    const parsedCycles = cycles.map((entry) => cycleTelemetrySchema.parse(entry));
    const parsedQuota = quotaSnapshotSchema.parse(quota);
    const parsedRollbackAudit = rollbackAudit.map((entry) => rollbackAuditSchema.parse(entry));

    return {
      ...seedOperatorSnapshot,
      promptVersions: parsedPromptVersions,
      promotions: parsedPromotions,
      cycles: parsedCycles,
      quota: parsedQuota,
      rollbackAudit: parsedRollbackAudit,
      alerts: [
        operatorAlertSchema.parse({
          id: "live-quota",
          severity: parsedQuota.burnRatio >= 0.8 ? "P1" : "P2",
          title: "Live quota burn",
          summary:
            parsedQuota.burnRatio >= 0.8
              ? "Quota burn is above the 80% threshold."
              : "Quota burn remains below the 80% threshold.",
          createdAt: Date.now(),
        }),
      ],
    };
  } catch {
    return seedOperatorSnapshot;
  }
}

export async function searchGenesisRecords(query: string) {
  const snapshot = await getLiveSnapshot();
  return createSearchIndex(snapshot)
    .filter((entry) => [entry.title, entry.summary, entry.kind, entry.id].some((field) => field.toLowerCase().includes(query.toLowerCase())))
    .slice(0, 8);
}

export async function fetchGenesisRecord(id: string) {
  const snapshot = await getLiveSnapshot();
  const document = findReferenceDocument(id);
  if (document) {
    return fetchDocumentSchema.parse(document);
  }

  const prompt = getPromptById(id, snapshot);
  if (prompt) {
    return fetchDocumentSchema.parse({
      id: prompt.versionId,
      title: `Prompt ${prompt.versionId}`,
      text: JSON.stringify(prompt, null, 2),
      url: `https://genesis.local/prompts/${prompt.versionId}`,
      metadata: { source: "prompt-ledger", category: "prompt" },
    });
  }

  const cycle = getCycleById(id, snapshot);
  if (cycle) {
    return fetchDocumentSchema.parse({
      id: cycle.cycleId,
      title: `Cycle ${cycle.cycleId}`,
      text: JSON.stringify(cycle, null, 2),
      url: `https://genesis.local/cycles/${cycle.cycleId}`,
      metadata: { source: "cycle-telemetry", category: "cycle" },
    });
  }

  const promotion = createSearchIndex(snapshot).find((entry) => entry.id === id);
  if (promotion) {
    return fetchDocumentSchema.parse({
      id: promotion.id,
      title: promotion.title,
      text: promotion.summary,
      url: promotion.url,
      metadata: { source: promotion.kind, category: promotion.kind },
    });
  }

  return undefined;
}

export async function getWidgetSnapshot() {
  const snapshot = await getLiveSnapshot();
  return {
    activePrompt: snapshot.promptVersions.find((entry) => entry.status === "ACTIVE"),
    promotions: snapshot.promotions,
    cycles: snapshot.cycles.slice(0, 4),
    alerts: snapshot.alerts,
    documents: listReferenceDocuments(),
    dataSource: process.env.GENESIS_API_BASE_URL ? "live" : "seed",
  };
}
