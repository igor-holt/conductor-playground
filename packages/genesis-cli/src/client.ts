import {
  billableResponseSchema,
  getCycleById,
  searchOperatorData,
  seedOperatorSnapshot,
  type BillableResponse,
  type CycleTelemetry,
  type OperatorSnapshot,
  type PromotionCandidate,
  type PromptVersion,
  type QuotaSnapshot,
  type RollbackAudit,
} from "@genesis/contracts";

import type { CliConfigResult } from "./config.js";

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`E_HTTP_${response.status}`);
  }
  return (await response.json()) as T;
}

export class GenesisApiClient {
  constructor(private readonly configResult: CliConfigResult) {}

  doctor() {
    return {
      apiBaseUrl: this.configResult.config.apiBaseUrl ?? "mock://seedOperatorSnapshot",
      apiBaseSource: this.configResult.source,
      configPath: this.configResult.configPath,
      apiKeyConfigured: Boolean(this.configResult.config.apiKey),
      writeTokenConfigured: Boolean(this.configResult.config.adminWriteToken),
    };
  }

  private isMock(): boolean {
    return !this.configResult.config.apiBaseUrl;
  }

  private async getJson<T>(path: string, mockFactory: (snapshot: OperatorSnapshot) => T): Promise<T> {
    if (this.isMock()) {
      return mockFactory(seedOperatorSnapshot);
    }
    const response = await fetch(`${this.configResult.config.apiBaseUrl}${path}`);
    return parseJson<T>(response);
  }

  private async postJson<T>(
    path: string,
    body: Record<string, unknown>,
    mockFactory: (snapshot: OperatorSnapshot) => T,
    authHeader?: string
  ): Promise<T> {
    if (this.isMock()) {
      return mockFactory(seedOperatorSnapshot);
    }
    const response = await fetch(`${this.configResult.config.apiBaseUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify(body),
    });
    return parseJson<T>(response);
  }

  async getActivePrompt(): Promise<PromptVersion | null> {
    return this.getJson(
      "/prompts/active",
      (snapshot) => snapshot.promptVersions.find((entry: PromptVersion) => entry.status === "ACTIVE") ?? null
    );
  }

  async listPromotions(): Promise<PromotionCandidate[]> {
    return this.getJson("/promotions", (snapshot) => snapshot.promotions);
  }

  async listCycles(): Promise<CycleTelemetry[]> {
    return this.getJson("/cycles", (snapshot) => snapshot.cycles);
  }

  async getCycle(cycleId: string): Promise<CycleTelemetry | null> {
    return this.getJson(`/cycles/${cycleId}`, (snapshot) => getCycleById(cycleId, snapshot) ?? null);
  }

  async getQuota(): Promise<QuotaSnapshot> {
    return this.getJson("/quota", (snapshot) => snapshot.quota);
  }

  async listRollbackAudit(): Promise<RollbackAudit[]> {
    return this.getJson("/rollback-audit", (snapshot) => snapshot.rollbackAudit);
  }

  async replayCycle(cycleId: string, dryRun: boolean) {
    return this.postJson(
      `/cycles/${cycleId}/replay`,
      { dryRun },
      () => ({
        accepted: true,
        cycleId,
        dryRun,
        message: dryRun
          ? "Replay request validated without mutating worker state."
          : "Replay request accepted for execution.",
      }),
      this.configResult.config.adminWriteToken
        ? `Bearer ${this.configResult.config.adminWriteToken}`
        : undefined
    );
  }

  async rollbackLedger(dryRun: boolean) {
    return this.postJson(
      "/rollback",
      { dryRun },
      () => ({
        accepted: true,
        dryRun,
        message: dryRun
          ? "Rollback request validated without mutating worker state."
          : "Rollback request accepted for execution.",
      }),
      this.configResult.config.adminWriteToken
        ? `Bearer ${this.configResult.config.adminWriteToken}`
        : undefined
    );
  }

  async invokeA2A(input: { requestId: string; prompt: string; model?: string }): Promise<BillableResponse> {
    const response = await this.postJson(
      "/a2a",
      input,
      () =>
        billableResponseSchema.parse({
          requestId: input.requestId,
          route: "/a2a",
          provider: "mock",
          model: input.model ?? "gpt-5-mini",
          output: `mock:${input.prompt}`,
          usage: {
            prompt_tokens: 1,
            completion_tokens: 1,
            total_tokens: 2,
          },
          duplicateMeterEvent: false,
        }),
      this.configResult.config.apiKey ? `Bearer ${this.configResult.config.apiKey}` : undefined
    );
    return billableResponseSchema.parse(response);
  }

  async invokeInfer(input: { requestId: string; input: string; model?: string }): Promise<BillableResponse> {
    const response = await this.postJson(
      "/v1/infer",
      input,
      () =>
        billableResponseSchema.parse({
          requestId: input.requestId,
          route: "/v1/infer",
          provider: "mock",
          model: input.model ?? "gpt-5-mini",
          output: `mock:${input.input}`,
          usage: {
            prompt_tokens: 1,
            completion_tokens: 1,
            total_tokens: 2,
          },
          duplicateMeterEvent: false,
        }),
      this.configResult.config.apiKey ? `Bearer ${this.configResult.config.apiKey}` : undefined
    );
    return billableResponseSchema.parse(response);
  }

  async requestGet(path: string) {
    if (this.isMock()) {
      if (path === "/search") {
        return searchOperatorData("prompt");
      }
      if (path === "/prompts/active") {
        return this.getActivePrompt();
      }
      throw new Error("E_RAW_PATH_UNAVAILABLE_IN_MOCK_MODE");
    }
    const response = await fetch(`${this.configResult.config.apiBaseUrl}${path}`);
    return parseJson<unknown>(response);
  }
}
