import { getActivePrompt, listCycles } from "../db.js";
import { retrainingConfig } from "../runtimeConfig.js";
import { autoRollback } from "../scripts/autoRollbackCore.js";
import type { GenesisEnv } from "../types.js";

export async function runRegressionWatchdog(
  env: GenesisEnv,
  options?: { fetchImpl?: typeof fetch }
) {
  const active = await getActivePrompt(env.genesis_seismic_log);
  if (!active) {
    return { rolledBack: false, reason: "no_active_prompt" };
  }

  const cycles = (await listCycles(env.genesis_seismic_log))
    .filter((cycle) => cycle.executedAt > active.promotedAt)
    .sort((lhs, rhs) => lhs.executedAt - rhs.executedAt)
    .slice(0, retrainingConfig.regressionWatchdog.windowCycles);

  if (cycles.length < retrainingConfig.regressionWatchdog.windowCycles) {
    return { rolledBack: false, reason: "window_incomplete" };
  }

  const degradedCycles = cycles.filter(
    (cycle) =>
      cycle.averageScore < retrainingConfig.regressionWatchdog.degradeThreshold ||
      cycle.residualDrift > retrainingConfig.regressionWatchdog.residualDriftThreshold
  ).length;

  if (degradedCycles >= retrainingConfig.regressionWatchdog.degradeCountRequired) {
    const rollbackInput: Parameters<typeof autoRollback>[1] = {
      reason: "regression_watchdog",
      fromVersion: active.versionId,
    };
    if (options?.fetchImpl) {
      rollbackInput.fetchImpl = options.fetchImpl;
    }
    await autoRollback(env, rollbackInput);
    return { rolledBack: true };
  }

  return { rolledBack: false };
}
