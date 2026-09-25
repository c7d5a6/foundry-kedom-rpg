import { describe, expect, it } from "vitest";
import { abilityModifier } from "./ability-mod.ts";

describe("abilityModifier", () => {
  it("maps the core 3–18 bands", () => {
    expect(abilityModifier(3)).toBe(-3);
    expect(abilityModifier(10)).toBe(0);
    expect(abilityModifier(18)).toBe(3);
  });

  it("extends Luck extremes 0–2 and 19–20", () => {
    expect(abilityModifier(0)).toBe(-3);
    expect(abilityModifier(2)).toBe(-3);
    expect(abilityModifier(19)).toBe(3);
    expect(abilityModifier(20)).toBe(3);
  });

  it("adds baseMod after the band", () => {
    expect(abilityModifier(10, 1)).toBe(1);
    expect(abilityModifier(0, -1)).toBe(-4);
  });
});
