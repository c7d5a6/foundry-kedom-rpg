import { describe, expect, it } from "vitest";
import { labeledCheckFormula } from "./labeled-formula.ts";

describe("labeledCheckFormula", () => {
  it("adds Foundry flavor brackets to the die and each modifier", () => {
    expect(
      labeledCheckFormula("2d10", "Survive", [
        { label: "Focus", value: 2, source: { id: "a", label: "Focus" }, kind: "ability" },
        {
          label: "Trained",
          value: 2,
          source: { id: "s", label: "Trained" },
          kind: "skill",
        },
      ]),
    ).toBe("2d10[Survive] + 2[Focus] + 2[Trained]");
  });

  it("keeps minus signs and strips brackets inside labels", () => {
    expect(
      labeledCheckFormula("2d10", "Prowl", [
        {
          label: "Armor [heavy]",
          value: -1,
          source: { id: "a", label: "Armor" },
          kind: "armor",
        },
      ]),
    ).toBe("2d10[Prowl] - 1[Armor heavy]");
  });
});
