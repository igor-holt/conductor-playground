import type { OpenAIClient } from "./types.js";

interface FetchLike {
  (input: string, init?: RequestInit): Promise<Response>;
}

function requireContentType(response: Response): void {
  if (!response.ok) {
    throw new Error(`E_OPENAI_${response.status}`);
  }
}

export function createOpenAIClient(
  apiKey: string,
  baseUrl: string,
  fetchImpl: FetchLike = fetch
): OpenAIClient {
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  return {
    async chatCompletion(input) {
      const response = await fetchImpl(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: input.model,
          messages: input.messages,
          temperature: input.temperature ?? 0,
          max_tokens: input.maxTokens,
          response_format: input.responseFormat,
        }),
      });

      requireContentType(response);
      const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: {
          prompt_tokens?: number;
          completion_tokens?: number;
          total_tokens?: number;
        };
      };

      const content = payload.choices?.[0]?.message?.content?.trim();
      if (!content) {
        throw new Error("E_OPENAI_EMPTY_RESPONSE");
      }

      return {
        content,
        usage: {
          prompt_tokens: payload.usage?.prompt_tokens ?? 0,
          completion_tokens: payload.usage?.completion_tokens ?? 0,
          total_tokens: payload.usage?.total_tokens ?? 0,
        },
      };
    },
    async embedding(input) {
      const response = await fetchImpl(`${baseUrl}/embeddings`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: input.model,
          input: input.text,
        }),
      });

      requireContentType(response);
      const payload = (await response.json()) as {
        data?: Array<{ embedding?: number[] }>;
      };
      const embedding = payload.data?.[0]?.embedding;
      if (!embedding) {
        throw new Error("E_OPENAI_EMPTY_EMBEDDING");
      }
      return embedding;
    },
  };
}
