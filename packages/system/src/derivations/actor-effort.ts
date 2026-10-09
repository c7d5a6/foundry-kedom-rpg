/**
 * Collect Effort inputs from a character actor's class origins + art items.
 * Thin adapter over pure effort.ts maths.
 */

import {
  PROFICIENCY_BONUS,
  type ProficiencyTier,
} from "../config/kedom.ts";
import type { ArtDataFields } from "../data/item/art.ts";
import type { OriginDataFields } from "../data/item/origin-fields.ts";
import { abilityModifier } from "./ability-mod.ts";
import {
  artSlotBudget,
  deriveEffortCurrent,
  deriveEffortMax,
  normalizeSlotsByLevel,
  sumSlotsByLevel,
  type EffortArtCommit,
} from "./effort.ts";

export type ActorEffortSummary = {
  value: number;
  max: number;
  artsOwned: number;
  artsBudget: number;
  showArtsTab: boolean;
  bothPartialsHaveEffort: boolean;
};

function classOrigins(actor: Actor.Implementation): OriginDataFields[] {
  return actor.items
    .filter((item) => (item.type as string) === "origin")
    .map((item) => item.system as unknown as OriginDataFields)
    .filter((sys) => sys.subType === "class");
}

function artCommits(actor: Actor.Implementation): EffortArtCommit[] {
  return actor.items
    .filter((item) => (item.type as string) === "art")
    .map((item) => {
      const sys = item.system as unknown as ArtDataFields;
      return {
        commitment: sys.commitment,
        activeUses: Number(sys.activeUses) || 0,
      };
    });
}

export function summarizeActorEffort(actor: Actor.Implementation): ActorEffortSummary {
  const classes = classOrigins(actor);
  const skillKeys: string[] = [];
  const abilityKeys: string[] = [];
  let slots = normalizeSlotsByLevel(undefined);
  let effortClassCount = 0;

  for (const cl of classes) {
    const skill = (cl.arts?.skillKey ?? "").trim();
    if (skill) {
      effortClassCount += 1;
      skillKeys.push(skill);
    }
    for (const k of cl.arts?.abilityKeys ?? []) {
      if (k) abilityKeys.push(k);
    }
    slots = sumSlotsByLevel(slots, normalizeSlotsByLevel(cl.arts?.slotsByLevel));
  }

  const system = actor.system as {
    abilities?: Record<string, { mod?: number; value?: number; baseMod?: number }>;
    skills?: Record<string, { proficiency?: string; proficiencyBonus?: number }>;
    details?: { level?: number };
  };

  // Effort uses ability mods and the skill's proficiency *tier* bonus (trained = 2),
  // not the check-applied bonus (which may be halved without a specialisation).
  const abilityMods = [...new Set(abilityKeys)].map((key) => {
    const ab = system.abilities?.[key];
    if (typeof ab?.mod === "number") return ab.mod;
    if (typeof ab?.value === "number") {
      return abilityModifier(ab.value, typeof ab.baseMod === "number" ? ab.baseMod : 0);
    }
    return 0;
  });
  const skillBonuses = [...new Set(skillKeys)].map((key) => {
    const sk = system.skills?.[key];
    if (!sk) return 0;
    const tier = sk.proficiency as ProficiencyTier | undefined;
    if (tier && tier in PROFICIENCY_BONUS) return PROFICIENCY_BONUS[tier];
    return typeof sk.proficiencyBonus === "number" ? sk.proficiencyBonus : 0;
  });

  const bothPartialsHaveEffort =
    classes.length >= 2 && classes.every((c) => !c.isFull) && effortClassCount >= 2;

  const max = deriveEffortMax({
    abilityMods,
    skillProficiencyBonuses: skillBonuses,
    bothPartialsHaveEffort,
  });
  const commits = artCommits(actor);
  const value = deriveEffortCurrent(max, commits);
  const level = typeof system.details?.level === "number" ? system.details.level : 1;
  const artsOwned = actor.items.filter((i) => (i.type as string) === "art").length;
  const artsBudget = artSlotBudget(slots, level);
  const showArtsTab = effortClassCount > 0 || artsOwned > 0;

  return { value, max, artsOwned, artsBudget, showArtsTab, bothPartialsHaveEffort };
}
