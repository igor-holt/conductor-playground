import { describe, expect, it } from "vitest";

import worker from "../src/index.js";
import { runProvisionChecks } from "../src/provision.js";
import { createOpenAIClient } from "../src/openai.js";
import { createEnv } from "./support/env.js";
import { SqliteD1Database } from "./support/sqliteD1.js";
import { migrationPaths } from "./support/env.js";

describe("retraining worker", () => {
  it("fails closed when required secrets or bindings are missing", async () => {
    const missing = await runProvisionChecks({
      genesis_seismic_log: SqliteD1Database.fromSqlFiles(...migrationPaths),
    });
    expect(missing.ok).toBe(false);

    const env = await createEnv();
    const unreachable = await runProvisionChecks(env, {
      fetchImpl: async () => new Response("bad", { status: 500 }),
    });
    expect(unreachable).toEqual({
      ok: false,
      code: "E_SLACK_WEBHOOK_UNREACHABLE",
      detail: "status 500",
    });
  });

  it("serves read endpoints and guards live writes", async () => {
    const env = await createEnv();
    const health = await worker.fetch(new Request("https://example.test/healthz"), env);
    expect(health.status).toBe(200);

    const rollbackDenied = await worker.fetch(
      new Request("https://example.test/rollback", {
        method: "POST",
        body: JSON.stringify({ dryRun: false }),
      }),
      env
    );
    expect(rollbackDenied.status).toBe(403);

    const replayDryRun = await worker.fetch(
      new Request("https://example.test/cycles/cycle-window-1/replay", {
        method: "POST",
        body: JSON.stringify({ dryRun: true }),
      }),
      env
    );
    expect(replayDryRun.status).toBe(200);
  });

  it("wraps OpenAI responses with explicit null handling", async () => {
    const client = createOpenAIClient("test-key", "https://api.openai.com/v1", async () => {
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: "hello" } }],
          usage: { prompt_tokens: 1, completion_tokens: 2, total_tokens: 3 },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    });

    const response = await client.chatCompletion({
      model: "gpt-5",
      messages: [{ role: "system", content: "s" }, { role: "user", content: "u" }],
    });
    expect(response.content).toBe("hello");
    expect(response.usage.total_tokens).toBe(3);
  });
});
