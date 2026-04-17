import { describe, expect, it, vi } from "vitest";

import { autoRollback } from "../src/scripts/autoRollbackCore.js";
import { createEnv } from "./support/env.js";

describe("rollback", () => {
  it("restores the prior VersionedPrompt row and emits a capsule event", async () => {
    const env = await createEnv();
    const fetchImpl = vi.fn(async () => new Response("ok", { status: 200 }));

    const audit = await autoRollback(env, {
      reason: "test_rollback",
      fromVersion: "pv-active",
      fetchImpl,
    });

    expect(audit.to).toBe("pv-prev-stable");
    const active = await env.genesis_seismic_log
      .prepare(`SELECT version_id FROM prompt_ledger WHERE status = 'ACTIVE' LIMIT 1`)
      .first<{ version_id: string }>();
    expect(active?.version_id).toBe("pv-prev-stable");

    const capsuleCount = await env.genesis_seismic_log
      .prepare(
        `SELECT COUNT(*) AS count
         FROM capsule_events
         WHERE event_type = 'rollback.completed'`
      )
      .first<{ count: number }>();
    expect(capsuleCount?.count).toBe(1);
  });
});
