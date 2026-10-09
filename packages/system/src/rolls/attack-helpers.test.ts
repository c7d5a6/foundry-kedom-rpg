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
      attackMod: 0,
      attackModLabel: "Stab attack",
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
      attackMod: 0,
      attackModLabel: "Shoot attack",
      weaponBonus: -1,
      weaponBonusLabel: "Weapon",
    });
    expect(attackBonusTotal(mods)).toBe(0);
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

  it("builds no melee mods for ranged ability when damage mod is zero", () => {
    expect(
      buildDamageModifiers({
        abilityKey: "dex",
        skillKey: "shoot",
        mightMod: 2,
        mightLabel: "Might",
        meleeDamageBonus: 1,
        meleeDamageLabel: "MDB",
        damageMod: 0,
        damageModLabel: "Shoot damage",
      }),
    ).toEqual([]);
  });

  it("adds skill damage mod on ranged when it is non-zero", () => {
    const mods = buildDamageModifiers({
      abilityKey: "dex",
      skillKey: "shoot",
      mightMod: 2,
      mightLabel: "Might",
      meleeDamageBonus: 1,
      meleeDamageLabel: "MDB",
      damageMod: 2,
      damageModLabel: "Shoot damage",
    });
    expect(mods).toHaveLength(1);
    expect(mods[0]?.value).toBe(2);
    expect(mods[0]?.source.id).toBe("skill.shoot.damageMod");
  });

  it("includes a non-zero skill attack mod", () => {
    const mods = buildAttackModifiers({
      abilityKey: "mgh",
      abilityLabel: "Might",
      abilityMod: 1,
      skillKey: "stab",
      skillLabel: "Stab",
      proficiencyBonus: 2,
      proficiencyLabel: "Trained",
      attackMod: 2,
      attackModLabel: "Stab attack",
      weaponBonus: 0,
      weaponBonusLabel: "Weapon",
    });
    expect(attackBonusTotal(mods)).toBe(5);
    expect(mods[2]?.source.id).toBe("skill.stab.attackMod");
  });
});

describe("maxDiceContribution", () => {
  it("sums max faces for NdF terms", () => {
    expect(maxDiceContribution("1d6")).toBe(6);
    expect(maxDiceContribution("2d8+1")).toBe(16);
    expect(maxDiceContribution("1d4+1d6")).toBe(10);
  });
});
