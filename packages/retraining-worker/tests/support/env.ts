import { readdirSync } from "node:fs";
import { generateKeyPairSync } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { persistApiKeyRecord } from "@genesis/auth";

import { upsertApiKeyMirror } from "../../src/db.js";
import type { GenesisEnv, KVNamespaceLike } from "../../src/types.js";
import { SqliteD1Database } from "./sqliteD1.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = resolve(__dirname, "../../migrations");
const seedPath = resolve(__dirname, "../fixtures/seed.sql");

export const migrationPaths = readdirSync(migrationsDir)
  .filter((entry) => entry.endsWith(".sql"))
  .sort()
  .map((entry) => resolve(migrationsDir, entry));

export class MemoryKV implements KVNamespaceLike {
  private readonly values = new Map<string, string>();

  async get(key: string): Promise<string | null> {
    return this.values.get(key) ?? null;
  }

  async put(key: string, value: string): Promise<void> {
    this.values.set(key, value);
  }
}

export function createSigningKey() {
  const pair = generateKeyPairSync("ed25519");
  return pair.privateKey.export({ type: "pkcs8", format: "der" }).toString("base64");
}

export async function createEnv(): Promise<GenesisEnv & { API_KEYS: MemoryKV; METER_CURSOR: MemoryKV }> {
  const API_KEYS = new MemoryKV();
  const METER_CURSOR = new MemoryKV();
  const env: GenesisEnv & { API_KEYS: MemoryKV; METER_CURSOR: MemoryKV } = {
    genesis_seismic_log: SqliteD1Database.fromSqlFiles(...migrationPaths, seedPath),
    prompt_ledger_kv: new MemoryKV(),
    API_KEYS,
    METER_CURSOR,
    CODEOWNER_SIGNING_KEY: createSigningKey(),
    OPENAI_API_KEY: "test-openai-key",
    OPENAI_BASE_URL: "https://api.openai.com/v1",
    SLACK_WEBHOOK_URL: "https://hooks.slack.test/services/mock",
    STRIPE_API_KEY: "sk_test_1234567890",
    STRIPE_METER_EVENT_NAME: "genesis_tokens",
    ROUTER_MODEL: "gpt-5-mini",
    ADMIN_WRITE_TOKEN: "write-token",
  };

  await mintTestApiKey(env);
  return env;
}

export async function mintTestApiKey(
  env: GenesisEnv & { API_KEYS: MemoryKV },
  overrides?: Partial<{
    rawToken: string;
    keyId: string;
    label: string;
    scopes: string[];
    rateLimitPerMinute: number;
    meterEventName: string;
    active: boolean;
  }>
) {
  const rawToken = overrides?.rawToken ?? "genesis-test-api-key";
  const record = await persistApiKeyRecord(env.API_KEYS, {
    rawToken,
    keyId: overrides?.keyId ?? "key-test-001",
    label: overrides?.label ?? "Staging smoke key",
    scopes: overrides?.scopes ?? ["a2a:invoke", "infer:invoke"],
    rateLimitPerMinute: overrides?.rateLimitPerMinute ?? 5,
    meterEventName: overrides?.meterEventName ?? env.STRIPE_METER_EVENT_NAME ?? "genesis_tokens",
    active: overrides?.active ?? true,
    createdAt: Date.now(),
  });
  await upsertApiKeyMirror(env.genesis_seismic_log, record);
  return { rawToken, record };
}
