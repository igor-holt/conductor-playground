#!/usr/bin/env node

import { runProvisionChecks } from "../dist/provision.js";

const kvStub = {
  async get() {
    return null;
  },
  async put() {},
};

const env = {
  API_KEYS: kvStub,
  METER_CURSOR: kvStub,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
  CODEOWNER_SIGNING_KEY: process.env.CODEOWNER_SIGNING_KEY,
  SLACK_WEBHOOK_URL: process.env.SLACK_WEBHOOK_URL,
  STRIPE_API_KEY: process.env.STRIPE_API_KEY,
  STRIPE_METER_EVENT_NAME: process.env.STRIPE_METER_EVENT_NAME,
  ROUTER_MODEL: process.env.ROUTER_MODEL,
  ENVIRONMENT: process.env.ENVIRONMENT,
};

const result = await runProvisionChecks(env);
if (!result.ok) {
  console.error(`${result.code}: ${result.detail}`);
  process.exit(1);
}

console.log("OK");
