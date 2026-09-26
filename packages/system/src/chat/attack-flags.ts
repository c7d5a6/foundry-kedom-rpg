import type { KedomAttackFlags } from "../rolls/attack-roll.ts";

export function getKedomAttackFlags(
  message: ChatMessage.Implementation,
): KedomAttackFlags | null {
  const flags = message.flags as { kedom?: { attack?: KedomAttackFlags } } | undefined;
  const attack = flags?.kedom?.attack;
  if (!attack || typeof attack.actorUuid !== "string") return null;
  return attack;
}
