export function degreeIcons(
  degree: number,
  iconKind: "success" | "failure",
): { cssClass: string; kind: string }[] {
  const cssClass = iconKind === "success" ? "fa-dice-d20" : "fa-skull";
  return Array.from({ length: degree }, () => ({ cssClass, kind: iconKind }));
}

/**
 * Foundry's default tooltip only lists DiceTerms (`Roll#getTooltip` → `this.dice`).
 * Numeric modifiers (`+2[Focus]`) are parsed as NumericTerms and omitted — same gap
 * dnd5e fills via a custom breakdown template. We append matching tooltip-part rows.
 */
export function modifierTooltipParts(
  modifiers: readonly { label: string; value: number }[],
): { formula: string; flavor: string; total: number }[] {
  return modifiers.map((mod) => ({
    formula: mod.value >= 0 ? `+${String(mod.value)}` : String(mod.value),
    flavor: mod.label,
    total: mod.value,
  }));
}
