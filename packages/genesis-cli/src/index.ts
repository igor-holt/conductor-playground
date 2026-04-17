#!/usr/bin/env node
import { Command } from "commander";

import { GenesisApiClient } from "./client.js";
import { loadCliConfig } from "./config.js";
import { buildNotebooks } from "./notebooks.js";
import { runBench, verifyProbe } from "./puf.js";

function printResult(jsonMode: boolean, value: unknown): void {
  if (jsonMode) {
    process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
    return;
  }

  if (typeof value === "string") {
    process.stdout.write(`${value}\n`);
    return;
  }

  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function withClient<T>(handler: (client: GenesisApiClient, jsonMode: boolean) => Promise<T>) {
  return async function wrapped(this: Command) {
    const options = this.optsWithGlobals<{ json?: boolean }>();
    const client = new GenesisApiClient(loadCliConfig());
    const value = await handler(client, Boolean(options.json));
    printResult(Boolean(options.json), value);
  };
}

const program = new Command();
program
  .name("genesis-conductor")
  .option("--json", "Emit machine-readable JSON");

program
  .command("doctor")
  .description("Inspect CLI config, API source, and write-token availability.")
  .action(
    withClient(async (client) => {
      return client.doctor();
    })
  );

const prompts = program.command("prompts").description("Inspect prompt ledger state.");
prompts
  .command("active")
  .description("Show the active prompt version.")
  .action(withClient(async (client) => client.getActivePrompt()));

const promotions = program.command("promotions").description("Inspect promotion candidates.");
promotions
  .command("list")
  .description("List pending and historical promotion candidates.")
  .action(withClient(async (client) => client.listPromotions()));

const cycles = program.command("cycles").description("Inspect retraining cycles.");
cycles
  .command("list")
  .description("List retraining cycles.")
  .action(withClient(async (client) => client.listCycles()));
cycles
  .command("get")
  .argument("<cycle-id>")
  .description("Get one cycle by ID.")
  .action(async function action(cycleId: string) {
    const options = this.optsWithGlobals<{ json?: boolean }>();
    const client = new GenesisApiClient(loadCliConfig());
    printResult(Boolean(options.json), await client.getCycle(cycleId));
  });
cycles
  .command("replay")
  .argument("<cycle-id>")
  .option("--dry-run", "Validate the replay request without executing it.", true)
  .description("Validate or request a cycle replay.")
  .action(async function action(cycleId: string, commandOptions: { dryRun?: boolean }) {
    const options = this.optsWithGlobals<{ json?: boolean }>();
    const client = new GenesisApiClient(loadCliConfig());
    printResult(Boolean(options.json), await client.replayCycle(cycleId, commandOptions.dryRun !== false));
  });

const ledger = program.command("ledger").description("Inspect ledger safety actions.");
ledger
  .command("rollback")
  .option("--dry-run", "Validate the rollback request without executing it.", true)
  .description("Validate or request a prompt ledger rollback.")
  .action(async function action(commandOptions: { dryRun?: boolean }) {
    const options = this.optsWithGlobals<{ json?: boolean }>();
    const client = new GenesisApiClient(loadCliConfig());
    printResult(Boolean(options.json), await client.rollbackLedger(commandOptions.dryRun !== false));
  });

const a2a = program.command("a2a").description("Invoke the billable A2A route.");
a2a
  .command("replay")
  .requiredOption("--prompt <text>", "Prompt text to replay against /a2a")
  .option("--request-id <id>", "Stable request ID for replay", "a2a-cli-replay")
  .option("--model <model>", "Model override")
  .description("Replay a canonical A2A request against the configured API.")
  .action(async function action(commandOptions: { prompt: string; requestId: string; model?: string }) {
    const options = this.optsWithGlobals<{ json?: boolean }>();
    const client = new GenesisApiClient(loadCliConfig());
    printResult(
      Boolean(options.json),
      await client.invokeA2A({
        requestId: commandOptions.requestId,
        prompt: commandOptions.prompt,
        ...(commandOptions.model ? { model: commandOptions.model } : {}),
      })
    );
  });

const infer = program.command("infer").description("Invoke the billable /v1/infer route.");
infer
  .command("run")
  .requiredOption("--input <text>", "Input text to send to /v1/infer")
  .option("--request-id <id>", "Stable request ID for idempotency checks", "infer-cli-run")
  .option("--model <model>", "Model override")
  .description("Run a billable inference request against the configured API.")
  .action(async function action(commandOptions: { input: string; requestId: string; model?: string }) {
    const options = this.optsWithGlobals<{ json?: boolean }>();
    const client = new GenesisApiClient(loadCliConfig());
    printResult(
      Boolean(options.json),
      await client.invokeInfer({
        requestId: commandOptions.requestId,
        input: commandOptions.input,
        ...(commandOptions.model ? { model: commandOptions.model } : {}),
      })
    );
  });

const quota = program.command("quota").description("Inspect quota burn.");
quota
  .command("burn")
  .description("Show token burn against the daily limit.")
  .action(withClient(async (client) => client.getQuota()));

const puf = program.command("puf").description("Run eta_thermo sim harness commands.");
const bench = puf.command("bench").description("Run deterministic bench flow.");
bench
  .command("run")
  .requiredOption("--out <dir>", "Directory for bench artifacts")
  .description("Run the bench flow and emit hash-only artifacts.")
  .action(function action(this: Command) {
    const options = this.opts<{ out: string }>();
    printResult(Boolean(this.optsWithGlobals<{ json?: boolean }>().json), runBench(options.out));
  });

const probe = puf.command("probe").description("Run deterministic probe checks.");
probe
  .command("verify")
  .requiredOption("--out <dir>", "Directory for probe artifacts")
  .option("--intruder", "Run the intruder-device fail-closed path", false)
  .description("Verify the probe status and emit a hash-only artifact.")
  .action(function action(this: Command) {
    const options = this.opts<{ out: string; intruder?: boolean }>();
    printResult(
      Boolean(this.optsWithGlobals<{ json?: boolean }>().json),
      verifyProbe(options.out, options.intruder)
    );
  });

const notebooks = program.command("notebooks").description("Build local notebook artifacts.");
notebooks
  .command("build")
  .description("Generate the eval-ablation and puf-validation notebooks.")
  .action(function action(this: Command) {
    printResult(Boolean(this.optsWithGlobals<{ json?: boolean }>().json), buildNotebooks());
  });

const request = program.command("request").description("Raw read-only API escape hatch.");
request
  .command("get")
  .argument("<path>")
  .description("Execute a GET request against the configured API base URL.")
  .action(async function action(path: string) {
    const options = this.optsWithGlobals<{ json?: boolean }>();
    const client = new GenesisApiClient(loadCliConfig());
    printResult(Boolean(options.json), await client.requestGet(path));
  });

program.parseAsync(process.argv).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "unknown error";
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
