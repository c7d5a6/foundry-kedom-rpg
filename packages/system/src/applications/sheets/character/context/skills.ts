import {
  SKILL_ABILITY,
  SKILL_KEYS,
  type ProficiencyTier,
  type SkillKey,
} from "../../../../config/kedom.ts";
import {
  SKILL_FIXED_SPECIALIZATIONS,
  SKILL_SPECIALIZATION_KIND,
  allowsFreeSpecialization,
  hasFixedSpecializationCatalog,
  specializationSlug,
  type SpecializationKind,
} from "../../../../config/specializations.ts";
import { localizePersistedSpecLabel } from "../../../../config/creation-spec-labels.ts";
import type { CharacterData, SkillFields } from "../../../../data/actor/character.ts";
import { prepareSkillCheck } from "../../../../actions/skill-check.ts";
import { formatSignedBonus } from "../../../../rolls/build-skill-check.ts";
import { characterData } from "../../../../types/accessors.ts";
import {
  countSelectedSpecializations,
  isSpecializationSelected,
  localizeSpecLabel,
  specializationSlots,
} from "../helpers.ts";
import { collate, proficiencyLetterFromLabel, type TierOption } from "./shared.ts";

interface SpecTag {
  slug: string;
  leaf?: string;
  label: string;
  skillKey: SkillKey;
  selected: boolean;
  isFree: boolean;
  bonusSigned: string | null;
  canSelect: boolean;
}

function rollHintOf(baseDice: number, defaultAdvantage: number): string {
  const rollHintParts: string[] = [];
  if (baseDice !== 2) {
    rollHintParts.push(
      game.i18n.format("KEDOM.Sheet.SkillBaseDiceHint", { dice: String(baseDice) }),
    );
  }
  if (defaultAdvantage > 0) {
    rollHintParts.push(game.i18n.localize("KEDOM.Sheet.SkillAdvHint"));
  } else if (defaultAdvantage < 0) {
    rollHintParts.push(game.i18n.localize("KEDOM.Sheet.SkillDisadvHint"));
  }
  return rollHintParts.join(" ");
}

/** Fixed-catalog tags first, then free-form ones; selected first, then by label. */
function buildSpecializationTags(
  actor: Actor.Implementation,
  key: SkillKey,
  skill: SkillFields,
  kind: SpecializationKind,
  canSelectMore: boolean,
) {
  const ownedBySlug = new Map(skill.specializations.map((s) => [s.slug, s]));
  const fixedLeaves = SKILL_FIXED_SPECIALIZATIONS[key] ?? [];
  let specializationTags: SpecTag[] = [];
  if (hasFixedSpecializationCatalog(kind)) {
    specializationTags = fixedLeaves.map((leaf) => {
      const slug = specializationSlug(key, leaf);
      const owned = ownedBySlug.get(slug);
      const selected = owned !== undefined && isSpecializationSelected(owned);
      const specCheck = selected
        ? prepareSkillCheck(actor, key, { specializationSlug: slug })
        : null;
      return {
        slug,
        leaf,
        label: localizeSpecLabel(key, leaf),
        skillKey: key,
        selected,
        isFree: false,
        bonusSigned: specCheck !== null ? formatSignedBonus(specCheck.bonus) : null,
        canSelect: selected || canSelectMore,
      };
    });
  }
  if (allowsFreeSpecialization(kind)) {
    const fixedSlugs = new Set(specializationTags.map((t) => t.slug));
    for (const s of skill.specializations) {
      if (fixedSlugs.has(s.slug)) continue;
      const selected = isSpecializationSelected(s);
      const specCheck = selected
        ? prepareSkillCheck(actor, key, { specializationSlug: s.slug })
        : null;
      specializationTags.push({
        slug: s.slug,
        label: localizePersistedSpecLabel(key, s.slug, s.label),
        skillKey: key,
        selected,
        isFree: true,
        bonusSigned: specCheck !== null ? formatSignedBonus(specCheck.bonus) : null,
        canSelect: selected || canSelectMore,
      });
    }
  }

  specializationTags.sort((a, b) => {
    if (a.selected !== b.selected) return a.selected ? -1 : 1;
    return collate(a.label, b.label);
  });
  const lastSelectedIndex = specializationTags.findLastIndex((t) => t.selected);
  return specializationTags.map((tag, index) => ({
    ...tag,
    showMod: index === lastSelectedIndex,
  }));
}

function buildSkillRow(
  actor: Actor.Implementation,
  tierOptions: TierOption[],
  key: SkillKey,
  skill: SkillFields,
) {
  const abilityKey = SKILL_ABILITY[key];
  const proficiency = skill.proficiency as ProficiencyTier;
  const kind = SKILL_SPECIALIZATION_KIND[key] ?? "none";
  const slots = specializationSlots(proficiency);
  const selectedCount = countSelectedSpecializations(skill);
  const overLimit = selectedCount > slots;
  const canSelectMore = selectedCount < slots;

  const skillCheck = prepareSkillCheck(actor, key);
  const bonusSigned = skillCheck !== null ? formatSignedBonus(skillCheck.bonus) : "+0";
  // Skills persisted before these fields existed may lack them; SkillFields says they are present.
  const persisted = skill as { baseDice?: number | null; defaultAdvantage?: number | null };
  const baseDice = Math.max(1, Math.floor(persisted.baseDice ?? 2));
  const defaultAdvantage = Math.floor(persisted.defaultAdvantage ?? 0);
  const hasNonDefaultRoll = baseDice !== 2 || defaultAdvantage !== 0;
  const rollHint = rollHintOf(baseDice, defaultAdvantage);
  const tagsWithMod = buildSpecializationTags(actor, key, skill, kind, canSelectMore);

  return {
    key,
    label: game.i18n.localize(`KEDOM.Skill.${key}`),
    abilityKey,
    abilityAbbr: game.i18n.localize(`KEDOM.Ability.${String(abilityKey)}.abbr`),
    proficiency,
    proficiencyLetter: proficiencyLetterFromLabel(proficiency),
    proficiencyLabel: game.i18n.localize(`KEDOM.Proficiency.${proficiency}`),
    proficiencyClass: `kedom-skill--${proficiency}`,
    bonusSigned,
    baseDice,
    defaultAdvantage,
    hasNonDefaultRoll,
    rollHint,
    allowsSpecialization: kind !== "none",
    allowsFreeAdd: allowsFreeSpecialization(kind),
    isFree: kind === "free",
    isFixed: kind === "fixed",
    isParameterized: kind === "parameterized",
    specializationTags: tagsWithMod,
    specializationSlots: slots,
    specializationSelectedCount: selectedCount,
    specializationOverLimit: overLimit,
    specializationOverLimitMessage: overLimit
      ? game.i18n.format("KEDOM.Sheet.SpecializationOverLimit", {
          selected: String(selectedCount),
          slots: String(slots),
        })
      : null,
    proficiencyOptions: tierOptions.map((o) => ({ ...o, selected: o.value === proficiency })),
  };
}

/** Skill rows for the skills tab (empty when `enabled` is false: the tab is not shown). */
export function buildSkills(
  actor: Actor.Implementation,
  tierOptions: TierOption[],
  enabled: boolean,
) {
  const system: CharacterData = characterData(actor);
  const skillsData = system.skills as Record<SkillKey, SkillFields | undefined>;
  return (enabled ? SKILL_KEYS : ([] as typeof SKILL_KEYS))
    .map((key) => {
      const skill = skillsData[key];
      if (skill === undefined) throw new Error(`Character has no skill data for "${key}"`);
      return buildSkillRow(actor, tierOptions, key, skill);
    })
    .sort((a, b) => collate(a.label, b.label));
}
