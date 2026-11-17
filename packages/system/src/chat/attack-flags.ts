import { getKedomFlag } from "../types/accessors.ts";
import type { KedomAttackFlags } from "../actions/attack-roll.ts";

export function getKedomAttackFlags(message: ChatMessage.Implementation): KedomAttackFlags | null {
  const attack = getKedomFlag<KedomAttackFlags>(message, "attack");
  if (!attack || typeof attack.actorUuid !== "string") return null;
  return attack;
}
