import { describe, expect, it } from "vitest";

import {
  createSearchIndex,
  getCycleById,
  listReferenceDocuments,
  operatorSnapshotSchema,
  searchOperatorData,
  seedOperatorSnapshot,
} from "../src/index.js";

describe("contracts", () => {
  it("parses the seeded operator snapshot", () => {
    expect(() => operatorSnapshotSchema.parse(seedOperatorSnapshot)).not.toThrow();
  });

  it("builds a unified search index", () => {
    const index = createSearchIndex();
    expect(index.some((entry) => entry.kind === "prompt")).toBe(true);
    expect(index.some((entry) => entry.kind === "document")).toBe(true);
  });

  it("searches telemetry and docs by keyword", () => {
    const results = searchOperatorData("chemical");
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((entry) => entry.kind === "cycle")).toBe(true);
  });

  it("returns reference documents and exact cycles", () => {
    const docs = listReferenceDocuments();
    expect(docs).toHaveLength(2);
    expect(getCycleById("cycle-2026-04-17-001")?.status).toBe("FAILED");
  });
});
