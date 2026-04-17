// src/index.ts
import { apiKeyRecordSchema } from "@genesis/contracts";
var encoder = new TextEncoder();
async function sha256Hex(input) {
  const buffer = await crypto.subtle.digest("SHA-256", encoder.encode(input));
  return Array.from(new Uint8Array(buffer), (value) => value.toString(16).padStart(2, "0")).join("");
}
function extractBearerToken(headers) {
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
async function persistApiKeyRecord(store, input) {
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
    createdAt: input.createdAt
  });
  await store.put(tokenHash, JSON.stringify(record));
  return record;
}
async function authenticateBearerToken(headers, store) {
  if (!store) {
    return {
      ok: false,
      status: 500,
      code: "E_API_KEY_STORE_UNAVAILABLE",
      message: "API_KEYS binding is not configured."
    };
  }
  const rawToken = extractBearerToken(headers);
  if (!rawToken) {
    return {
      ok: false,
      status: 401,
      code: "E_AUTH_REQUIRED",
      message: "Bearer token required."
    };
  }
  const tokenHash = await sha256Hex(rawToken);
  const stored = await store.get(tokenHash);
  if (!stored) {
    return {
      ok: false,
      status: 401,
      code: "E_API_KEY_UNKNOWN",
      message: "API key not found."
    };
  }
  const record = apiKeyRecordSchema.parse(JSON.parse(stored));
  if (!record.active) {
    return {
      ok: false,
      status: 403,
      code: "E_API_KEY_INACTIVE",
      message: "API key inactive."
    };
  }
  return {
    ok: true,
    rawToken,
    tokenHash,
    record
  };
}
export {
  authenticateBearerToken,
  extractBearerToken,
  persistApiKeyRecord,
  sha256Hex
};
