import { describe, expect, it, vi } from "vitest";

import { consumeRateLimitSlot } from "../../src/db.js";
import { createEnv } from "../support/env.js";

describe("TEST_RATE_LIMIT_D1", () => {
  it("enforces limits from D1 rollups with p99 under 50ms and no Stripe roundtrip", async () => {
    const env = await createEnv();
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const samples: number[] = [];
    for (let index = 0; index < 25; index += 1) {
      const started = performance.now();
      const result = await consumeRateLimitSlot(env.genesis_seismic_log, {
        tokenHash: "hash-rate-limit",
        route: "/v1/infer",
        limit: 20,
        windowMs: 60_000,
        now: Date.now(),
      });
      samples.push(performance.now() - started);
      if (index < 20) {
        expect(result.allowed).toBe(true);
      }
    }

    const sorted = [...samples].sort((left, right) => left - right);
    const p99 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.99))] ?? 0;
    expect(p99).toBeLessThan(50);

    const blocked = await consumeRateLimitSlot(env.genesis_seismic_log, {
      tokenHash: "hash-rate-limit",
      route: "/v1/infer",
      limit: 20,
      windowMs: 60_000,
      now: Date.now(),
    });
    expect(blocked.allowed).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
