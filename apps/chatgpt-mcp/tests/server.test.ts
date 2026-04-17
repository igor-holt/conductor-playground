import { describe, expect, it } from "vitest";

import { fetchGenesisRecord, searchGenesisRecords } from "../src/data.js";
import { buildWidgetHtml } from "../src/widget.js";

describe("chatgpt mcp app", () => {
  it("searches Genesis records with the standard search shape", async () => {
    const results = await searchGenesisRecords("prompt");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.id).toBeTruthy();
  });

  it("fetches records by ID", async () => {
    const record = await fetchGenesisRecord("doc-retraining-spec");
    expect(record?.title).toContain("Retraining worker");
  });

  it("embeds an MCP widget shell", () => {
    const html = buildWidgetHtml();
    expect(html).toContain("Genesis Ops Widget");
    expect(html).toContain("window.openai");
  });
});
