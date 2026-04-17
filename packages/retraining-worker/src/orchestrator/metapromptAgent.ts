import { promotionCandidateSchema } from "@genesis/contracts";

import { getActivePrompt, insertPromotionCandidate, listFeedbackForCycles, listRecentFailures } from "../db.js";
import { retrainingConfig } from "../runtimeConfig.js";
import { hdDeriveCandidateId, sha256Hex } from "../utils/crypto.js";
import type { GenesisEnv, OpenAIClient } from "../types.js";

function heuristicPriorScore(oldPrompt: string, newPrompt: string, feedback: Array<{ grader: string; score: number }>) {
  const failingGraders = new Set(feedback.filter((entry) => entry.score < 0.85).map((entry) => entry.grader));
  let addressed = 0;
  for (const grader of failingGraders) {
    const normalized = grader.replace(/[^a-z0-9]/gi, "");
    const variants = [grader, grader.replace(/[_-]+/g, " "), normalized];
    if (variants.some((variant) => variant.length > 0 && newPrompt.toLowerCase().includes(variant.toLowerCase()))) {
      addressed += 1;
    }
  }

  const coverage = failingGraders.size === 0 ? 0.5 : addressed / failingGraders.size;
  const lengthRatio = newPrompt.length / Math.max(oldPrompt.length, 1);
  const lengthPenalty = lengthRatio > 2 ? (lengthRatio - 2) * 0.15 : 0;
  return Math.max(0, Math.min(1, coverage - lengthPenalty));
}

async function synthesizeImprovedPrompt(
  openai: OpenAIClient,
  input: {
    originalPrompt: string;
    feedback: Array<{ sectionId: string; grader: string; score: number; reasoning: string }>;
  }
) {
  const system = [
    "You are a prompt-optimization agent.",
    "Given an original system prompt and structured grader feedback describing failure modes,",
    "produce a revised system prompt that preserves all invariants, addresses each failure signal,",
    "and adds no speculative scope. Return only the revised prompt text.",
  ].join(" ");

  const response = await openai.chatCompletion({
    model: retrainingConfig.metaprompt.model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: JSON.stringify(input, null, 2) },
    ],
    temperature: 0.2,
  });

  return response.content;
}

export async function runMetaPromptAgent(env: GenesisEnv, openai: OpenAIClient) {
  const failures = await listRecentFailures(env.genesis_seismic_log, Date.now() - 7_200_000);
  if (failures.length === 0) {
    return { proposed: 0 };
  }

  const active = await getActivePrompt(env.genesis_seismic_log);
  if (!active) {
    return { proposed: 0, reason: "E_NO_ACTIVE_PROMPT" };
  }

  const feedbackRows = await listFeedbackForCycles(
    env.genesis_seismic_log,
    failures.map((failure) => failure.cycle_id)
  );

  if (feedbackRows.length === 0) {
    return { proposed: 0, reason: "E_NO_FEEDBACK" };
  }

  const improvedPrompt = await synthesizeImprovedPrompt(openai, {
    originalPrompt: active.promptText,
    feedback: feedbackRows,
  });

  if (!improvedPrompt || improvedPrompt === active.promptText) {
    return { proposed: 0, reason: "E_NO_DELTA" };
  }

  const scorePrior = heuristicPriorScore(active.promptText, improvedPrompt, feedbackRows);
  if (scorePrior < retrainingConfig.metaprompt.minImprovementFloor) {
    return { proposed: 0, reason: "E_BELOW_FLOOR" };
  }

  const createdAt = Date.now();
  const candidate = promotionCandidateSchema.parse({
    candidateId: await hdDeriveCandidateId(createdAt, env.CODEOWNER_SIGNING_KEY ?? ""),
    proposerHash: await sha256Hex(
      `${improvedPrompt}${retrainingConfig.metaprompt.model}${JSON.stringify(feedbackRows)}`
    ),
    promptText: improvedPrompt,
    model: retrainingConfig.metaprompt.model,
    sourceFeedback: feedbackRows.map(
      (row) => `${row.sectionId}:${row.grader}:${row.score.toFixed(2)}:${row.reasoning}`
    ),
    state: "PENDING",
    scorePrior,
    createdAt,
    ttlCycles: 2,
  });

  await insertPromotionCandidate(env.genesis_seismic_log, candidate);

  return { proposed: 1, candidateId: candidate.candidateId };
}
