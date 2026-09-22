/** Ability keys and modifier bands. */

export const ABILITY_KEYS = ["mgh", "dex", "kno", "foc", "pre", "lck"] as const;
export type AbilityKey = (typeof ABILITY_KEYS)[number];

/** Inclusive max score → modifier. Symmetric 1/2/3/4/3/2/1 bands over 3–18. */
export const ABILITY_MOD_BANDS: ReadonlyArray<{ max: number; mod: number }> = [
  { max: 3, mod: -3 },
  { max: 5, mod: -2 },
  { max: 8, mod: -1 },
  { max: 12, mod: 0 },
  { max: 15, mod: 1 },
  { max: 17, mod: 2 },
  { max: 18, mod: 3 },
];

export const PROFICIENCY_TIERS = [
  "untrained",
  "apprentice",
  "trained",
  "expert",
  "master",
  "legendary",
] as const;
export type ProficiencyTier = (typeof PROFICIENCY_TIERS)[number];

export const PROFICIENCY_BONUS: Record<ProficiencyTier, number> = {
  untrained: -2,
  apprentice: 0,
  trained: 2,
  expert: 4,
  master: 6,
  legendary: 8,
};

/** How many specializations may be selected at each proficiency tier. */
export const PROFICIENCY_SPECIALIZATION_SLOTS: Record<ProficiencyTier, number> = {
  untrained: 0,
  apprentice: 1,
  trained: 2,
  expert: 3,
  master: 4,
  legendary: 5,
};

/** Skill key → governing ability. */
export const SKILL_ABILITY: Record<string, AbilityKey> = {
  arcana: "kno",
  connect: "pre",
  conduct: "pre",
  convince: "pre",
  craft: "dex",
  exert: "mgh",
  guile: "kno",
  heal: "kno",
  investigate: "kno",
  lore: "kno",
  notice: "foc",
  prowl: "dex",
  punch: "mgh",
  shoot: "dex",
  stab: "mgh",
  survive: "foc",
  travel: "foc",
  work: "mgh",
  worship: "pre",
};

export const SKILL_KEYS = Object.keys(SKILL_ABILITY) as Array<keyof typeof SKILL_ABILITY>;
export type SkillKey = (typeof SKILL_KEYS)[number];

/** Save key → governing ability. */
export const SAVE_KEYS = ["reflex", "fortitude", "will"] as const;
export type SaveKey = (typeof SAVE_KEYS)[number];

export const SAVE_ABILITY: Record<SaveKey, AbilityKey> = {
  reflex: "dex",
  fortitude: "mgh",
  will: "foc",
};

export const SKILL_CHECK_DICE = "2d10";

/** Task difficulty columns on the success ladder — not the character's proficiency. */
export const DIFFICULTY_COLUMNS = ["easy", "trained", "hard", "legendary"] as const;
export type DifficultyColumn = (typeof DIFFICULTY_COLUMNS)[number];

/** Default until the check dialog can pick another column. */
export const DEFAULT_DIFFICULTY: DifficultyColumn = "trained";

export const OUTCOME_KINDS = ["failure", "cost", "success"] as const;
export type OutcomeKind = (typeof OUTCOME_KINDS)[number];

export interface GradedOutcome {
  kind: OutcomeKind;
  /** Strength of that kind; cost is always 1. */
  degree: number;
}

type OutcomeBand = { max: number | null } & Record<DifficultyColumn, GradedOutcome>;

const F = (degree: number): GradedOutcome => ({ kind: "failure", degree });
const C: GradedOutcome = { kind: "cost", degree: 1 };
const S = (degree: number): GradedOutcome => ({ kind: "success", degree });

/** Ladder bands: roll ceiling → kind and degree per difficulty column. */
export const OUTCOME_BANDS: readonly OutcomeBand[] = [
  { max: 10, easy: F(1), trained: F(1), hard: F(2), legendary: F(3) },
  { max: 15, easy: S(1), trained: C, hard: F(1), legendary: F(2) },
  { max: 21, easy: S(2), trained: S(1), hard: C, legendary: F(1) },
  { max: 26, easy: S(3), trained: S(2), hard: S(1), legendary: C },
  { max: null, easy: S(4), trained: S(3), hard: S(2), legendary: S(1) },
];
