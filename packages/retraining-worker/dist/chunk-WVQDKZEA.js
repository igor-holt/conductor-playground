// src/config.ts
var REQUIRED_SECRETS = [
  "CODEOWNER_SIGNING_KEY",
  "OPENAI_API_KEY",
  "SLACK_WEBHOOK_URL"
];
function getMissingSecrets(env) {
  return REQUIRED_SECRETS.filter((key) => {
    const value = env[key];
    return typeof value !== "string" || value.trim().length === 0;
  });
}
function getRuntimeConfig(env) {
  const missing = getMissingSecrets(env);
  if (missing.length > 0) {
    throw new Error(`E_MISSING_SECRETS:${missing.join(",")}`);
  }
  const runtime = {
    openAiApiKey: env.OPENAI_API_KEY,
    openAiBaseUrl: env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
    codeownerSigningKey: env.CODEOWNER_SIGNING_KEY,
    slackWebhookUrl: env.SLACK_WEBHOOK_URL,
    environment: env.ENVIRONMENT ?? "development"
  };
  if (env.ADMIN_WRITE_TOKEN) {
    runtime.adminWriteToken = env.ADMIN_WRITE_TOKEN;
  }
  return runtime;
}

// src/provision.ts
async function runProvisionChecks(env, options) {
  const missing = getMissingSecrets(env);
  if (missing.length > 0) {
    return {
      ok: false,
      code: "E_MISSING_SECRETS",
      detail: missing.join(",")
    };
  }
  const config = getRuntimeConfig(env);
  try {
    const response = await (options?.fetchImpl ?? fetch)(config.slackWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "[provision] canary ping \u2014 ignore" })
    });
    if (!response.ok) {
      return {
        ok: false,
        code: "E_SLACK_WEBHOOK_UNREACHABLE",
        detail: `status ${response.status}`
      };
    }
  } catch (error) {
    return {
      ok: false,
      code: "E_SLACK_WEBHOOK_TIMEOUT",
      detail: error instanceof Error ? error.message : "unknown error"
    };
  }
  return { ok: true };
}

export {
  getRuntimeConfig,
  runProvisionChecks
};
