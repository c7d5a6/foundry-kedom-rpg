import { formatSignedBonus } from "../../../../rolls/build-skill-check.ts";
import {
  LUCK_SCORE_MAX,
  LUCK_SCORE_MIN,
  ABILITY_KEYS,
  SAVE_ABILITY,
  SAVE_KEYS,
  type ProficiencyTier,
  type SaveKey,
} from "../../../../config/kedom.ts";
import type { CharacterData, SaveFields } from "../../../../data/actor/character.ts";
import { proficiencyLetterFromLabel, type TierOption } from "./shared.ts";

type AbilityView = { value: number; mod?: number };

type Attributes = {
  hp: { value: number; max: number };
  strain: { value: number };
  wounds: { value: number; notes?: string };
  strainLimit?: number;
  resolve?: number;
  wounded?: boolean;
};

export function buildAbilities(system: CharacterData) {
  const abilitiesData = system.abilities as Record<string, AbilityView>;
  return ABILITY_KEYS.map((key) => {
    const ability = abilitiesData[key]!;
    const mod = ability.mod ?? 0;
    return {
      key,
      label: game.i18n.localize(`KEDOM.Ability.${key}.label`),
      abbr: game.i18n.localize(`KEDOM.Ability.${key}.abbr`),
      value: ability.value,
      min: key === "lck" ? LUCK_SCORE_MIN : 3,
      max: key === "lck" ? LUCK_SCORE_MAX : 18,
      mod,
      modSigned: mod >= 0 ? `+${mod}` : String(mod),
    };
  });
}

export function woundsNotesOf(system: CharacterData): string {
  return (system.attributes as Attributes).wounds.notes ?? "";
}

export function buildResources(system: CharacterData) {
  const attrs = system.attributes as Attributes;
  const hpMax = attrs.hp.max ?? 0;
  const hpValue = attrs.hp.value ?? 0;
  const strainLimit = attrs.strainLimit ?? 0;
  const strainValue = attrs.strain.value ?? 0;
  const hpPct = hpMax > 0 ? Math.min(100, Math.round((hpValue / hpMax) * 100)) : 0;
  const woundValue = attrs.wounds.value ?? 0;
  return {
    hp: {
      value: hpValue,
      max: hpMax,
      pct: hpPct,
    },
    strain: {
      value: strainValue,
      limit: strainLimit,
      pct: strainLimit > 0 ? Math.min(100, Math.round((strainValue / strainLimit) * 100)) : 0,
    },
    wounds: {
      value: woundValue,
    },
    wounded: attrs.wounded ?? woundValue >= 1,
    resolve: attrs.resolve ?? 0,
  };
}

export function buildSaves(system: CharacterData, tierOptions: TierOption[]) {
  const savesData = system.saves as Record<SaveKey | "luck", SaveFields>;
  const saveView = (key: SaveKey | "luck", abilityKey: (typeof SAVE_ABILITY)[SaveKey] | "lck") => {
    const save = savesData[key]!;
    const proficiency = save.proficiency as ProficiencyTier;
    const mod = save.mod ?? 0;
    return {
      key,
      label: game.i18n.localize(`KEDOM.Save.${key}`),
      abilityKey,
      abilityAbbr: game.i18n.localize(`KEDOM.Ability.${abilityKey}.abbr`),
      proficiency,
      proficiencyLetter: proficiencyLetterFromLabel(proficiency),
      proficiencyLabel: game.i18n.localize(`KEDOM.Proficiency.${proficiency}`),
      proficiencyClass: `kedom-skill--${proficiency}`,
      bonusSigned: formatSignedBonus(mod),
      rollAction: key === "luck" ? "rollLuckSave" : "rollSave",
      proficiencyOptions: tierOptions.map((o) => ({ ...o, selected: o.value === proficiency })),
    };
  };
  const saves = SAVE_KEYS.map((key) => saveView(key, SAVE_ABILITY[key]));
  const luckSave = saveView("luck", "lck");
  return { saves, luckSave };
}
