import { DEFAULT_DIFFICULTY, type DifficultyColumn } from "../config/kedom.ts";

export type CheckConfigureOptions = {
  /** Open the configure dialog even if the world setting is off. */
  configure?: boolean;
  difficulty?: DifficultyColumn;
  situational?: number;
  advantageNet?: number;
  /** Dice kept on skill checks (default 2). Ignored by saves / Luck. */
  baseDice?: number;
};

export type CheckConfigureResult = {
  difficulty: DifficultyColumn;
  situational: number;
  advantageNet: number;
  baseDice: number;
};

export const CHECK_DIALOG_SETTING = "checkDialog";

export const DEFAULT_SKILL_BASE_DICE = 2;

export function defaultCheckConfigure(): CheckConfigureResult {
  return {
    difficulty: DEFAULT_DIFFICULTY,
    situational: 0,
    advantageNet: 0,
    baseDice: DEFAULT_SKILL_BASE_DICE,
  };
}
