#!/usr/bin/env node

// src/index.ts
import { Command } from "commander";

// src/client.ts
import {
  billableResponseSchema,
  getCycleById,
  searchOperatorData,
  seedOperatorSnapshot
} from "@genesis/contracts";
async function parseJson(response) {
  if (!response.ok) {
    throw new Error(`E_HTTP_${response.status}`);
  }
  return await response.json();
}
var GenesisApiClient = class {
  constructor(configResult) {
    this.configResult = configResult;
  }
  configResult;
  doctor() {
    return {
      apiBaseUrl: this.configResult.config.apiBaseUrl ?? "mock://seedOperatorSnapshot",
      apiBaseSource: this.configResult.source,
      configPath: this.configResult.configPath,
      apiKeyConfigured: Boolean(this.configResult.config.apiKey),
      writeTokenConfigured: Boolean(this.configResult.config.adminWriteToken)
    };
  }
  isMock() {
    return !this.configResult.config.apiBaseUrl;
  }
  async getJson(path, mockFactory) {
    if (this.isMock()) {
      return mockFactory(seedOperatorSnapshot);
    }
    const response = await fetch(`${this.configResult.config.apiBaseUrl}${path}`);
    return parseJson(response);
  }
  async postJson(path, body, mockFactory, authHeader) {
    if (this.isMock()) {
      return mockFactory(seedOperatorSnapshot);
    }
    const response = await fetch(`${this.configResult.config.apiBaseUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeader ? { Authorization: authHeader } : {}
      },
      body: JSON.stringify(body)
    });
    return parseJson(response);
  }
  async getActivePrompt() {
    return this.getJson(
      "/prompts/active",
      (snapshot) => snapshot.promptVersions.find((entry) => entry.status === "ACTIVE") ?? null
    );
  }
  async listPromotions() {
    return this.getJson("/promotions", (snapshot) => snapshot.promotions);
  }
  async listCycles() {
    return this.getJson("/cycles", (snapshot) => snapshot.cycles);
  }
  async getCycle(cycleId) {
    return this.getJson(`/cycles/${cycleId}`, (snapshot) => getCycleById(cycleId, snapshot) ?? null);
  }
  async getQuota() {
    return this.getJson("/quota", (snapshot) => snapshot.quota);
  }
  async listRollbackAudit() {
    return this.getJson("/rollback-audit", (snapshot) => snapshot.rollbackAudit);
  }
  async replayCycle(cycleId, dryRun) {
    return this.postJson(
      `/cycles/${cycleId}/replay`,
      { dryRun },
      () => ({
        accepted: true,
        cycleId,
        dryRun,
        message: dryRun ? "Replay request validated without mutating worker state." : "Replay request accepted for execution."
      }),
      this.configResult.config.adminWriteToken ? `Bearer ${this.configResult.config.adminWriteToken}` : void 0
    );
  }
  async rollbackLedger(dryRun) {
    return this.postJson(
      "/rollback",
      { dryRun },
      () => ({
        accepted: true,
        dryRun,
        message: dryRun ? "Rollback request validated without mutating worker state." : "Rollback request accepted for execution."
      }),
      this.configResult.config.adminWriteToken ? `Bearer ${this.configResult.config.adminWriteToken}` : void 0
    );
  }
  async invokeA2A(input) {
    const response = await this.postJson(
      "/a2a",
      input,
      () => billableResponseSchema.parse({
        requestId: input.requestId,
        route: "/a2a",
        provider: "mock",
        model: input.model ?? "gpt-5-mini",
        output: `mock:${input.prompt}`,
        usage: {
          prompt_tokens: 1,
          completion_tokens: 1,
          total_tokens: 2
        },
        duplicateMeterEvent: false
      }),
      this.configResult.config.apiKey ? `Bearer ${this.configResult.config.apiKey}` : void 0
    );
    return billableResponseSchema.parse(response);
  }
  async invokeInfer(input) {
    const response = await this.postJson(
      "/v1/infer",
      input,
      () => billableResponseSchema.parse({
        requestId: input.requestId,
        route: "/v1/infer",
        provider: "mock",
        model: input.model ?? "gpt-5-mini",
        output: `mock:${input.input}`,
        usage: {
          prompt_tokens: 1,
          completion_tokens: 1,
          total_tokens: 2
        },
        duplicateMeterEvent: false
      }),
      this.configResult.config.apiKey ? `Bearer ${this.configResult.config.apiKey}` : void 0
    );
    return billableResponseSchema.parse(response);
  }
  async requestGet(path) {
    if (this.isMock()) {
      if (path === "/search") {
        return searchOperatorData("prompt");
      }
      if (path === "/prompts/active") {
        return this.getActivePrompt();
      }
      throw new Error("E_RAW_PATH_UNAVAILABLE_IN_MOCK_MODE");
    }
    const response = await fetch(`${this.configResult.config.apiBaseUrl}${path}`);
    return parseJson(response);
  }
};

// src/config.ts
import { existsSync, readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
function configPath() {
  return join(homedir(), ".genesis-conductor", "config.json");
}
function loadCliConfig(environment = process.env) {
  if (environment.GENESIS_API_BASE_URL || environment.GENESIS_API_KEY || environment.GENESIS_ADMIN_WRITE_TOKEN) {
    const config = {};
    if (environment.GENESIS_API_BASE_URL) {
      config.apiBaseUrl = environment.GENESIS_API_BASE_URL;
    }
    if (environment.GENESIS_API_KEY) {
      config.apiKey = environment.GENESIS_API_KEY;
    }
    if (environment.GENESIS_ADMIN_WRITE_TOKEN) {
      config.adminWriteToken = environment.GENESIS_ADMIN_WRITE_TOKEN;
    }
    return {
      config,
      source: "env",
      configPath: configPath()
    };
  }
  const path = configPath();
  if (existsSync(path)) {
    const parsed = JSON.parse(readFileSync(path, "utf8"));
    return {
      config: parsed,
      source: "file",
      configPath: path
    };
  }
  return {
    config: {},
    source: "default",
    configPath: path
  };
}

// src/notebooks.ts
import { spawnSync } from "child_process";
import { join as join3 } from "path";

// src/repo.ts
import { existsSync as existsSync2 } from "fs";
import { dirname, join as join2, resolve } from "path";
function findRepoRoot(start = process.cwd()) {
  let current = resolve(start);
  while (true) {
    if (existsSync2(join2(current, ".git"))) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) {
      throw new Error("E_REPO_ROOT_NOT_FOUND");
    }
    current = parent;
  }
}

// src/notebooks.ts
function buildNotebooks() {
  const repoRoot = findRepoRoot();
  const result = spawnSync("python3", [join3(repoRoot, "scripts/build_notebooks.py")], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "E_NOTEBOOK_BUILD_FAILED");
  }
  return result.stdout.trim();
}

// src/puf.ts
import { spawnSync as spawnSync2 } from "child_process";
import { join as join4 } from "path";
function runUvCommand(args) {
  const repoRoot = findRepoRoot();
  const result = spawnSync2("uv", args, {
    cwd: repoRoot,
    encoding: "utf8"
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "E_UV_COMMAND_FAILED");
  }
  return result.stdout.trim();
}
function runBench(outDir) {
  return runUvCommand([
    "run",
    "--project",
    join4(findRepoRoot(), "packages/puf-harness"),
    "python",
    "-m",
    "genesis_puf_harness",
    "bench",
    "--out",
    outDir
  ]);
}
function verifyProbe(outDir, intruder = false) {
  const args = [
    "run",
    "--project",
    join4(findRepoRoot(), "packages/puf-harness"),
    "python",
    "-m",
    "genesis_puf_harness",
    "probe",
    "--out",
    outDir
  ];
  if (intruder) {
    args.push("--intruder");
  }
  return runUvCommand(args);
}

// src/index.ts
function printResult(jsonMode, value) {
  if (jsonMode) {
    process.stdout.write(`${JSON.stringify(value, null, 2)}
`);
    return;
  }
  if (typeof value === "string") {
    process.stdout.write(`${value}
`);
    return;
  }
  process.stdout.write(`${JSON.stringify(value, null, 2)}
`);
}
function withClient(handler) {
  return async function wrapped() {
    const options = this.optsWithGlobals();
    const client = new GenesisApiClient(loadCliConfig());
    const value = await handler(client, Boolean(options.json));
    printResult(Boolean(options.json), value);
  };
}
var program = new Command();
program.name("genesis-conductor").option("--json", "Emit machine-readable JSON");
program.command("doctor").description("Inspect CLI config, API source, and write-token availability.").action(
  withClient(async (client) => {
    return client.doctor();
  })
);
var prompts = program.command("prompts").description("Inspect prompt ledger state.");
prompts.command("active").description("Show the active prompt version.").action(withClient(async (client) => client.getActivePrompt()));
var promotions = program.command("promotions").description("Inspect promotion candidates.");
promotions.command("list").description("List pending and historical promotion candidates.").action(withClient(async (client) => client.listPromotions()));
var cycles = program.command("cycles").description("Inspect retraining cycles.");
cycles.command("list").description("List retraining cycles.").action(withClient(async (client) => client.listCycles()));
cycles.command("get").argument("<cycle-id>").description("Get one cycle by ID.").action(async function action(cycleId) {
  const options = this.optsWithGlobals();
  const client = new GenesisApiClient(loadCliConfig());
  printResult(Boolean(options.json), await client.getCycle(cycleId));
});
cycles.command("replay").argument("<cycle-id>").option("--dry-run", "Validate the replay request without executing it.", true).description("Validate or request a cycle replay.").action(async function action2(cycleId, commandOptions) {
  const options = this.optsWithGlobals();
  const client = new GenesisApiClient(loadCliConfig());
  printResult(Boolean(options.json), await client.replayCycle(cycleId, commandOptions.dryRun !== false));
});
var ledger = program.command("ledger").description("Inspect ledger safety actions.");
ledger.command("rollback").option("--dry-run", "Validate the rollback request without executing it.", true).description("Validate or request a prompt ledger rollback.").action(async function action3(commandOptions) {
  const options = this.optsWithGlobals();
  const client = new GenesisApiClient(loadCliConfig());
  printResult(Boolean(options.json), await client.rollbackLedger(commandOptions.dryRun !== false));
});
var a2a = program.command("a2a").description("Invoke the billable A2A route.");
a2a.command("replay").requiredOption("--prompt <text>", "Prompt text to replay against /a2a").option("--request-id <id>", "Stable request ID for replay", "a2a-cli-replay").option("--model <model>", "Model override").description("Replay a canonical A2A request against the configured API.").action(async function action4(commandOptions) {
  const options = this.optsWithGlobals();
  const client = new GenesisApiClient(loadCliConfig());
  printResult(
    Boolean(options.json),
    await client.invokeA2A({
      requestId: commandOptions.requestId,
      prompt: commandOptions.prompt,
      ...commandOptions.model ? { model: commandOptions.model } : {}
    })
  );
});
var infer = program.command("infer").description("Invoke the billable /v1/infer route.");
infer.command("run").requiredOption("--input <text>", "Input text to send to /v1/infer").option("--request-id <id>", "Stable request ID for idempotency checks", "infer-cli-run").option("--model <model>", "Model override").description("Run a billable inference request against the configured API.").action(async function action5(commandOptions) {
  const options = this.optsWithGlobals();
  const client = new GenesisApiClient(loadCliConfig());
  printResult(
    Boolean(options.json),
    await client.invokeInfer({
      requestId: commandOptions.requestId,
      input: commandOptions.input,
      ...commandOptions.model ? { model: commandOptions.model } : {}
    })
  );
});
var quota = program.command("quota").description("Inspect quota burn.");
quota.command("burn").description("Show token burn against the daily limit.").action(withClient(async (client) => client.getQuota()));
var puf = program.command("puf").description("Run eta_thermo sim harness commands.");
var bench = puf.command("bench").description("Run deterministic bench flow.");
bench.command("run").requiredOption("--out <dir>", "Directory for bench artifacts").description("Run the bench flow and emit hash-only artifacts.").action(function action6() {
  const options = this.opts();
  printResult(Boolean(this.optsWithGlobals().json), runBench(options.out));
});
var probe = puf.command("probe").description("Run deterministic probe checks.");
probe.command("verify").requiredOption("--out <dir>", "Directory for probe artifacts").option("--intruder", "Run the intruder-device fail-closed path", false).description("Verify the probe status and emit a hash-only artifact.").action(function action7() {
  const options = this.opts();
  printResult(
    Boolean(this.optsWithGlobals().json),
    verifyProbe(options.out, options.intruder)
  );
});
var notebooks = program.command("notebooks").description("Build local notebook artifacts.");
notebooks.command("build").description("Generate the eval-ablation and puf-validation notebooks.").action(function action8() {
  printResult(Boolean(this.optsWithGlobals().json), buildNotebooks());
});
var request = program.command("request").description("Raw read-only API escape hatch.");
request.command("get").argument("<path>").description("Execute a GET request against the configured API base URL.").action(async function action9(path) {
  const options = this.optsWithGlobals();
  const client = new GenesisApiClient(loadCliConfig());
  printResult(Boolean(options.json), await client.requestGet(path));
});
program.parseAsync(process.argv).catch((error) => {
  const message = error instanceof Error ? error.message : "unknown error";
  process.stderr.write(`${message}
`);
  process.exitCode = 1;
});
