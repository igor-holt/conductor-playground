import { afterEach, describe, expect, it, vi } from "vitest";

import worker from "../../src/index.js";
import { createEnv } from "../support/env.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("TEST_CAPSULE_EMISSION", () => {
  it("writes exactly one capsule row per 2xx billable response and scrubs secrets", async () => {
    const env = await createEnv();
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              choices: [{ message: { content: "Scrubbed output sk_hidden Bearer secret ck_live_hidden" } }],
              usage: { prompt_tokens: 3, completion_tokens: 4, total_tokens: 7 },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          )
      )
    );

    const response = await worker.fetch(
      new Request("https://example.test/v1/infer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer genesis-test-api-key",
        },
        body: JSON.stringify({
          requestId: "capsule-once",
          input: "input with sk_live_token and Bearer abc and ck_live_123",
        }),
      }),
      env
    );

    expect(response.status).toBe(200);
    const count = await env.genesis_seismic_log
      .prepare(`SELECT COUNT(*) AS count FROM capsule_events WHERE event_type = 'billable.response'`)
      .first<{ count: number }>();
    expect(count?.count).toBe(1);

    const row = await env.genesis_seismic_log
      .prepare(`SELECT scrubbed_payload FROM capsule_events WHERE event_type = 'billable.response' LIMIT 1`)
      .first<{ scrubbed_payload: string }>();
    expect(row?.scrubbed_payload).not.toContain("sk_");
    expect(row?.scrubbed_payload).not.toContain("Bearer abc");
    expect(row?.scrubbed_payload).not.toContain("ck_live_");
    expect(row?.scrubbed_payload).toContain("[REDACTED_OPENAI_KEY]");
    expect(row?.scrubbed_payload).toContain("[REDACTED_TOKEN]");
    expect(row?.scrubbed_payload).toContain("[REDACTED_STRIPE_KEY]");
  });
});
