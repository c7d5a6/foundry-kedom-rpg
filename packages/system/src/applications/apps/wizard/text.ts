/** True for a string that is neither absent nor empty (the old `if (value)` check on a nullable string). */
export function isFilled(value: string | null | undefined): value is string {
  return value !== null && value !== undefined && value !== "";
}

/** `{ label: 1 }` with prefix `roll1` becomes `{ roll1Label: 1 }`: the template's flat key naming. */
export function prefixKeys(prefix: string, view: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(view).map(([key, value]) => [
      `${prefix}${key.charAt(0).toUpperCase()}${key.slice(1)}`,
      value,
    ]),
  );
}
