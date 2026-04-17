import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export interface CliConfig {
  apiBaseUrl?: string;
  apiKey?: string;
  adminWriteToken?: string;
}

export interface CliConfigResult {
  config: CliConfig;
  source: "env" | "file" | "default";
  configPath: string;
}

export function configPath(): string {
  return join(homedir(), ".genesis-conductor", "config.json");
}

export function loadCliConfig(environment: NodeJS.ProcessEnv = process.env): CliConfigResult {
  if (environment.GENESIS_API_BASE_URL || environment.GENESIS_API_KEY || environment.GENESIS_ADMIN_WRITE_TOKEN) {
    const config: CliConfig = {};
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
      configPath: configPath(),
    };
  }

  const path = configPath();
  if (existsSync(path)) {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as CliConfig;
    return {
      config: parsed,
      source: "file",
      configPath: path,
    };
  }

  return {
    config: {},
    source: "default",
    configPath: path,
  };
}
