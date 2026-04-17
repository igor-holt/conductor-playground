// src/index.ts
import { capsuleEventSchema } from "@genesis/contracts";
var encoder = new TextEncoder();
var secretMatchers = [
  { pattern: /sk_[A-Za-z0-9_-]+/g, replacement: "[REDACTED_OPENAI_KEY]" },
  { pattern: /Bearer\s+[A-Za-z0-9._-]+/gi, replacement: "Bearer [REDACTED_TOKEN]" },
  { pattern: /ck_live_[A-Za-z0-9_-]+/g, replacement: "[REDACTED_STRIPE_KEY]" }
];
async function sha256Hex(input) {
  const buffer = await crypto.subtle.digest("SHA-256", encoder.encode(input));
  return Array.from(new Uint8Array(buffer), (value) => value.toString(16).padStart(2, "0")).join("");
}
function scrubString(value) {
  return secretMatchers.reduce((current, matcher) => current.replace(matcher.pattern, matcher.replacement), value);
}
function scrubSecrets(value) {
  if (typeof value === "string") {
    return scrubString(value);
  }
  if (Array.isArray(value)) {
    return value.map((entry) => scrubSecrets(entry));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, scrubSecrets(entry)])
    );
  }
  return value;
}
async function createRequestFingerprint(input) {
  return sha256Hex(`${input.route}|${input.requestId}|${input.tokenHash ?? "anonymous"}`);
}
async function appendCapsuleEvent(db, event) {
  const parsed = capsuleEventSchema.parse({
    ...event,
    scrubbedPayload: scrubSecrets(event.scrubbedPayload)
  });
  await db.prepare(
    `INSERT INTO capsule_events
         (event_type, source, route, status_code, actor_key_id, request_fingerprint, scrubbed_payload, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    parsed.eventType,
    parsed.source,
    parsed.route ?? null,
    parsed.statusCode ?? null,
    parsed.actorKeyId ?? null,
    parsed.requestFingerprint,
    JSON.stringify(parsed.scrubbedPayload),
    parsed.createdAt
  ).run();
  return parsed;
}
export {
  appendCapsuleEvent,
  createRequestFingerprint,
  scrubSecrets,
  sha256Hex
};
