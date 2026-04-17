import { mkdtempSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { GenesisApiClient } from "../src/client.js";
import { loadCliConfig } from "../src/config.js";
import { findRepoRoot } from "../src/repo.js";

describe("genesis cli", () => {
  it("prefers environment config over file config", () => {
    const result = loadCliConfig({
      GENESIS_API_BASE_URL: "https://worker.example.com",
      GENESIS_ADMIN_WRITE_TOKEN: "secret",
    });
    expect(result.source).toBe("env");
    expect(result.config.apiBaseUrl).toBe("https://worker.example.com");
  });

  it("falls back to mock data when no API base is configured", async () => {
    const client = new GenesisApiClient(loadCliConfig({}));
    const active = await client.getActivePrompt();
    const cycles = await client.listCycles();
    expect(active?.status).toBe("ACTIVE");
    expect(cycles.length).toBeGreaterThan(0);
  });

  it("finds the repo root by walking to the .git marker", () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "genesis-cli-"));
    mkdirSync(join(tempRoot, ".git"));
    mkdirSync(join(tempRoot, "nested", "path"), { recursive: true });
    expect(findRepoRoot(join(tempRoot, "nested", "path"))).toBe(tempRoot);
  });
});
