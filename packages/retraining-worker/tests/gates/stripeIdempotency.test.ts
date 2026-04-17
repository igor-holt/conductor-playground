import { afterEach, describe, expect, it, vi } from "vitest";

import worker from "../../src/index.js";
import { createEnv } from "../support/env.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("TEST_STRIPE_IDEMPOTENCY", () => {
  it("deduplicates meter events when the same request is replayed inside the TTL window", async () => {
    const env = await createEnv();
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              choices: [{ message: { content: "Idempotent meter path." } }],
              usage: { prompt_tokens: 3, completion_tokens: 4, total_tokens: 7 },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          )
      )
    );

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const response = await worker.fetch(
        new Request("https://example.test/v1/infer", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer genesis-test-api-key",
          },
          body: JSON.stringify({
            requestId: "stripe-idempotency",
            input: "billable duplicate request",
          }),
        }),
        env
      );
      expect(response.status).toBe(200);
    }

    const count = await env.genesis_seismic_log
      .prepare(`SELECT COUNT(*) AS count FROM meter_events WHERE idempotency_key IS NOT NULL`)
      .first<{ count: number }>();
    expect(count?.count).toBe(1);
  });
});
