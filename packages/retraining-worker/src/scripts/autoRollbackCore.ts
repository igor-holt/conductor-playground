import { createRequestFingerprint } from "@genesis/capsule";

import { appendCapsuleEventRow, latestRollbackTarget, revertToVersion, writeRollbackAudit } from "../db.js";
import { signPayload } from "../utils/crypto.js";
import type { GenesisEnv } from "../types.js";

export async function autoRollback(
  env: GenesisEnv,
  input: { reason: string; fromVersion: string; fetchImpl?: typeof fetch }
) {
  const targetVersion = await latestRollbackTarget(env.genesis_seismic_log);
  if (!targetVersion) {
    throw new Error("E_NO_ROLLBACK_TARGET");
  }

  await revertToVersion(env.genesis_seismic_log, targetVersion);

  const audit = {
    reason: input.reason,
    from: input.fromVersion,
    to: targetVersion,
    ts: Date.now(),
  };
  const signature = await signPayload(JSON.stringify(audit), env.CODEOWNER_SIGNING_KEY ?? "");
  await writeRollbackAudit(env.genesis_seismic_log, audit, signature, audit.ts);
  await appendCapsuleEventRow(env.genesis_seismic_log, {
    eventType: "rollback.completed",
    source: "watchdog",
    route: "/rollback",
    statusCode: 200,
    actorKeyId: null,
    requestFingerprint: await createRequestFingerprint({
      route: "/rollback",
      requestId: `${input.fromVersion}:${audit.ts}`,
    }),
    scrubbedPayload: audit,
    createdAt: audit.ts,
  });

  if (env.SLACK_WEBHOOK_URL) {
    await (input.fetchImpl ?? fetch)(env.SLACK_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `P1 Auto-Rollback Executed: ${JSON.stringify(audit)}`,
      }),
    });
  }

  return audit;
}
