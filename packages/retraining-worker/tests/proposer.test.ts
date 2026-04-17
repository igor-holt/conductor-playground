import { describe, expect, it } from "vitest";

import { runMetaPromptAgent } from "../src/orchestrator/metapromptAgent.js";
import type { OpenAIClient } from "../src/types.js";
import { createEnv } from "./support/env.js";

function createOpenAiMock(content: string): OpenAIClient {
  return {
    async chatCompletion() {
      return {
        content,
        usage: {
          prompt_tokens: 1,
          completion_tokens: 1,
          total_tokens: 2,
        },
      };
    },
    async embedding() {
      return [1, 0, 0];
    },
  };
}

describe("proposer", () => {
  it("emits a pending candidate under nominal failing-signal conditions", async () => {
    const env = await createEnv();
    await env.genesis_seismic_log
      .prepare(`UPDATE cycle_telemetry SET executed_at = ? WHERE status = 'FAILED'`)
      .bind(Date.now() - 60_000)
      .run();

    const result = await runMetaPromptAgent(
      env,
      createOpenAiMock(
        "Preserve chemical_name evidence, surface llm_judge disagreement, and preserve concentration thresholds."
      )
    );

    expect(result).toMatchObject({ proposed: 1 });
    const queue = await env.genesis_seismic_log
      .prepare(`SELECT COUNT(*) AS count FROM promotion_queue WHERE candidate_id != 'c-existing'`)
      .first<{ count: number }>();
    expect(queue?.count).toBe(1);
  });

  it("emits a candidate under degraded grader signal while preserving PENDING state", async () => {
    const env = await createEnv();
    await env.genesis_seismic_log
      .prepare(`UPDATE grader_feedback SET score = 0.41 WHERE grader = 'llm_judge'`)
      .run();
    await env.genesis_seismic_log
      .prepare(`UPDATE cycle_telemetry SET executed_at = ? WHERE status = 'FAILED'`)
      .bind(Date.now() - 60_000)
      .run();

    const result = await runMetaPromptAgent(
      env,
      createOpenAiMock(
        "Preserve llm_judge evidence, keep catalyst concentration thresholds, and avoid speculative scope expansion."
      )
    );

    expect(result).toMatchObject({ proposed: 1 });
    const inserted = await env.genesis_seismic_log
      .prepare(
        `SELECT state, score_prior FROM promotion_queue
         WHERE candidate_id != 'c-existing'
         ORDER BY created_at DESC
         LIMIT 1`
      )
      .first<{ state: string; score_prior: number }>();
    expect(inserted?.state).toBe("PENDING");
    expect(inserted?.score_prior ?? 0).toBeGreaterThan(0.02);
  });
});
