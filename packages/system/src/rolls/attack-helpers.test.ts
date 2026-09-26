import { describe, expect, it } from "vitest";
import {
  attackBonusTotal,
  attackHits,
  buildAttackModifiers,
  buildDamageModifiers,
  killingBlowAttackProficiency,
  killingBlowDamageBonus,
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
      weaponBonus: 0,
      weaponBonusLabel: "Weapon",
    });
    expect(mods).toHaveLength(2);
    expect(attackBonusTotal(mods)).toBe(4);
  });

  it("includes non-zero weapon bonus", () => {
    const mods = buildAttackModifiers({
      abilityKey: "dex",
      abilityLabel: "Dexterity",
      abilityMod: 1,
      skillKey: "shoot",
      skillLabel: "Shoot",
      proficiencyBonus: 0,
      proficiencyLabel: "Apprentice",
      weaponBonus: -1,
      weaponBonusLabel: "Weapon",
    });
    expect(attackBonusTotal(mods)).toBe(0);
  });
});

describe("killingBlowAttackProficiency / killingBlowDamageBonus", () => {
  it("doubles positive proficiency on attack", () => {
    expect(killingBlowAttackProficiency(2)).toBe(4);
    expect(killingBlowAttackProficiency(4)).toBe(8);
  });

  it("leaves zero and negative attack proficiency unchanged", () => {
    expect(killingBlowAttackProficiency(0)).toBe(0);
    expect(killingBlowAttackProficiency(-2)).toBe(-2);
  });

  it("adds only positive proficiency to damage", () => {
    expect(killingBlowDamageBonus(2)).toBe(2);
    expect(killingBlowDamageBonus(0)).toBe(0);
    expect(killingBlowDamageBonus(-2)).toBe(0);
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

  it("builds no melee mods for ranged ability without Killing Blow", () => {
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

  it("adds Killing Blow damage on ranged when bonus is positive", () => {
    const mods = buildDamageModifiers({
      abilityKey: "dex",
      mightMod: 2,
      mightLabel: "Might",
      meleeDamageBonus: 1,
      meleeDamageLabel: "MDB",
      killingBlowBonus: 2,
      killingBlowLabel: "Killing Blow",
    });
    expect(mods).toHaveLength(1);
    expect(mods[0]?.value).toBe(2);
  });
});

describe("maxDiceContribution", () => {
  it("sums max faces for NdF terms", () => {
    expect(maxDiceContribution("1d6")).toBe(6);
    expect(maxDiceContribution("2d8+1")).toBe(16);
    expect(maxDiceContribution("1d4+1d6")).toBe(10);
  });
});
