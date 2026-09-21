import { describe, expect, it } from "vitest";
import {
  buildSkillCheck,
  formatSignedBonus,
  skillCheckIsSpecialized,
} from "./build-skill-check.ts";

describe("skillCheckIsSpecialized", () => {
  it("is always specialized when the skill has no specialisations", () => {
    expect(skillCheckIsSpecialized("none", false)).toBe(true);
  });

  it("follows whether a specialisation was chosen otherwise", () => {
    expect(skillCheckIsSpecialized("fixed", false)).toBe(false);
    expect(skillCheckIsSpecialized("fixed", true)).toBe(true);
    expect(skillCheckIsSpecialized("free", true)).toBe(true);
  });
});

describe("buildSkillCheck", () => {
  const base = {
    skillKey: "survive",
    skillLabel: "Survive",
    abilityKey: "foc",
    abilityLabel: "Focus",
    abilityMod: 2,
    proficiency: "trained" as const,
    proficiencyLabel: "Trained (half)",
    specializationSlug: null,
    specializationLabel: null,
  };

  it("sums ability and half proficiency for an unspecialized check", () => {
    const { modifiers, bonus } = buildSkillCheck({ ...base, specialized: false });
    expect(modifiers.map((m) => m.value)).toEqual([2, 1]);
    expect(bonus).toBe(3);
    expect(formatSignedBonus(bonus)).toBe("+3");
  });

  it("sums ability and full proficiency for a specialized check", () => {
    const { modifiers, bonus } = buildSkillCheck({
      ...base,
      specialized: true,
      proficiencyLabel: "Tracking",
      specializationSlug: "survive.tracking",
      specializationLabel: "Tracking",
    });
    expect(modifiers.map((m) => m.value)).toEqual([2, 2]);
    expect(bonus).toBe(4);
  });

  it("uses the same sum as folding modifiers (no parallel formula)", () => {
    const built = buildSkillCheck({ ...base, specialized: false });
    expect(built.bonus).toBe(built.modifiers.reduce((n, m) => n + m.value, 0));
  });
});
