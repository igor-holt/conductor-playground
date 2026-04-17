#!/usr/bin/env node

import { seedOperatorSnapshot } from "@genesis/contracts";

const statements = [
  ...seedOperatorSnapshot.promptVersions.map(
    (prompt) =>
      `INSERT OR REPLACE INTO prompt_ledger (version_id, prompt_text, status, promoted_at, proposer_hash, model)
       VALUES ('${prompt.versionId}', '${prompt.promptText.replaceAll("'", "''")}', '${prompt.status}', ${prompt.promotedAt}, '${prompt.proposerHash}', '${prompt.model}');`
  ),
  `INSERT OR REPLACE INTO quota_config (id, daily_token_limit) VALUES (1, ${seedOperatorSnapshot.quota.dailyTokenLimit});`,
];

console.log(statements.join("\n"));
