import type { KedomWoundFlags } from "../actions/wound-roll.ts";
import { getKedomFlag } from "../types/accessors.ts";

export function getKedomWoundFlags(message: ChatMessage.Implementation): KedomWoundFlags | null {
  const wound = getKedomFlag<KedomWoundFlags>(message, "wound");
  if (!wound || typeof wound.actorUuid !== "string") return null;
  return wound;
}
