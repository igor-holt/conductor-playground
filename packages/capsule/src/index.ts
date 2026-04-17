import { capsuleEventSchema, type CapsuleEvent } from "@genesis/contracts";

const encoder = new TextEncoder();
const secretMatchers: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /sk_[A-Za-z0-9_-]+/g, replacement: "[REDACTED_OPENAI_KEY]" },
  { pattern: /Bearer\s+[A-Za-z0-9._-]+/gi, replacement: "Bearer [REDACTED_TOKEN]" },
  { pattern: /ck_live_[A-Za-z0-9_-]+/g, replacement: "[REDACTED_STRIPE_KEY]" },
];

export interface D1PreparedStatementLike {
  bind(...values: unknown[]): D1PreparedStatementLike;
  run(): Promise<unknown>;
}

export interface D1DatabaseLike {
  prepare(sql: string): D1PreparedStatementLike;
}

export async function sha256Hex(input: string): Promise<string> {
  const buffer = await crypto.subtle.digest("SHA-256", encoder.encode(input));
  return Array.from(new Uint8Array(buffer), (value) => value.toString(16).padStart(2, "0")).join("");
}

function scrubString(value: string): string {
  return secretMatchers.reduce((current, matcher) => current.replace(matcher.pattern, matcher.replacement), value);
}

export function scrubSecrets(value: unknown): unknown {
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

export async function createRequestFingerprint(input: {
  route: string;
  requestId: string;
  tokenHash?: string;
}): Promise<string> {
  return sha256Hex(`${input.route}|${input.requestId}|${input.tokenHash ?? "anonymous"}`);
}

export async function appendCapsuleEvent(
  db: D1DatabaseLike,
  event: Omit<CapsuleEvent, "id"> & { id?: number }
): Promise<CapsuleEvent> {
  const parsed = capsuleEventSchema.parse({
    ...event,
    scrubbedPayload: scrubSecrets(event.scrubbedPayload),
  });

  await db
    .prepare(
      `INSERT INTO capsule_events
         (event_type, source, route, status_code, actor_key_id, request_fingerprint, scrubbed_payload, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      parsed.eventType,
      parsed.source,
      parsed.route ?? null,
      parsed.statusCode ?? null,
      parsed.actorKeyId ?? null,
      parsed.requestFingerprint,
      JSON.stringify(parsed.scrubbedPayload),
      parsed.createdAt
    )
    .run();

  return parsed;
}
