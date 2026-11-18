/** Localize `path`, falling back when the key is missing (Foundry returns the key itself). */
export function localize(path: string, fallback?: string): string {
  const v = game.i18n.localize(path);
  if (!v || v === path) return fallback ?? path;
  return v;
}

/**
 * The i18n service, or `undefined` before Foundry has built it (and in unit tests, where `game`
 * does not exist). fvtt-types types it as always present, which is true only after `init`.
 */
export function readyI18n(): Partial<foundry.Game["i18n"]> | undefined {
  if (typeof game === "undefined") return undefined;
  return game.i18n;
}
