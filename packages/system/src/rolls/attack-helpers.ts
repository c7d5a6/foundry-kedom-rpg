import type { Modifier } from "./collectors.ts";
import { sumModifiers } from "./build-skill-check.ts";

export type AttackModInput = {
  abilityKey: string;
  abilityLabel: string;
  abilityMod: number;
  skillKey: string;
  skillLabel: string;
  proficiencyBonus: number;
  proficiencyLabel: string;
  weaponBonus: number;
  weaponBonusLabel: string;
};

/** Double positive proficiency for Killing Blow attack rolls; leave ≤0 unchanged. */
export function killingBlowAttackProficiency(base: number): number {
  return base > 0 ? base * 2 : base;
}

/** Positive proficiency only adds to Killing Blow damage. */
export function killingBlowDamageBonus(base: number): number {
  return base > 0 ? base : 0;
}

/** True when the actor owns a talent with featureKey killingBlow. */
export function actorHasKillingBlow(actor: Actor.Implementation): boolean {
  for (const item of actor.items) {
    if ((item.type as string) !== "talent") continue;
    const featureKey = (item.system as { featureKey?: string } | undefined)?.featureKey;
    if (featureKey === "killingBlow") return true;
  }
  return false;
}

/** Build attack flat modifiers (ability + skill proficiency + weapon AB). */
export function buildAttackModifiers(input: AttackModInput): Modifier[] {
  const mods: Modifier[] = [
    {
      label: input.abilityLabel,
      value: input.abilityMod,
      source: { id: `ability.${input.abilityKey}`, label: input.abilityLabel },
      kind: "ability",
    },
    {
      label: input.proficiencyLabel,
      value: input.proficiencyBonus,
      source: { id: `skill.${input.skillKey}.proficiency`, label: input.skillLabel },
      kind: "skill",
    },
  ];
  if (input.weaponBonus !== 0) {
    mods.push({
      label: input.weaponBonusLabel,
      value: input.weaponBonus,
      source: { id: "weapon.attackBonus", label: input.weaponBonusLabel },
      kind: "effect",
    });
  }
  return mods;
}

export function attackBonusTotal(modifiers: readonly Modifier[]): number {
  return sumModifiers(modifiers);
}

/** `null` when AC unknown; otherwise whether total meets or beats AC. */
export function attackHits(total: number, ac: number | null): boolean | null {
  if (ac === null) return null;
  return total >= ac;
}

/**
 * Luck needed to reach AC on a miss. `null` when AC unknown, already hitting,
 * or cost would be 0.
 */
export function luckCostToHit(total: number, ac: number | null): number | null {
  if (ac === null) return null;
  const cost = ac - total;
  return cost > 0 ? cost : null;
}

/** Flat damage add-ons: Might mod + meleeDamageBonus when the skill uses Might. */
export function meleeDamageFlatBonus(
  abilityKey: string,
  mightMod: number,
  meleeDamageBonus: number,
): number {
  if (abilityKey !== "mgh") return 0;
  return mightMod + meleeDamageBonus;
}

export function buildDamageModifiers(input: {
  abilityKey: string;
  mightMod: number;
  mightLabel: string;
  meleeDamageBonus: number;
  meleeDamageLabel: string;
  killingBlowBonus?: number;
  killingBlowLabel?: string;
}): Modifier[] {
  const mods: Modifier[] = [];
  if (input.abilityKey === "mgh") {
    if (input.mightMod !== 0) {
      mods.push({
        label: input.mightLabel,
        value: input.mightMod,
        source: { id: "ability.mgh", label: input.mightLabel },
        kind: "ability",
      });
    }
    if (input.meleeDamageBonus !== 0) {
      mods.push({
        label: input.meleeDamageLabel,
        value: input.meleeDamageBonus,
        source: { id: "combat.meleeDamageBonus", label: input.meleeDamageLabel },
        kind: "effect",
      });
    }
  }
  const kb = input.killingBlowBonus ?? 0;
  if (kb > 0) {
    mods.push({
      label: input.killingBlowLabel ?? "Killing Blow",
      value: kb,
      source: { id: "talent.killingBlow", label: input.killingBlowLabel ?? "Killing Blow" },
      kind: "effect",
    });
  }
  return mods;
}

/**
 * Sum of maximum faces for every `NdF` term in a dice formula (e.g. `2d6+1` → 12).
 * Flat numeric terms are ignored — add those via modifiers separately.
 */
export function maxDiceContribution(formula: string): number {
  let sum = 0;
  for (const match of formula.matchAll(/(\d*)d(\d+)/gi)) {
    const count = match[1] === "" || match[1] === undefined ? 1 : Number(match[1]);
    const faces = Number(match[2]);
    if (Number.isFinite(count) && Number.isFinite(faces)) sum += count * faces;
  }
  return sum;
}
