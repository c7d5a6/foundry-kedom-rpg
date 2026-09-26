import type { KedomDamageFlags } from "../rolls/damage-roll.ts";

export function getKedomDamageFlags(
  message: ChatMessage.Implementation,
): KedomDamageFlags | null {
  const flags = message.flags as { kedom?: { damage?: KedomDamageFlags } } | undefined;
  const damage = flags?.kedom?.damage;
  if (!damage || typeof damage.actorUuid !== "string") return null;
  return damage;
}
