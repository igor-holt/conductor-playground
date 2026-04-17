import { retrainingConfig } from "../runtimeConfig.js";
import type { OpenAIClient } from "../types.js";

const perGraderThresholds = {
  chemical_name: 0.8,
  word_length: 0.85,
  cosine_sim: 0.85,
  llm_judge: 0.85,
} as const;

function normalizeWordCount(summary: string): number {
  return summary.trim().split(/\s+/).filter(Boolean).length;
}

function chemicalNameGrader(sectionText: string, summary: string): number {
  const names = [
    ...sectionText.matchAll(/\b[A-Z][a-z]*(?:-[A-Z0-9]+)+\b|\b\d{2,7}-\d{2}-\d\b/g),
  ].map((match) => match[0]);
  if (names.length === 0) {
    return 1;
  }
  const present = names.filter((name) => summary.includes(name)).length;
  return present / names.length;
}

function wordLengthGrader(summary: string): number {
  const target = retrainingConfig.eval.targetWords;
  const deviation = Math.abs(normalizeWordCount(summary) - target) / target;
  if (deviation <= 0.2) {
    return 1;
  }
  return Math.max(0, 1 - (deviation - 0.2) * 2);
}

async function cosineSimilarityGrader(
  openai: OpenAIClient,
  source: string,
  summary: string
): Promise<number> {
  const [lhs, rhs] = await Promise.all([
    openai.embedding({ model: "text-embedding-3-small", text: source.slice(0, 8000) }),
    openai.embedding({ model: "text-embedding-3-small", text: summary.slice(0, 8000) }),
  ]);

  let dot = 0;
  let lhsNorm = 0;
  let rhsNorm = 0;
  for (let index = 0; index < lhs.length; index += 1) {
    dot += lhs[index]! * rhs[index]!;
    lhsNorm += lhs[index]! ** 2;
    rhsNorm += rhs[index]! ** 2;
  }

  return dot / (Math.sqrt(lhsNorm) * Math.sqrt(rhsNorm) || 1);
}

async function llmJudgeGrader(
  openai: OpenAIClient,
  sectionText: string,
  summary: string
): Promise<number> {
  const rubric = `Score the summary against the source on a 0.0-1.0 scale.
1.0=flawless, 0.75-0.99=excellent, 0.5-0.75=good-but-imperfect,
0.3-0.5=significant gaps, 0.0-0.3=major omissions.
Return ONLY a JSON object: {"score": <float>}`;

  const response = await openai.chatCompletion({
    model: "gpt-4.1",
    messages: [
      { role: "system", content: rubric },
      { role: "user", content: `SOURCE:\n${sectionText}\n\nSUMMARY:\n${summary}` },
    ],
    temperature: 0,
    responseFormat: { type: "json_object" },
  });

  try {
    const parsed = JSON.parse(response.content) as { score?: number };
    return parsed.score ?? 0;
  } catch {
    return 0;
  }
}

export async function runEvalPipeline(
  openai: OpenAIClient,
  input: { section: { text: string }; summary: string }
) {
  const scores = {
    chemical_name: chemicalNameGrader(input.section.text, input.summary),
    word_length: wordLengthGrader(input.summary),
    cosine_sim: await cosineSimilarityGrader(openai, input.section.text, input.summary),
    llm_judge: await llmJudgeGrader(openai, input.section.text, input.summary),
  };

  const values = Object.values(scores);
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  const passCount = Object.entries(scores).filter(
    ([grader, score]) => score >= perGraderThresholds[grader as keyof typeof perGraderThresholds]
  ).length;
  const passRatio = passCount / values.length;

  return {
    scores,
    average,
    lenientPass:
      passRatio >= retrainingConfig.eval.lenientPassRatio &&
      average >= retrainingConfig.eval.lenientAverage,
  };
}
