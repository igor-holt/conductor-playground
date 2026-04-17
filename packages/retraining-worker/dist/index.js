import {
  getRuntimeConfig,
  runProvisionChecks
} from "./chunk-X4JVF5H5.js";
import {
  appendCapsuleEventRow,
  autoRollback,
  consumeRateLimitSlot,
  getActivePrompt,
  getCycle,
  getQuotaSnapshot,
  hdDeriveCandidateId,
  insertPromotionCandidate,
  listCycles,
  listFeedbackForCycles,
  listPromotions,
  listPromptVersions,
  listRecentFailures,
  listRollbackAudit,
  recordMeterEvent,
  sha256Hex
} from "./chunk-IMDUZPGF.js";

// src/index.ts
import { authenticateBearerToken } from "@genesis/auth";
import { createRequestFingerprint, scrubSecrets } from "@genesis/capsule";

// src/openai.ts
function requireContentType(response) {
  if (!response.ok) {
    throw new Error(`E_OPENAI_${response.status}`);
  }
}
function createOpenAIClient(apiKey, baseUrl, fetchImpl = fetch) {
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json"
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
          response_format: input.responseFormat
        })
      });
      requireContentType(response);
      const payload = await response.json();
      const content = payload.choices?.[0]?.message?.content?.trim();
      if (!content) {
        throw new Error("E_OPENAI_EMPTY_RESPONSE");
      }
      return {
        content,
        usage: {
          prompt_tokens: payload.usage?.prompt_tokens ?? 0,
          completion_tokens: payload.usage?.completion_tokens ?? 0,
          total_tokens: payload.usage?.total_tokens ?? 0
        }
      };
    },
    async embedding(input) {
      const response = await fetchImpl(`${baseUrl}/embeddings`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: input.model,
          input: input.text
        })
      });
      requireContentType(response);
      const payload = await response.json();
      const embedding = payload.data?.[0]?.embedding;
      if (!embedding) {
        throw new Error("E_OPENAI_EMPTY_EMBEDDING");
      }
      return embedding;
    }
  };
}

// src/orchestrator/metapromptAgent.ts
import { promotionCandidateSchema } from "@genesis/contracts";

// src/runtimeConfig.ts
var retrainingConfig = {
  convergence: { standardCycles: 3, escalatedCycles: 5 },
  eval: {
    lenientPassRatio: 0.75,
    lenientAverage: 0.85,
    targetWords: 100
  },
  metaprompt: {
    model: "gpt-5",
    minImprovementFloor: 0.02,
    maxRetries: 3
  },
  regressionWatchdog: {
    windowCycles: 3,
    degradeThreshold: 0.85,
    degradeCountRequired: 3,
    residualDriftThreshold: 0.02
  },
  modelCandidates: ["gpt-5", "gpt-5-mini"]
};

// src/orchestrator/metapromptAgent.ts
function heuristicPriorScore(oldPrompt, newPrompt, feedback) {
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
async function synthesizeImprovedPrompt(openai, input) {
  const system = [
    "You are a prompt-optimization agent.",
    "Given an original system prompt and structured grader feedback describing failure modes,",
    "produce a revised system prompt that preserves all invariants, addresses each failure signal,",
    "and adds no speculative scope. Return only the revised prompt text."
  ].join(" ");
  const response = await openai.chatCompletion({
    model: retrainingConfig.metaprompt.model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: JSON.stringify(input, null, 2) }
    ],
    temperature: 0.2
  });
  return response.content;
}
async function runMetaPromptAgent(env, openai) {
  const failures = await listRecentFailures(env.genesis_seismic_log, Date.now() - 72e5);
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
    feedback: feedbackRows
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
    ttlCycles: 2
  });
  await insertPromotionCandidate(env.genesis_seismic_log, candidate);
  return { proposed: 1, candidateId: candidate.candidateId };
}

// src/orchestrator/regressionWatchdog.ts
async function runRegressionWatchdog(env, options) {
  const active = await getActivePrompt(env.genesis_seismic_log);
  if (!active) {
    return { rolledBack: false, reason: "no_active_prompt" };
  }
  const cycles = (await listCycles(env.genesis_seismic_log)).filter((cycle) => cycle.executedAt > active.promotedAt).sort((lhs, rhs) => lhs.executedAt - rhs.executedAt).slice(0, retrainingConfig.regressionWatchdog.windowCycles);
  if (cycles.length < retrainingConfig.regressionWatchdog.windowCycles) {
    return { rolledBack: false, reason: "window_incomplete" };
  }
  const degradedCycles = cycles.filter(
    (cycle) => cycle.averageScore < retrainingConfig.regressionWatchdog.degradeThreshold || cycle.residualDrift > retrainingConfig.regressionWatchdog.residualDriftThreshold
  ).length;
  if (degradedCycles >= retrainingConfig.regressionWatchdog.degradeCountRequired) {
    const rollbackInput = {
      reason: "regression_watchdog",
      fromVersion: active.versionId
    };
    if (options?.fetchImpl) {
      rollbackInput.fetchImpl = options.fetchImpl;
    }
    await autoRollback(env, rollbackInput);
    return { rolledBack: true };
  }
  return { rolledBack: false };
}

// src/router.ts
import {
  a2aRequestSchema,
  billableResponseSchema,
  inferRequestSchema
} from "@genesis/contracts";
function buildA2AMessages(input) {
  if (input.messages?.length) {
    return input.messages;
  }
  return [{ role: "user", content: input.prompt ?? "" }];
}
async function runDelegatedInference(openai, input) {
  const model = input.model ?? "gpt-5-mini";
  const response = await openai.chatCompletion({
    model,
    messages: input.messages.filter((message) => message.content.trim().length > 0).map((message) => ({
      role: message.role === "assistant" ? "user" : message.role,
      content: message.content
    })),
    temperature: 0.2
  });
  return billableResponseSchema.parse({
    requestId: input.requestId,
    route: input.route,
    provider: "openai-compatible",
    model,
    output: response.content,
    usage: response.usage,
    duplicateMeterEvent: false
  });
}
async function routeA2ARequest(openai, payload) {
  const parsed = a2aRequestSchema.parse(payload);
  return runDelegatedInference(openai, {
    requestId: parsed.requestId,
    messages: buildA2AMessages(parsed),
    route: "/a2a",
    ...parsed.model ? { model: parsed.model } : {}
  });
}
async function routeInferenceRequest(openai, payload) {
  const parsed = inferRequestSchema.parse(payload);
  return runDelegatedInference(openai, {
    requestId: parsed.requestId,
    messages: [{ role: "user", content: parsed.input }],
    route: "/v1/infer",
    ...parsed.model ? { model: parsed.model } : {}
  });
}

// src/index.ts
function json(data, init) {
  return Response.json(data, init);
}
function isAuthorized(env, request) {
  if (!env.ADMIN_WRITE_TOKEN) {
    return false;
  }
  const token = request.headers.get("authorization");
  return token === `Bearer ${env.ADMIN_WRITE_TOKEN}`;
}
function buildError(code, message, status, detail) {
  return json(
    {
      code,
      message,
      ...detail === void 0 ? {} : { detail }
    },
    { status }
  );
}
async function readJsonBody(request) {
  return request.json().catch(() => ({}));
}
async function handleRead(env, pathname) {
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
async function handleBillable(env, request, pathname) {
  const authentication = await authenticateBearerToken(request.headers, env.API_KEYS);
  if (!authentication.ok) {
    return buildError(authentication.code, authentication.message, authentication.status);
  }
  const runtime = getRuntimeConfig(env);
  const rateLimit = await consumeRateLimitSlot(env.genesis_seismic_log, {
    tokenHash: authentication.tokenHash,
    route: pathname,
    limit: authentication.record.rateLimitPerMinute,
    windowMs: 6e4,
    now: Date.now()
  });
  if (!rateLimit.allowed) {
    return json(
      {
        code: "E_RATE_LIMITED",
        message: "Rate limit exceeded.",
        retryAfterSeconds: 60
      },
      {
        status: 429,
        headers: {
          "x-rate-limit-remaining": "0"
        }
      }
    );
  }
  const payload = await readJsonBody(request);
  const openai = createOpenAIClient(runtime.openAiApiKey, runtime.openAiBaseUrl);
  const billableResponse = pathname === "/a2a" ? await routeA2ARequest(openai, payload) : await routeInferenceRequest(openai, payload);
  const now = Date.now();
  const idempotencyKey = await createRequestFingerprint({
    route: pathname,
    requestId: billableResponse.requestId,
    tokenHash: authentication.tokenHash
  });
  const meterEvent = await recordMeterEvent(env.genesis_seismic_log, {
    idempotencyKey,
    meterEventName: authentication.record.meterEventName,
    tokenHash: authentication.tokenHash,
    route: pathname,
    units: billableResponse.usage.total_tokens,
    createdAt: now
  });
  if (env.METER_CURSOR) {
    await env.METER_CURSOR.put(
      authentication.record.keyId,
      JSON.stringify({
        idempotencyKey,
        duplicate: meterEvent.duplicate,
        createdAt: now
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
      tokenHash: authentication.tokenHash
    }),
    scrubbedPayload: {
      auth: {
        keyId: authentication.record.keyId,
        tokenHash: authentication.tokenHash
      },
      request: scrubSecrets(payload),
      response: scrubSecrets({
        requestId: billableResponse.requestId,
        route: billableResponse.route,
        model: billableResponse.model,
        usage: billableResponse.usage,
        duplicateMeterEvent: meterEvent.duplicate,
        output: billableResponse.output
      })
    },
    createdAt: now
  });
  return json(
    {
      ...billableResponse,
      duplicateMeterEvent: meterEvent.duplicate
    },
    {
      status: 200,
      headers: {
        "x-rate-limit-remaining": String(rateLimit.remaining)
      }
    }
  );
}
async function handleWrite(env, pathname, request) {
  const payload = await readJsonBody(request);
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
      message: dryRun ? "Replay request validated without mutating worker state." : "Replay request accepted for execution."
    });
  }
  if (pathname === "/rollback") {
    return json({
      accepted: true,
      dryRun,
      message: dryRun ? "Rollback request validated without mutating worker state." : "Rollback request accepted for execution."
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
      message: dryRun ? "Evaluation request validated without mutating worker state." : "Evaluation request accepted for execution."
    });
  }
  return buildError("E_NOT_FOUND", `No route for ${pathname}`, 404);
}
var index_default = {
  async fetch(request, env) {
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
  async scheduled(_, env) {
    const runtime = getRuntimeConfig(env);
    const openai = createOpenAIClient(runtime.openAiApiKey, runtime.openAiBaseUrl);
    await runMetaPromptAgent(env, openai);
    await runRegressionWatchdog(env);
  }
};
export {
  index_default as default
};
