import type { DifficultyColumn, SkillKey, SaveKey } from "../config/kedom.ts";

/** Flags on graded check chat cards for spend Luck and free reroll. */
export type KedomGradedCheckFlags = {
  kind: "skill" | "save" | "luck-save";
  actorUuid: string;
  skillKey?: SkillKey;
  specializationSlug?: string;
  saveKey?: SaveKey;
  difficulty: DifficultyColumn;
  advantageNet: number;
  situational: number;
  /** Effective total including Luck spent on this card. */
  total: number;
  /** Original dice+mods total before any Luck spend. */
  diceTotal: number;
  luckSpent: number;
  /** Base modifiers shown in the tooltip (before Luck spend line). */
  modifiers: { label: string; value: number }[];
};

export type KedomMessageFlags = {
  check?: KedomGradedCheckFlags;
};

export function getKedomCheckFlags(
  message: ChatMessage.Implementation,
): KedomGradedCheckFlags | null {
  const flags = message.flags as { kedom?: KedomMessageFlags } | undefined;
  const check = flags?.kedom?.check;
  if (!check || (check.kind !== "skill" && check.kind !== "save" && check.kind !== "luck-save")) {
    return null;
  }
  return check;
}
