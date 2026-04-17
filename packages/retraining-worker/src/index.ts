import { authenticateBearerToken } from "@genesis/auth";
import { createRequestFingerprint, scrubSecrets } from "@genesis/capsule";

import {
  appendCapsuleEventRow,
  consumeRateLimitSlot,
  getActivePrompt,
  getCycle,
  getQuotaSnapshot,
  listCycles,
  listPromotions,
  listPromptVersions,
  listRollbackAudit,
  recordMeterEvent,
} from "./db.js";
import { getRuntimeConfig } from "./config.js";
import { createOpenAIClient } from "./openai.js";
import { runMetaPromptAgent } from "./orchestrator/metapromptAgent.js";
import { runRegressionWatchdog } from "./orchestrator/regressionWatchdog.js";
import { runProvisionChecks } from "./provision.js";
import { routeA2ARequest, routeInferenceRequest } from "./router.js";
import type { GenesisEnv } from "./types.js";

function json(data: unknown, init?: ResponseInit): Response {
  return Response.json(data, init);
}

function isAuthorized(env: GenesisEnv, request: Request): boolean {
  if (!env.ADMIN_WRITE_TOKEN) {
    return false;
  }
  const token = request.headers.get("authorization");
  return token === `Bearer ${env.ADMIN_WRITE_TOKEN}`;
}

function buildError(code: string, message: string, status: number, detail?: unknown): Response {
  return json(
    {
      code,
      message,
      ...(detail === undefined ? {} : { detail }),
    },
    { status }
  );
}

async function readJsonBody(request: Request): Promise<unknown> {
  return request.json().catch(() => ({}));
}

async function handleRead(env: GenesisEnv, pathname: string): Promise<Response> {
  if (pathname === "/healthz") {
    const active = await getActivePrompt(env.genesis_seismic_log);
    return json({ ok: true, activePrompt: active?.versionId ?? null });
  }
  if (pathname === "/prompts/active") {
    return json(await getActivePrompt(env.genesis_seismic_log));
  }
  if (pathname === "/prompts") {
    return json(await listPromptVersions(env.genesis_seismic_log));
  }
  if (pathname === "/promotions") {
    return json(await listPromotions(env.genesis_seismic_log));
  }
  if (pathname === "/cycles") {
    return json(await listCycles(env.genesis_seismic_log));
  }
  if (pathname.startsWith("/cycles/")) {
    const cycleId = pathname.split("/")[2];
    if (!cycleId) {
      return buildError("E_CYCLE_ID_REQUIRED", "Cycle ID is required.", 400);
    }
    return json(await getCycle(env.genesis_seismic_log, cycleId));
  }
  if (pathname === "/quota") {
    return json(await getQuotaSnapshot(env.genesis_seismic_log));
  }
  if (pathname === "/rollback-audit") {
    return json(await listRollbackAudit(env.genesis_seismic_log));
  }
  if (pathname === "/provision-check") {
    return json(await runProvisionChecks(env));
  }
  return buildError("E_NOT_FOUND", `No route for ${pathname}`, 404);
}

async function handleBillable(
  env: GenesisEnv,
  request: Request,
  pathname: "/a2a" | "/v1/infer"
): Promise<Response> {
  const authentication = await authenticateBearerToken(request.headers, env.API_KEYS);
  if (!authentication.ok) {
    return buildError(authentication.code, authentication.message, authentication.status);
  }

  const runtime = getRuntimeConfig(env);
  const rateLimit = await consumeRateLimitSlot(env.genesis_seismic_log, {
    tokenHash: authentication.tokenHash,
    route: pathname,
    limit: authentication.record.rateLimitPerMinute,
    windowMs: 60_000,
    now: Date.now(),
  });

  if (!rateLimit.allowed) {
    return json(
      {
        code: "E_RATE_LIMITED",
        message: "Rate limit exceeded.",
        retryAfterSeconds: 60,
      },
      {
        status: 429,
        headers: {
          "x-rate-limit-remaining": "0",
        },
      }
    );
  }

  const payload = await readJsonBody(request);
  const openai = createOpenAIClient(runtime.openAiApiKey, runtime.openAiBaseUrl);
  const billableResponse =
    pathname === "/a2a"
      ? await routeA2ARequest(openai, payload)
      : await routeInferenceRequest(openai, payload);

  const now = Date.now();
  const idempotencyKey = await createRequestFingerprint({
    route: pathname,
    requestId: billableResponse.requestId,
    tokenHash: authentication.tokenHash,
  });
  const meterEvent = await recordMeterEvent(env.genesis_seismic_log, {
    idempotencyKey,
    meterEventName: authentication.record.meterEventName,
    tokenHash: authentication.tokenHash,
    route: pathname,
    units: billableResponse.usage.total_tokens,
    createdAt: now,
  });

  if (env.METER_CURSOR) {
    await env.METER_CURSOR.put(
      authentication.record.keyId,
      JSON.stringify({
        idempotencyKey,
        duplicate: meterEvent.duplicate,
        createdAt: now,
      })
    );
  }

  await appendCapsuleEventRow(env.genesis_seismic_log, {
    eventType: "billable.response",
    source: "worker",
    route: pathname,
    statusCode: 200,
    actorKeyId: authentication.record.keyId,
    requestFingerprint: await createRequestFingerprint({
      route: `${pathname}:capsule`,
      requestId: `${billableResponse.requestId}:${now}`,
      tokenHash: authentication.tokenHash,
    }),
    scrubbedPayload: {
      auth: {
        keyId: authentication.record.keyId,
        tokenHash: authentication.tokenHash,
      },
      request: scrubSecrets(payload),
      response: scrubSecrets({
        requestId: billableResponse.requestId,
        route: billableResponse.route,
        model: billableResponse.model,
        usage: billableResponse.usage,
        duplicateMeterEvent: meterEvent.duplicate,
        output: billableResponse.output,
      }),
    },
    createdAt: now,
  });

  return json(
    {
      ...billableResponse,
      duplicateMeterEvent: meterEvent.duplicate,
    },
    {
      status: 200,
      headers: {
        "x-rate-limit-remaining": String(rateLimit.remaining),
      },
    }
  );
}

async function handleWrite(env: GenesisEnv, pathname: string, request: Request): Promise<Response> {
  const payload = (await readJsonBody(request)) as { dryRun?: boolean };
  const dryRun = payload.dryRun !== false;

  if (!dryRun && !isAuthorized(env, request)) {
    return buildError("E_WRITE_FORBIDDEN", "Writes require ADMIN_WRITE_TOKEN", 403);
  }

  if (pathname.startsWith("/cycles/") && pathname.endsWith("/replay")) {
    const cycleId = pathname.split("/")[2];
    if (!cycleId) {
      return buildError("E_CYCLE_ID_REQUIRED", "Cycle ID is required.", 400);
    }
    return json({
      accepted: true,
      cycleId,
      dryRun,
      message: dryRun
        ? "Replay request validated without mutating worker state."
        : "Replay request accepted for execution.",
    });
  }

  if (pathname === "/rollback") {
    return json({
      accepted: true,
      dryRun,
      message: dryRun
        ? "Rollback request validated without mutating worker state."
        : "Rollback request accepted for execution.",
    });
  }

  if (pathname.startsWith("/promotions/") && pathname.endsWith("/evaluate")) {
    const candidateId = pathname.split("/")[2];
    if (!candidateId) {
      return buildError("E_CANDIDATE_ID_REQUIRED", "Candidate ID is required.", 400);
    }
    return json({
      accepted: true,
      candidateId,
      dryRun,
      message: dryRun
        ? "Evaluation request validated without mutating worker state."
        : "Evaluation request accepted for execution.",
    });
  }

  return buildError("E_NOT_FOUND", `No route for ${pathname}`, 404);
}

export default {
  async fetch(request: Request, env: GenesisEnv): Promise<Response> {
    const url = new URL(request.url);

    try {
      if (request.method === "GET") {
        return handleRead(env, url.pathname);
      }

      if (request.method === "POST" && (url.pathname === "/a2a" || url.pathname === "/v1/infer")) {
        return handleBillable(env, request, url.pathname);
      }

      if (request.method === "POST") {
        return handleWrite(env, url.pathname, request);
      }
    } catch (error) {
      return buildError(
        "E_RUNTIME",
        error instanceof Error ? error.message : "unknown error",
        500
      );
    }

    return buildError("E_METHOD_NOT_ALLOWED", request.method, 405);
  },
  async scheduled(_: ScheduledController, env: GenesisEnv): Promise<void> {
    const runtime = getRuntimeConfig(env);
    const openai = createOpenAIClient(runtime.openAiApiKey, runtime.openAiBaseUrl);
    await runMetaPromptAgent(env, openai);
    await runRegressionWatchdog(env);
  },
};
