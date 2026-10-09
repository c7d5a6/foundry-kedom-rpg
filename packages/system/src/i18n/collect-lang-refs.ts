import {
  ABILITY_KEYS,
  DIFFICULTY_COLUMNS,
  OUTCOME_KINDS,
  PROFICIENCY_TIERS,
  SAVE_KEYS,
  SKILL_KEYS,
} from "../config/kedom.ts";
import { BODY_PART_KEYS } from "../config/wound-table.ts";
import { SKILL_FIXED_SPECIALIZATIONS } from "../config/specializations.ts";
import { ORIGIN_SUBTYPES } from "../config/origin.ts";
import { CREATION_FREE_SPEC_I18N } from "../config/creation-spec-labels.ts";
import { TALENT_CATEGORIES } from "../config/talent.ts";
import { ART_COMMITMENTS } from "../config/art.ts";
/** Display titles for class families (shared by full / partial origin items). */
const CLASS_TITLE_KEYS = ["warrior", "expert"] as const;

const CREATION_STEP_IDS = [
  "abilities",
  "region",
  "culture",
  "background",
  "className",
  "confirm",
] as const;

function fixedSpecializationLangKeys(): string[] {
  const keys: string[] = [];
  for (const [skill, leaves] of Object.entries(SKILL_FIXED_SPECIALIZATIONS)) {
    for (const leaf of leaves ?? []) {
      keys.push(`KEDOM.Specialization.${skill}.${leaf}`);
    }
  }
  return keys;
}

/** Static `"KEDOM.…"` / `"TYPES.…"` string literals (quotes or backticks without `${`). */
const STATIC_KEY = /(?<!\$\{)["'`]((?:KEDOM|TYPES)(?:\.[A-Za-z_][A-Za-z0-9_]*)+)["'`]/g;

/** Template literals that interpolate a segment, e.g. `KEDOM.Skill.${key}`. */
const TEMPLATE_KEY = /`((?:KEDOM|TYPES)(?:\.(?:[A-Za-z_][A-Za-z0-9_]*|\$\{[^}]+\}))+)`/g;

/**
 * Config-backed expansions for template paths. Adding a new `${…}` pattern here
 * is required when code starts building keys from a closed enum in config.
 */
const TEMPLATE_EXPANDERS: {
  pattern: RegExp;
  expand: () => string[];
}[] = [
  {
    pattern: /^KEDOM\.Ability\.\$\{[^}]+\}\.label$/,
    expand: () => ABILITY_KEYS.map((k) => `KEDOM.Ability.${k}.label`),
  },
  {
    pattern: /^KEDOM\.Ability\.\$\{[^}]+\}\.abbr$/,
    expand: () => ABILITY_KEYS.map((k) => `KEDOM.Ability.${k}.abbr`),
  },
  {
    pattern: /^KEDOM\.Skill\.\$\{[^}]+\}$/,
    expand: () => SKILL_KEYS.map((k) => `KEDOM.Skill.${k}`),
  },
  {
    pattern: /^KEDOM\.Save\.\$\{[^}]+\}$/,
    expand: () => SAVE_KEYS.map((k) => `KEDOM.Save.${k}`),
  },
  {
    pattern: /^KEDOM\.Proficiency\.\$\{[^}]+\}$/,
    expand: () => PROFICIENCY_TIERS.map((t) => `KEDOM.Proficiency.${t}`),
  },
  {
    pattern: /^KEDOM\.Outcome\.\$\{[^}]+\}$/,
    expand: () => OUTCOME_KINDS.map((o) => `KEDOM.Outcome.${o}`),
  },
  {
    pattern: /^KEDOM\.DifficultyColumn\.\$\{[^}]+\}$/,
    expand: () => DIFFICULTY_COLUMNS.map((d) => `KEDOM.DifficultyColumn.${d}`),
  },
  {
    pattern: /^KEDOM\.Wound\.BodyPart\.\$\{[^}]+\}$/,
    expand: () => BODY_PART_KEYS.map((p) => `KEDOM.Wound.BodyPart.${p}`),
  },
  {
    pattern: /^KEDOM\.Origin\.SubType\.\$\{[^}]+\}$/,
    expand: () => ORIGIN_SUBTYPES.map((s) => `KEDOM.Origin.SubType.${s}`),
  },
  {
    pattern: /^KEDOM\.Talent\.Category\.\$\{[^}]+\}$/,
    expand: () => TALENT_CATEGORIES.map((c) => `KEDOM.Talent.Category.${c}`),
  },
  {
    pattern: /^KEDOM\.Art\.Commitment\.\$\{[^}]+\}$/,
    expand: () => ART_COMMITMENTS.map((c) => `KEDOM.Art.Commitment.${c}`),
  },
  {
    pattern: /^KEDOM\.Creation\.Step\.\$\{[^}]+\}$/,
    expand: () => CREATION_STEP_IDS.map((s) => `KEDOM.Creation.Step.${s}`),
  },
  {
    pattern: /^KEDOM\.Creation\.FreeSpec\.\$\{[^}]+\}$/,
    expand: () =>
      [...new Set(Object.values(CREATION_FREE_SPEC_I18N))].map(
        (leaf) => `KEDOM.Creation.FreeSpec.${leaf}`,
      ),
  },
  {
    pattern: /^KEDOM\.Class\.\$\{[^}]+\}$/,
    expand: () => CLASS_TITLE_KEYS.map((k) => `KEDOM.Class.${k}`),
  },
  {
    pattern: /^KEDOM\.Specialization\.\$\{[^}]+\}\.\$\{[^}]+\}$/,
    expand: () => fixedSpecializationLangKeys(),
  },
  // Open catalog / free-form slugs — validated at runtime, not as closed lang keys.
  {
    pattern: /^KEDOM\.Specialization\.\$\{[^}]+\}$/,
    expand: () => [],
  },
  {
    pattern: /^KEDOM\.Content\.\$\{[^}]+\}\.\$\{[^}]+\}\.label$/,
    expand: () => [],
  },
  {
    pattern: /^KEDOM\.Content\.\$\{[^}]+\}\.\$\{[^}]+\}\.description$/,
    expand: () => [],
  },
  {
    pattern: /^KEDOM\.Creation\.\$\{[^}]+\}\.\$\{[^}]+\}$/,
    expand: () => [],
  },
];

/** Keys every config enum must have labels for, even before first reference. */
export function configDrivenLangKeys(): string[] {
  return [
    ...ABILITY_KEYS.flatMap((k) => [`KEDOM.Ability.${k}.label`, `KEDOM.Ability.${k}.abbr`]),
    ...SKILL_KEYS.map((k) => `KEDOM.Skill.${k}`),
    ...SAVE_KEYS.map((k) => `KEDOM.Save.${k}`),
    "KEDOM.Save.luck",
    ...PROFICIENCY_TIERS.map((t) => `KEDOM.Proficiency.${t}`),
    ...OUTCOME_KINDS.map((o) => `KEDOM.Outcome.${o}`),
    ...DIFFICULTY_COLUMNS.map((d) => `KEDOM.DifficultyColumn.${d}`),
    ...BODY_PART_KEYS.map((p) => `KEDOM.Wound.BodyPart.${p}`),
    ...ORIGIN_SUBTYPES.map((s) => `KEDOM.Origin.SubType.${s}`),
    ...TALENT_CATEGORIES.map((c) => `KEDOM.Talent.Category.${c}`),
    ...ART_COMMITMENTS.map((c) => `KEDOM.Art.Commitment.${c}`),
    ...CLASS_TITLE_KEYS.map((k) => `KEDOM.Class.${k}`),
    ...fixedSpecializationLangKeys(),
  ];
}

export function expandTemplateLangKey(template: string): string[] {
  for (const expander of TEMPLATE_EXPANDERS) {
    if (expander.pattern.test(template)) return expander.expand();
  }
  throw new Error(
    `Unhandled i18n template key "${template}". Add an expander in collect-lang-refs.ts.`,
  );
}

/** Collect every KEDOM/TYPES key referenced in source text. */
export function collectLangRefs(source: string): { keys: string[]; errors: string[] } {
  const keys = new Set<string>();
  const errors: string[] = [];

  for (const match of source.matchAll(STATIC_KEY)) {
    const key = match[1];
    if (key !== undefined) keys.add(key);
  }

  for (const match of source.matchAll(TEMPLATE_KEY)) {
    const template = match[1];
    if (template === undefined) continue;
    if (!template.includes("${")) continue;
    try {
      for (const key of expandTemplateLangKey(template)) keys.add(key);
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  return { keys: [...keys].sort(), errors };
}
