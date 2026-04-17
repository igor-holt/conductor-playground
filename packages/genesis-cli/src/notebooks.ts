import { spawnSync } from "node:child_process";
import { join } from "node:path";

import { findRepoRoot } from "./repo.js";

export function buildNotebooks() {
  const repoRoot = findRepoRoot();
  const result = spawnSync("python3", [join(repoRoot, "scripts/build_notebooks.py")], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "E_NOTEBOOK_BUILD_FAILED");
  }
  return result.stdout.trim();
}
