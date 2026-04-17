import {
  a2aRequestSchema,
  billableResponseSchema,
  inferRequestSchema,
  type A2ARequest,
  type BillableResponse,
} from "@genesis/contracts";

import type { OpenAIClient } from "./types.js";

function buildA2AMessages(input: A2ARequest) {
  if (input.messages?.length) {
    return input.messages;
  }

  return [{ role: "user" as const, content: input.prompt ?? "" }];
}

async function runDelegatedInference(
  openai: OpenAIClient,
  input: {
    requestId: string;
    model?: string;
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
    route: "/a2a" | "/v1/infer";
  }
): Promise<BillableResponse> {
  const model = input.model ?? "gpt-5-mini";
  const response = await openai.chatCompletion({
    model,
    messages: input.messages
      .filter((message) => message.content.trim().length > 0)
      .map((message) => ({
        role: message.role === "assistant" ? ("user" as const) : message.role,
        content: message.content,
      })),
    temperature: 0.2,
  });

  return billableResponseSchema.parse({
    requestId: input.requestId,
    route: input.route,
    provider: "openai-compatible",
    model,
    output: response.content,
    usage: response.usage,
    duplicateMeterEvent: false,
  });
}

export async function routeA2ARequest(
  openai: OpenAIClient,
  payload: unknown
): Promise<BillableResponse> {
  const parsed = a2aRequestSchema.parse(payload);
  return runDelegatedInference(openai, {
    requestId: parsed.requestId,
    messages: buildA2AMessages(parsed),
    route: "/a2a",
    ...(parsed.model ? { model: parsed.model } : {}),
  });
}

export async function routeInferenceRequest(
  openai: OpenAIClient,
  payload: unknown
): Promise<BillableResponse> {
  const parsed = inferRequestSchema.parse(payload);
  return runDelegatedInference(openai, {
    requestId: parsed.requestId,
    messages: [{ role: "user", content: parsed.input }],
    route: "/v1/infer",
    ...(parsed.model ? { model: parsed.model } : {}),
  });
}
