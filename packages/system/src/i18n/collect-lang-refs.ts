import {
  ABILITY_KEYS,
  DIFFICULTY_COLUMNS,
  OUTCOME_KINDS,
  PROFICIENCY_TIERS,
  SKILL_KEYS,
} from "../config/kedom.ts";
import { SKILL_FIXED_SPECIALIZATIONS } from "../config/specializations.ts";

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
    pattern: /^KEDOM\.Specialization\.\$\{[^}]+\}\.\$\{[^}]+\}$/,
    expand: () => fixedSpecializationLangKeys(),
  },
];

/** Keys every config enum must have labels for, even before first reference. */
export function configDrivenLangKeys(): string[] {
  return [
    ...ABILITY_KEYS.flatMap((k) => [`KEDOM.Ability.${k}.label`, `KEDOM.Ability.${k}.abbr`]),
    ...SKILL_KEYS.map((k) => `KEDOM.Skill.${k}`),
    ...PROFICIENCY_TIERS.map((t) => `KEDOM.Proficiency.${t}`),
    ...OUTCOME_KINDS.map((o) => `KEDOM.Outcome.${o}`),
    ...DIFFICULTY_COLUMNS.map((d) => `KEDOM.DifficultyColumn.${d}`),
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
