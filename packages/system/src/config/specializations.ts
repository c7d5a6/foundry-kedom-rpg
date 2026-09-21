import type { SkillKey } from "./kedom.ts";

/** How a skill takes specialisations (docs/rules/20-skills.md). */
export type SpecializationKind = "none" | "free" | "fixed";

export const SKILL_SPECIALIZATION_KIND: Record<SkillKey, SpecializationKind> = {
  arcana: "free",
  connect: "free",
  conduct: "fixed",
  convince: "fixed",
  craft: "free",
  exert: "none",
  guile: "fixed",
  heal: "fixed",
  investigate: "fixed",
  lore: "free",
  notice: "fixed",
  prowl: "fixed",
  punch: "none",
  shoot: "none",
  stab: "none",
  survive: "fixed",
  travel: "fixed",
  work: "free",
  worship: "free",
};

/** Fixed specialisation leaf keys per skill (slug = `${skill}.${leaf}`). */
export const SKILL_FIXED_SPECIALIZATIONS: Partial<Record<SkillKey, readonly string[]>> = {
  conduct: ["bureaucracy", "etiquette", "law", "organizations", "politics", "rumors", "streetwise"],
  convince: [
    "charm",
    "command",
    "deception",
    "haggle",
    "intimidation",
    "performance",
    "persuasion",
  ],
  guile: ["disguise", "forgery", "fraud", "gambling", "poisons", "traps"],
  heal: [
    "diagnosis",
    "firstAid",
    "pharmacology",
    "psychology",
    "rehabilitation",
    "surgery",
    "toxicology",
  ],
  investigate: ["appraisal", "cryptography", "investigation", "libraryUse", "research", "search"],
  notice: ["anomalies", "awareness", "detail", "farsight", "hidden", "insight", "listen"],
  prowl: ["backstabbing", "climbing", "hide", "lockpicking", "sleightOfHand", "sneaking"],
  survive: ["foraging", "scouting", "shelter", "tracking"],
  travel: ["hiking", "riding", "driving", "sailing", "exotic", "navigation", "orientation"],
};

export function specializationSlug(skillKey: SkillKey, leaf: string): string {
  return `${skillKey}.${leaf}`;
}

/** Slug for a free-form specialisation label; frozen after creation. */
export function freeSpecializationSlug(skillKey: SkillKey, label: string): string {
  const leaf = label
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, ".")
    .replaceAll(/^\.+|\.+$/g, "");
  return specializationSlug(skillKey, leaf === "" ? "custom" : leaf);
}
