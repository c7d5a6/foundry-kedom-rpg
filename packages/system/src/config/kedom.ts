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
  travel: "mgh",
  work: "mgh",
  worship: "pre",
};

export const SKILL_KEYS = Object.keys(SKILL_ABILITY) as Array<keyof typeof SKILL_ABILITY>;
export type SkillKey = (typeof SKILL_KEYS)[number];

export const SKILL_CHECK_DICE = "2d10";

/** Task difficulty columns on the success ladder — not the character's proficiency. */
export const DIFFICULTY_COLUMNS = ["easy", "trained", "hard", "legendary"] as const;
export type DifficultyColumn = (typeof DIFFICULTY_COLUMNS)[number];

/** Default until the check dialog can pick another column. */
export const DEFAULT_DIFFICULTY: DifficultyColumn = "trained";

type Outcome = "failure" | "cost" | "success";
type OutcomeBand = { max: number | null } & Record<DifficultyColumn, Outcome>;

/** Ladder bands for optional outcome label (ADR-008 deferred; still useful in chat). */
export const OUTCOME_BANDS: readonly OutcomeBand[] = [
  { max: 10, easy: "failure", trained: "failure", hard: "failure", legendary: "failure" },
  { max: 14, easy: "success", trained: "cost", hard: "failure", legendary: "failure" },
  { max: 21, easy: "success", trained: "success", hard: "cost", legendary: "failure" },
  { max: 26, easy: "success", trained: "success", hard: "success", legendary: "cost" },
  { max: null, easy: "success", trained: "success", hard: "success", legendary: "success" },
];
