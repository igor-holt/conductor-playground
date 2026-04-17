import type { GenesisEnv } from "./types.js";

export const REQUIRED_SECRETS = [
  "CODEOWNER_SIGNING_KEY",
  "OPENAI_API_KEY",
  "SLACK_WEBHOOK_URL",
  "STRIPE_API_KEY",
  "STRIPE_METER_EVENT_NAME",
] as const;

export type RequiredSecret = (typeof REQUIRED_SECRETS)[number];

export interface RuntimeConfig {
  openAiApiKey: string;
  openAiBaseUrl: string;
  codeownerSigningKey: string;
  slackWebhookUrl: string;
  stripeApiKey: string;
  stripeMeterEventName: string;
  adminWriteToken?: string;
  environment: string;
  routerModel: string;
}

export function getMissingSecrets(env: GenesisEnv): RequiredSecret[] {
  return REQUIRED_SECRETS.filter((key) => {
    const value = env[key];
    return typeof value !== "string" || value.trim().length === 0;
  });
}

export function getRuntimeConfig(env: GenesisEnv): RuntimeConfig {
  const missing = getMissingSecrets(env);
  if (missing.length > 0) {
    throw new Error(`E_MISSING_SECRETS:${missing.join(",")}`);
  }

  const runtime: RuntimeConfig = {
    openAiApiKey: env.OPENAI_API_KEY!,
    openAiBaseUrl: env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
    codeownerSigningKey: env.CODEOWNER_SIGNING_KEY!,
    slackWebhookUrl: env.SLACK_WEBHOOK_URL!,
    stripeApiKey: env.STRIPE_API_KEY!,
    stripeMeterEventName: env.STRIPE_METER_EVENT_NAME!,
    environment: env.ENVIRONMENT ?? "development",
    routerModel: env.ROUTER_MODEL ?? "gpt-5-mini",
  };

  if (env.ADMIN_WRITE_TOKEN) {
    runtime.adminWriteToken = env.ADMIN_WRITE_TOKEN;
  }

  return runtime;
}
