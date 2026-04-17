#!/usr/bin/env node

import { execFileSync } from "node:child_process";

import { createRequestFingerprint, scrubSecrets } from "@genesis/capsule";

const service = process.env.DEPLOY_SERVICE_NAME ?? "genesis-retraining-worker-staging";
const route = process.env.DEPLOY_ROUTE ?? "/deploy";
const endpointUrl = process.env.DEPLOY_ENDPOINT_URL ?? "";
const createdAt = Date.now();
const requestFingerprint = await createRequestFingerprint({
  route,
  requestId: `${service}:${createdAt}`,
});
const payload = scrubSecrets({
  service,
  endpointUrl,
  environment: process.env.WORKER_ENVIRONMENT ?? "staging",
});
const scrubbedPayload = JSON.stringify(payload).replaceAll("'", "''");

execFileSync(
  "wrangler",
  [
    "d1",
    "execute",
    process.env.GENESIS_D1_NAME ?? "genesis-seismic-log-staging",
    "--config",
    "wrangler.toml",
    "--env",
    process.env.WORKER_ENVIRONMENT ?? "staging",
    "--remote",
    "--command",
    `INSERT INTO capsule_events
       (event_type, source, route, status_code, actor_key_id, request_fingerprint, scrubbed_payload, created_at)
     VALUES
       ('deploy.completed', 'ci', '${route}', 200, '${service}', '${requestFingerprint}', '${scrubbedPayload}', ${createdAt});`,
  ],
  { stdio: "inherit" }
);
