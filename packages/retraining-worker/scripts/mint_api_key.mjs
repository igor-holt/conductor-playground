#!/usr/bin/env node

import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";

import { sha256Hex } from "@genesis/auth";

const rawToken = process.env.GENESIS_TEST_API_KEY ?? randomBytes(24).toString("hex");
const tokenHash = await sha256Hex(rawToken);
const createdAt = Date.now();
const meterEventName = process.env.STRIPE_METER_EVENT_NAME ?? "genesis_tokens";
const record = {
  keyId: process.env.GENESIS_TEST_KEY_ID ?? `key-${createdAt}`,
  label: process.env.GENESIS_TEST_KEY_LABEL ?? "Genesis staging smoke key",
  tokenHash,
  scopes: ["a2a:invoke", "infer:invoke"],
  rateLimitPerMinute: Number(process.env.GENESIS_TEST_RATE_LIMIT ?? 10),
  meterEventName,
  active: true,
  createdAt,
};

execFileSync(
  "wrangler",
  [
    "kv",
    "key",
    "put",
    "--binding",
    "API_KEYS",
    tokenHash,
    JSON.stringify(record),
    "--config",
    "wrangler.toml",
    "--env",
    process.env.WORKER_ENVIRONMENT ?? "staging",
    "--remote",
  ],
  { stdio: "pipe" }
);

const escapedScopes = JSON.stringify(record.scopes).replaceAll("'", "''");
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
    `INSERT INTO api_keys (key_id, token_hash, label, scopes, rate_limit_per_minute, meter_event_name, active, created_at)
     VALUES ('${record.keyId}', '${record.tokenHash}', '${record.label.replaceAll("'", "''")}', '${escapedScopes}', ${record.rateLimitPerMinute}, '${record.meterEventName}', 1, ${record.createdAt})
     ON CONFLICT(key_id) DO UPDATE SET
       token_hash = excluded.token_hash,
       label = excluded.label,
       scopes = excluded.scopes,
       rate_limit_per_minute = excluded.rate_limit_per_minute,
       meter_event_name = excluded.meter_event_name,
       active = excluded.active,
       created_at = excluded.created_at;`,
  ],
  { stdio: "pipe" }
);

process.stdout.write(
  `${JSON.stringify(
    {
      rawToken,
      record,
    },
    null,
    2
  )}\n`
);
