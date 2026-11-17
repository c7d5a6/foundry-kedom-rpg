import type { Modifier } from "./collectors.ts";

/**
 * Active Effects ADD onto derived values (`save.mod`, `skill.proficiencyBonus`).
 * Rolls rebuild their breakdown from ability + tier, so whatever the derived value
 * carries beyond that is the effect contribution. Returns `[]` when there is none.
 */
export function effectDeltaModifiers(input: {
  derived: number | undefined;
  expected: number;
  id: string;
  label: string;
}): Modifier[] {
  if (input.derived === undefined) return [];
  const delta = Math.trunc(input.derived) - Math.trunc(input.expected);
  if (delta === 0) return [];
  return [
    {
      label: input.label,
      value: delta,
      source: { id: input.id, label: input.label },
      kind: "effect",
    },
  ];
}
