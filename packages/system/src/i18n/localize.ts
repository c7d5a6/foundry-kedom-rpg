/** Localize `path`, falling back when the key is missing (Foundry returns the key itself). */
export function localize(path: string, fallback?: string): string {
  const v = game.i18n.localize(path);
  if (!v || v === path) return fallback ?? path;
  return v;
}
