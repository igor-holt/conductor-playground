import { afterEach, describe, expect, it, vi } from "vitest";

import worker from "../../src/index.js";
import { createEnv } from "../support/env.js";

function createOpenAiResponse(content: string) {
  return new Response(
    JSON.stringify({
      choices: [{ message: { content } }],
      usage: { prompt_tokens: 4, completion_tokens: 7, total_tokens: 11 },
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("TEST_A2A_TCK", () => {
  it("replays the canonical v0.3.0 A2A request", async () => {
    if (process.env.STAGING_GENESIS_API_BASE_URL && process.env.STAGING_GENESIS_API_KEY) {
      const response = await fetch(`${process.env.STAGING_GENESIS_API_BASE_URL}/a2a`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.STAGING_GENESIS_API_KEY}`,
        },
        body: JSON.stringify({
          requestId: "a2a-tck-v0-3-0",
          prompt: "Explain the current active prompt in one sentence.",
        }),
      });
      expect(response.status).toBe(200);
      const payload = (await response.json()) as { route?: string; requestId?: string; output?: string };
      expect(payload.route).toBe("/a2a");
      expect(payload.requestId).toBe("a2a-tck-v0-3-0");
      expect(payload.output).toBeTruthy();
      return;
    }

    const env = await createEnv();
    vi.stubGlobal("fetch", vi.fn(async () => createOpenAiResponse("A2A replay passed.")));

    const response = await worker.fetch(
      new Request("https://example.test/a2a", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer genesis-test-api-key",
        },
        body: JSON.stringify({
          requestId: "a2a-tck-v0-3-0",
          prompt: "Explain the current active prompt in one sentence.",
        }),
      }),
      env
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as { route: string; requestId: string; output: string };
    expect(payload.route).toBe("/a2a");
    expect(payload.requestId).toBe("a2a-tck-v0-3-0");
    expect(payload.output).toContain("A2A replay");
  });
});
