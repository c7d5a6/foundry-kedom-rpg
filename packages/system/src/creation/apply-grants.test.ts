import { describe, expect, it } from "vitest";
import { maxProficiencyTier, mergeSpecializationGrants } from "./apply-grants.ts";

describe("maxProficiencyTier", () => {
  it("picks the higher tier", () => {
    expect(maxProficiencyTier("untrained", "trained")).toBe("trained");
    expect(maxProficiencyTier("expert", "apprentice")).toBe("expert");
    expect(maxProficiencyTier("trained", "trained")).toBe("trained");
  });
});

describe("mergeSpecializationGrants", () => {
  it("appends new slugs as selected", () => {
    const merged = mergeSpecializationGrants(
      [{ slug: "craft.smith", label: "Smith", selected: true }],
      [{ slug: "craft.armorer", label: "Armorer" }],
    );
    expect(merged).toHaveLength(2);
    expect(merged.find((s) => s.slug === "craft.armorer")).toEqual({
      slug: "craft.armorer",
      label: "Armorer",
      selected: true,
    });
  });

  it("selects an existing slug without duplicating", () => {
    const merged = mergeSpecializationGrants(
      [{ slug: "craft.smith", label: "Smith", selected: false }],
      [{ slug: "craft.smith", label: "Blacksmith" }],
    );
    expect(merged).toHaveLength(1);
    expect(merged[0]).toEqual({
      slug: "craft.smith",
      label: "Blacksmith",
      selected: true,
    });
  });
});
