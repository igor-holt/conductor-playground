import { getActivePrompt } from "../db.js";
import type { D1DatabaseLike, OpenAIClient } from "../types.js";

export async function runSummarizationAgent(
  db: D1DatabaseLike,
  openai: OpenAIClient,
  section: { text: string }
) {
  const active = await getActivePrompt(db);
  if (!active) {
    throw new Error("E_NO_ACTIVE_PROMPT");
  }

  const response = await openai.chatCompletion({
    model: active.model,
    messages: [
      { role: "system", content: active.promptText },
      { role: "user", content: section.text },
    ],
    temperature: 0.1,
    maxTokens: 400,
  });

  return {
    summary: response.content,
    usage: response.usage,
  };
}
