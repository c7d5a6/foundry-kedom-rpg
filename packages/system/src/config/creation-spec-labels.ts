import type { SkillKey } from "./kedom.ts";
import { freeSpecializationSlug } from "./specializations.ts";

/**
 * Canonical English free-form / open-parameter labels used in creation tables.
 * Values are i18n leaves under `KEDOM.Creation.FreeSpec.*`.
 */
export const CREATION_FREE_SPEC_I18N: Readonly<Record<string, string>> = {
  "Old Gods": "oldGods",
  "Khvirya Gods": "khviryaGods",
  Dwarves: "dwarves",
  Gnomes: "gnomes",
  Halflings: "halflings",
  Nitol: "nitol",
  Khvirya: "khvirya",
  Goblins: "goblins",
  Smithing: "smithing",
  Armorer: "armorer",
  Repair: "repair",
  Carpentry: "carpentry",
  Herbalism: "herbalism",
  Trade: "trade",
  Porter: "porter",
  Draft: "draft",
  Farming: "farming",
  Herding: "herding",
  Taiga: "taiga",
};

const SLUG_TO_I18N: Readonly<Record<string, string>> = (() => {
  const out: Record<string, string> = {};
  for (const [label, leaf] of Object.entries(CREATION_FREE_SPEC_I18N)) {
    out[label] = leaf;
    // Match persisted freeSpecializationSlug fragments (skill-agnostic leaf).
    out[slugifyLabel(label)] = leaf;
  }
  return out;
})();

function slugifyLabel(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .normalize("NFC")
    .replaceAll(/[^\p{L}\p{N}]+/gu, ".")
    .replaceAll(/^\.+|\.+$/g, "");
}

/** Localize a creation-table free-form specialization label (English canonical). */
export function localizeCreationSpecLabel(label: string): string {
  const leaf =
    CREATION_FREE_SPEC_I18N[label] ??
    SLUG_TO_I18N[slugifyLabel(label)] ??
    SLUG_TO_I18N[label];
  if (!leaf) return label;
  const path = `KEDOM.Creation.FreeSpec.${leaf}`;
  if (typeof game === "undefined" || !game.i18n?.localize) return label;
  const v = game.i18n.localize(path);
  return !v || v === path ? label : v;
}

/**
 * Localize a persisted specialization for sheet/chat display.
 * Fixed catalog leaves use `KEDOM.Specialization.*`; free-form creation labels
 * use `KEDOM.Creation.FreeSpec.*`.
 */
export function localizePersistedSpecLabel(
  skillKey: SkillKey,
  slug: string,
  fallbackLabel: string,
): string {
  const fromCreation = localizeCreationSpecLabel(fallbackLabel);
  if (fromCreation !== fallbackLabel) return fromCreation;

  // Slug may be `worship.old.gods` or `survive.environment.taiga`
  const withoutSkill = slug.startsWith(`${skillKey}.`)
    ? slug.slice(skillKey.length + 1)
    : slug;
  const fromSlug = localizeCreationSpecLabel(withoutSkill);
  if (fromSlug !== withoutSkill) return fromSlug;
  const tail = withoutSkill.includes(".")
    ? withoutSkill.slice(withoutSkill.lastIndexOf(".") + 1)
    : withoutSkill;
  const fromTail = localizeCreationSpecLabel(tail);
  if (fromTail !== tail) return fromTail;

  // Fixed catalog leaf
  const fixedPath = `KEDOM.Specialization.${skillKey}.${withoutSkill}`;
  if (typeof game !== "undefined" && game.i18n?.localize) {
    const v = game.i18n.localize(fixedPath);
    if (v && v !== fixedPath) return v;
  }

  return fallbackLabel;
}

/** Stable slug for a creation free-form label on a skill (for tests / lookups). */
export function creationFreeSpecSlug(skillKey: SkillKey, englishLabel: string): string {
  return freeSpecializationSlug(skillKey, englishLabel);
}
