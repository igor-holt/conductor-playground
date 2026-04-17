import { spawnSync } from "node:child_process";
import { join } from "node:path";

import { findRepoRoot } from "./repo.js";

function runUvCommand(args: string[]) {
  const repoRoot = findRepoRoot();
  const result = spawnSync("uv", args, {
    cwd: repoRoot,
    encoding: "utf8",
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "E_UV_COMMAND_FAILED");
  }

  return result.stdout.trim();
}

export function runBench(outDir: string) {
  return runUvCommand([
    "run",
    "--project",
    join(findRepoRoot(), "packages/puf-harness"),
    "python",
    "-m",
    "genesis_puf_harness",
    "bench",
    "--out",
    outDir,
  ]);
}

export function verifyProbe(outDir: string, intruder = false) {
  const args = [
    "run",
    "--project",
    join(findRepoRoot(), "packages/puf-harness"),
    "python",
    "-m",
    "genesis_puf_harness",
    "probe",
    "--out",
    outDir,
  ];
  if (intruder) {
    args.push("--intruder");
  }
  return runUvCommand(args);
}
