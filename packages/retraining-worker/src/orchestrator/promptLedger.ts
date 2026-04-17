import { getActivePrompt, revertToVersion } from "../db.js";
import type { D1DatabaseLike } from "../types.js";

export async function getActive(db: D1DatabaseLike) {
  return getActivePrompt(db);
}

export async function revertPromptLedgerToVersion(db: D1DatabaseLike, versionId: string) {
  return revertToVersion(db, versionId);
}
