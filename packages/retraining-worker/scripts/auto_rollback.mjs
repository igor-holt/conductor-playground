#!/usr/bin/env node

import { autoRollback } from "../dist/autoRollbackCore.js";

const reason = process.argv[2] ?? "manual";
const fromVersion = process.argv[3] ?? "unknown";

const env = {
  genesis_seismic_log: globalThis.__GENESIS_DB__,
  CODEOWNER_SIGNING_KEY: process.env.CODEOWNER_SIGNING_KEY,
  SLACK_WEBHOOK_URL: process.env.SLACK_WEBHOOK_URL,
};

if (!env.genesis_seismic_log) {
  console.error("E_DB_UNAVAILABLE: auto_rollback.mjs expects an injected D1-compatible database.");
  process.exit(1);
}

const result = await autoRollback(env, { reason, fromVersion });
console.log(JSON.stringify(result, null, 2));
