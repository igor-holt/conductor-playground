import { getMissingSecrets, getRuntimeConfig } from "./config.js";
import type { GenesisEnv } from "./types.js";

export async function runProvisionChecks(
  env: GenesisEnv,
  options?: { fetchImpl?: typeof fetch }
): Promise<{ ok: true } | { ok: false; code: string; detail: string }> {
  const missingBindings = ["API_KEYS", "METER_CURSOR"].filter((binding) => {
    const value = env[binding as keyof GenesisEnv];
    return !value || typeof value !== "object";
  });
  if (missingBindings.length > 0) {
    return {
      ok: false,
      code: "E_MISSING_BINDINGS",
      detail: missingBindings.join(","),
    };
  }

  const missing = getMissingSecrets(env);
  if (missing.length > 0) {
    return {
      ok: false,
      code: "E_MISSING_SECRETS",
      detail: missing.join(","),
    };
  }

  const config = getRuntimeConfig(env);
  try {
    const response = await (options?.fetchImpl ?? fetch)(config.slackWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "[provision] canary ping — ignore" }),
    });
    if (!response.ok) {
      return {
        ok: false,
        code: "E_SLACK_WEBHOOK_UNREACHABLE",
        detail: `status ${response.status}`,
      };
    }
  } catch (error) {
    return {
      ok: false,
      code: "E_SLACK_WEBHOOK_TIMEOUT",
      detail: error instanceof Error ? error.message : "unknown error",
    };
  }

  return { ok: true };
}
