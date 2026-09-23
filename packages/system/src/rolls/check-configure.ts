import {
  DEFAULT_DIFFICULTY,
  type DifficultyColumn,
} from "../config/kedom.ts";

export type CheckConfigureOptions = {
  /** Open the configure dialog even if the world setting is off. */
  configure?: boolean;
  difficulty?: DifficultyColumn;
  situational?: number;
  advantageNet?: number;
};

export type CheckConfigureResult = {
  difficulty: DifficultyColumn;
  situational: number;
  advantageNet: number;
};

export const CHECK_DIALOG_SETTING = "checkDialog";

export function defaultCheckConfigure(): CheckConfigureResult {
  return {
    difficulty: DEFAULT_DIFFICULTY,
    situational: 0,
    advantageNet: 0,
  };
}

/** True when the world setting or Ctrl/Meta click requests the dialog. */
export function shouldPromptCheckDialog(configure?: boolean): boolean {
  if (configure === true) return true;
  try {
    // @ts-expect-error fvtt-types: system settings namespace is not in the core union yet
    return game.settings.get("kedom", CHECK_DIALOG_SETTING) === true;
  } catch {
    return false;
  }
}
