import { afterEach, describe, expect, it, vi } from "vitest";

import worker from "../../src/index.js";
import { createEnv } from "../support/env.js";

function createOpenAiResponse(content: string) {
  return new Response(
    JSON.stringify({
      choices: [{ message: { content } }],
      usage: { prompt_tokens: 4, completion_tokens: 5, total_tokens: 9 },
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("TEST_AUTH_UNIFICATION", () => {
  it("accepts one bearer token across /a2a and /v1/infer", async () => {
    if (process.env.STAGING_GENESIS_API_BASE_URL && process.env.STAGING_GENESIS_API_KEY) {
      for (const [path, body] of [
        ["/a2a", { requestId: "auth-a2a", prompt: "one sentence" }],
        ["/v1/infer", { requestId: "auth-infer", input: "one sentence" }],
      ] as const) {
        const response = await fetch(`${process.env.STAGING_GENESIS_API_BASE_URL}${path}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.STAGING_GENESIS_API_KEY}`,
          },
          body: JSON.stringify(body),
        });
        expect(response.status).toBe(200);
      }
      return;
    }

    const env = await createEnv();
    vi.stubGlobal("fetch", vi.fn(async () => createOpenAiResponse("Auth unified.")));

    const a2aResponse = await worker.fetch(
      new Request("https://example.test/a2a", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer genesis-test-api-key",
        },
        body: JSON.stringify({ requestId: "auth-a2a", prompt: "one sentence" }),
      }),
      env
    );
    const inferResponse = await worker.fetch(
      new Request("https://example.test/v1/infer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer genesis-test-api-key",
        },
        body: JSON.stringify({ requestId: "auth-infer", input: "one sentence" }),
      }),
      env
    );

    expect(a2aResponse.status).toBe(200);
    expect(inferResponse.status).toBe(200);
  });
});
