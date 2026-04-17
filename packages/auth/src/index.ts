import { apiKeyRecordSchema, type ApiKeyRecord } from "@genesis/contracts";

const encoder = new TextEncoder();

export interface HeaderLike {
  get(name: string): string | null;
}

export interface ApiKeyStore {
  get(key: string): Promise<string | null>;
  put?(key: string, value: string): Promise<void>;
}

export interface AuthSuccess {
  ok: true;
  rawToken: string;
  tokenHash: string;
  record: ApiKeyRecord;
}

export interface AuthFailure {
  ok: false;
  status: number;
  code: string;
  message: string;
}

export async function sha256Hex(input: string): Promise<string> {
  const buffer = await crypto.subtle.digest("SHA-256", encoder.encode(input));
  return Array.from(new Uint8Array(buffer), (value) => value.toString(16).padStart(2, "0")).join("");
}

export function extractBearerToken(headers: HeaderLike): string | null {
  const authorization = headers.get("authorization") ?? headers.get("Authorization");
  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.trim().split(/\s+/, 2);
  if (!scheme || !token || scheme.toLowerCase() !== "bearer") {
    return null;
  }

  return token;
}

export async function persistApiKeyRecord(
  store: ApiKeyStore,
  input: Omit<ApiKeyRecord, "tokenHash"> & { rawToken: string }
): Promise<ApiKeyRecord> {
  if (!store.put) {
    throw new Error("E_API_KEY_STORE_READ_ONLY");
  }

  const tokenHash = await sha256Hex(input.rawToken);
  const record = apiKeyRecordSchema.parse({
    keyId: input.keyId,
    label: input.label,
    tokenHash,
    scopes: input.scopes,
    rateLimitPerMinute: input.rateLimitPerMinute,
    meterEventName: input.meterEventName,
    active: input.active,
    createdAt: input.createdAt,
  });

  await store.put(tokenHash, JSON.stringify(record));
  return record;
}

export async function authenticateBearerToken(
  headers: HeaderLike,
  store?: ApiKeyStore
): Promise<AuthSuccess | AuthFailure> {
  if (!store) {
    return {
      ok: false,
      status: 500,
      code: "E_API_KEY_STORE_UNAVAILABLE",
      message: "API_KEYS binding is not configured.",
    };
  }

  const rawToken = extractBearerToken(headers);
  if (!rawToken) {
    return {
      ok: false,
      status: 401,
      code: "E_AUTH_REQUIRED",
      message: "Bearer token required.",
    };
  }

  const tokenHash = await sha256Hex(rawToken);
  const stored = await store.get(tokenHash);
  if (!stored) {
    return {
      ok: false,
      status: 401,
      code: "E_API_KEY_UNKNOWN",
      message: "API key not found.",
    };
  }

  const record = apiKeyRecordSchema.parse(JSON.parse(stored) as unknown);
  if (!record.active) {
    return {
      ok: false,
      status: 403,
      code: "E_API_KEY_INACTIVE",
      message: "API key inactive.",
    };
  }

  return {
    ok: true,
    rawToken,
    tokenHash,
    record,
  };
}
