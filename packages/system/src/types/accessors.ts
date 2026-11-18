import type { CharacterData } from "../data/actor/character.ts";

/**
 * fvtt-types does not know our DataModel shapes on `Document#system`, so every read needs a
 * cast. Keep the cast here, once, instead of at each call site.
 */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- a cast helper: the caller names the shape, which cannot be inferred from `unknown`
export function systemOf<T>(doc: { system: unknown }): T {
  return doc.system as T;
}

export function characterData(actor: { system: unknown }): CharacterData {
  return actor.system as CharacterData;
}

/** Kedom flags attached to a chat message, by card key (`check`, `attack`, `wound`). */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- a cast helper: the caller names the flag shape, which cannot be inferred from `unknown`
export function getKedomFlag<T>(message: { flags?: unknown }, key: string): T | undefined {
  const kedom = (message.flags as { kedom?: Record<string, unknown> } | undefined)?.kedom;
  return kedom?.[key] as T | undefined;
}
