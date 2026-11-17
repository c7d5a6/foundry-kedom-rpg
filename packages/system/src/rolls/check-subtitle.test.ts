import { describe, expect, it } from "vitest";
import { checkSubtitle } from "./check-subtitle.ts";

describe("checkSubtitle", () => {
  it("names the next outcome and the total that reaches it", () => {
    // Trained: 11-15 is a cost, 16+ is a success.
    expect(checkSubtitle(12, "trained")).toEqual({ next: { kind: "success", at: 16 } });
    // 10 or less fails; one more point is a cost.
    expect(checkSubtitle(7, "trained")).toEqual({ next: { kind: "cost", at: 11 } });
  });

  it("is null at the top of the ladder", () => {
    expect(checkSubtitle(40, "trained")).toEqual({ next: null });
  });
});
