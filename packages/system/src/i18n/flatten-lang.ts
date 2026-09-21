/** Flatten a Foundry lang JSON tree into dotted keys → leaf strings. */
export function flattenLang(tree: unknown, prefix = ""): Map<string, string> {
  const out = new Map<string, string>();
  if (typeof tree === "string") {
    if (prefix !== "") out.set(prefix, tree);
    return out;
  }
  if (tree === null || typeof tree !== "object" || Array.isArray(tree)) {
    return out;
  }
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix === "" ? key : `${prefix}.${key}`;
    for (const [childPath, childValue] of flattenLang(value, path)) {
      out.set(childPath, childValue);
    }
  }
  return out;
}
