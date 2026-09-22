import type { SkillKey } from "./kedom.ts";

/** How a skill takes specialisations (docs/rules/20-skills.md). */
export type SpecializationKind = "none" | "free" | "fixed" | "parameterized";

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
  survive: "parameterized",
  travel: "fixed",
  work: "free",
  worship: "free",
};

/**
 * Open parameter segment for parameterized skills (e.g. Survive environments).
 * Free-form labels become `${skill}.${parameter}.${leaf}`.
 */
export const SKILL_FREE_PARAMETER: Partial<Record<SkillKey, string>> = {
  survive: "environment",
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
    "firstaid",
    "pharmacology",
    "psychology",
    "rehabilitation",
    "surgery",
    "toxicology",
  ],
  investigate: ["appraisal", "cryptography", "investigation", "libraryuse", "research", "search"],
  notice: ["anomalies", "awareness", "detail", "farsight", "hidden", "insight", "listen"],
  prowl: ["backstabbing", "climbing", "hide", "lockpicking", "sleightofhand", "sneaking"],
  survive: ["foraging", "scouting", "shelter", "tracking"],
  travel: ["hiking", "riding", "driving", "sailing", "navigation", "orientation"],
};

export function specializationSlug(skillKey: SkillKey, leaf: string): string {
  return `${skillKey}.${leaf}`;
}

function slugifyLeaf(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .normalize("NFC")
    // Letters/digits from any script (Cyrillic, etc.); other runs → "."
    .replaceAll(/[^\p{L}\p{N}]+/gu, ".")
    .replaceAll(/^\.+|\.+$/g, "");
}

/** Stable fallback when a label has no letters/digits (e.g. emoji-only). */
function leafFallback(label: string): string {
  let h = 0;
  for (let i = 0; i < label.length; i += 1) {
    h = (Math.imul(31, h) + label.charCodeAt(i)) | 0;
  }
  return `custom.${(h >>> 0).toString(36)}`;
}

/** Slug for a free-form specialisation label; frozen after creation. */
export function freeSpecializationSlug(skillKey: SkillKey, label: string): string {
  const leaf = slugifyLeaf(label);
  return specializationSlug(skillKey, leaf === "" ? leafFallback(label) : leaf);
}

/** Free-form label under a parameterized skill's open parameter (e.g. environment). */
export function freeParameterSpecializationSlug(
  skillKey: SkillKey,
  parameter: string,
  label: string,
): string {
  const leaf = slugifyLeaf(label);
  return `${skillKey}.${parameter}.${leaf === "" ? leafFallback(label) : leaf}`;
}

export function allowsFreeSpecialization(kind: SpecializationKind): boolean {
  return kind === "free" || kind === "parameterized";
}

export function hasFixedSpecializationCatalog(kind: SpecializationKind): boolean {
  return kind === "fixed" || kind === "parameterized";
}
