import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import Home from "../app/page";

describe("operator web home page", () => {
  it("renders the operator dashboard shell", async () => {
    const markup = renderToStaticMarkup(await Home());
    expect(markup).toContain("Genesis Conductor");
    expect(markup).toContain("Prompt Ledger");
    expect(markup).toContain("eta_thermo");
  });
});
