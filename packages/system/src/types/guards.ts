/**
 * Narrow an optional string to a non-empty one. Foundry ids, keys and labels are often typed
 * `string | null | undefined`, and an empty string means "not set" just like a missing value.
 */
export function isNonEmpty(value: string | null | undefined): value is string {
  return value !== undefined && value !== null && value !== "";
}
