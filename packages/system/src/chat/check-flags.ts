import { getKedomFlag } from "../types/accessors.ts";
import type { DifficultyColumn, SkillKey, SaveKey } from "../config/kedom.ts";

/** Flags on graded check chat cards for spend Luck and free reroll. */
export interface KedomGradedCheckFlags {
  kind: "skill" | "save" | "luck-save";
  actorUuid: string;
  skillKey?: SkillKey;
  specializationSlug?: string;
  saveKey?: SaveKey;
  difficulty: DifficultyColumn;
  advantageNet: number;
  /** Dice kept on skill checks; omitted / 2 for saves. */
  baseDice?: number;
  situational: number;
  /** Effective total including Luck spent on this card. */
  total: number;
  /** Original dice+mods total before any Luck spend. */
  diceTotal: number;
  luckSpent: number;
  /** Set once this card has been superseded by a reroll. */
  rerolled?: boolean;
  /** Base modifiers shown in the tooltip (before Luck spend line). */
  /** Absent on cards written before modifiers were recorded. */
  modifiers?: { label: string; value: number }[];
}

export interface KedomMessageFlags {
  check?: KedomGradedCheckFlags;
}

export function getKedomCheckFlags(
  message: ChatMessage.Implementation,
): KedomGradedCheckFlags | null {
  const check = getKedomFlag<KedomGradedCheckFlags>(message, "check");
  if (!check) return null;
  // Stored flags may hold a kind this version does not know, so do not trust the union.
  const kind: string = check.kind;
  if (kind !== "skill" && kind !== "save" && kind !== "luck-save") return null;
  return check;
}
