import {
  operatorAlertSchema,
  quotaSnapshotSchema,
  rollbackAuditSchema,
  seedOperatorSnapshot,
  cycleTelemetrySchema,
  promotionCandidateSchema,
  promptVersionSchema,
  type OperatorAlert,
  type PufBenchResult,
  type PufProbeStatus,
  type QuotaSnapshot,
  type RollbackAudit,
  type CycleTelemetry,
  type PromotionCandidate,
  type PromptVersion,
} from "@genesis/contracts";

export interface DashboardSnapshot {
  promptVersions: PromptVersion[];
  promotions: PromotionCandidate[];
  cycles: CycleTelemetry[];
  quota: QuotaSnapshot;
  rollbackAudit: RollbackAudit[];
  pufBench: PufBenchResult | null;
  pufProbe: PufProbeStatus | null;
  alerts: OperatorAlert[];
  dataSource: string;
}

async function fetchJson<T>(baseUrl: string, path: string): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`E_HTTP_${response.status}:${path}`);
  }
  return (await response.json()) as T;
}

function deriveAlerts(quota: QuotaSnapshot, rollbackAudit: RollbackAudit[], cycles: CycleTelemetry[]): OperatorAlert[] {
  const alerts: OperatorAlert[] = [];
  if (rollbackAudit[0]) {
    alerts.push(
      operatorAlertSchema.parse({
        id: `rollback-${rollbackAudit[0].id}`,
        severity: "P1",
        title: "Latest rollback audit",
        summary: `${rollbackAudit[0].auditBlob.reason} from ${rollbackAudit[0].auditBlob.from} to ${rollbackAudit[0].auditBlob.to}.`,
        createdAt: rollbackAudit[0].createdAt,
      })
    );
  }

  const failingCycles = cycles.filter((cycle) => cycle.status === "FAILED");
  if (failingCycles[0]) {
    alerts.push(
      operatorAlertSchema.parse({
        id: `cycle-${failingCycles[0].cycleId}`,
        severity: "P1",
        title: "Regression signal active",
        summary: `${failingCycles.length} failed cycles remain inside the live watchdog window.`,
        createdAt: failingCycles[0].executedAt,
      })
    );
  }

  alerts.push(
    operatorAlertSchema.parse({
      id: "quota-burn",
      severity: quota.burnRatio >= 0.8 ? "P1" : "P2",
      title: "Quota burn",
      summary:
        quota.burnRatio >= 0.8
          ? "Quota burn is above the 80% threshold."
          : "Quota burn remains below the 80% threshold.",
      createdAt: Date.now(),
    })
  );

  return alerts;
}

export async function getOperatorSnapshot(): Promise<DashboardSnapshot> {
  const baseUrl = process.env.GENESIS_API_BASE_URL;
  if (!baseUrl) {
    return {
      ...seedOperatorSnapshot,
      dataSource: "seed",
    };
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
      promptVersions: parsedPromptVersions,
      promotions: parsedPromotions,
      cycles: parsedCycles,
      quota: parsedQuota,
      rollbackAudit: parsedRollbackAudit,
      pufBench: null,
      pufProbe: null,
      alerts: deriveAlerts(parsedQuota, parsedRollbackAudit, parsedCycles),
      dataSource: baseUrl,
    };
  } catch {
    return {
      ...seedOperatorSnapshot,
      dataSource: "seed-fallback",
    };
  }
}
