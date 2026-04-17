import { describe, expect, it, vi } from "vitest";

import { runRegressionWatchdog } from "../src/orchestrator/regressionWatchdog.js";
import { createEnv } from "./support/env.js";

describe("watchdog", () => {
  it("trips on injected residual drift above the configured threshold", async () => {
    const env = await createEnv();
    await env.genesis_seismic_log
      .prepare(`UPDATE cycle_telemetry SET residual_drift = 0.031 WHERE cycle_id LIKE 'cycle-window-%'`)
      .run();

    const fetchImpl = vi.fn(async () => new Response("ok", { status: 200 }));
    const result = await runRegressionWatchdog(env, { fetchImpl });

    expect(result).toEqual({ rolledBack: true });
    const active = await env.genesis_seismic_log
      .prepare(`SELECT version_id FROM prompt_ledger WHERE status = 'ACTIVE' LIMIT 1`)
      .first<{ version_id: string }>();
    expect(active?.version_id).toBe("pv-prev-stable");
  });
});
