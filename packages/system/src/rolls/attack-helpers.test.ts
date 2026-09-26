import { describe, expect, it } from "vitest";
import {
  attackBonusTotal,
  attackHits,
  buildAttackModifiers,
  buildDamageModifiers,
  luckCostToHit,
  maxDiceContribution,
  meleeDamageFlatBonus,
} from "./attack-helpers.ts";

describe("buildAttackModifiers", () => {
  it("includes ability and skill proficiency", () => {
    const mods = buildAttackModifiers({
      abilityKey: "mgh",
      abilityLabel: "Might",
      abilityMod: 2,
      skillKey: "stab",
      skillLabel: "Stab",
      proficiencyBonus: 2,
      proficiencyLabel: "Trained",
      attackBonus: 0,
      attackBonusLabel: "AB",
      weaponBonus: 0,
      weaponBonusLabel: "Weapon",
    });
    expect(mods).toHaveLength(2);
    expect(attackBonusTotal(mods)).toBe(4);
  });

  it("includes non-zero actor and weapon bonuses", () => {
    const mods = buildAttackModifiers({
      abilityKey: "dex",
      abilityLabel: "Dexterity",
      abilityMod: 1,
      skillKey: "shoot",
      skillLabel: "Shoot",
      proficiencyBonus: 0,
      proficiencyLabel: "Apprentice",
      attackBonus: 3,
      attackBonusLabel: "AB",
      weaponBonus: -1,
      weaponBonusLabel: "Weapon",
    });
    expect(attackBonusTotal(mods)).toBe(3);
  });
});

describe("attackHits / luckCostToHit", () => {
  it("returns null hit and cost when AC unknown", () => {
    expect(attackHits(15, null)).toBeNull();
    expect(luckCostToHit(15, null)).toBeNull();
  });

  it("detects hit and miss", () => {
    expect(attackHits(14, 14)).toBe(true);
    expect(attackHits(13, 14)).toBe(false);
  });

  it("costs luck equal to the gap on a miss", () => {
    expect(luckCostToHit(12, 15)).toBe(3);
    expect(luckCostToHit(15, 15)).toBeNull();
  });
});

describe("meleeDamageFlatBonus / buildDamageModifiers", () => {
  it("adds Might + meleeDamageBonus only for mgh-linked skills", () => {
    expect(meleeDamageFlatBonus("mgh", 2, 1)).toBe(3);
    expect(meleeDamageFlatBonus("dex", 2, 1)).toBe(0);
  });

  it("builds no damage mods for ranged ability", () => {
    expect(
      buildDamageModifiers({
        abilityKey: "dex",
        mightMod: 2,
        mightLabel: "Might",
        meleeDamageBonus: 1,
        meleeDamageLabel: "MDB",
      }),
    ).toEqual([]);
  });
});

describe("maxDiceContribution", () => {
  it("sums max faces for NdF terms", () => {
    expect(maxDiceContribution("1d6")).toBe(6);
    expect(maxDiceContribution("2d8+1")).toBe(16);
    expect(maxDiceContribution("1d4+1d6")).toBe(10);
  });
});
