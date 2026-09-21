import type { Modifier } from "./collectors.ts";

/** Strip brackets so Foundry term flavor `2[label]` stays parseable. */
export function flavorLabel(label: string): string {
  return label.replaceAll("[", "").replaceAll("]", "");
}

/**
 * Build a Foundry formula with per-term flavor labels:
 * `2d10[Survive] + 2[Focus] + 2[Trained]` — see Foundry dice docs “Describing Dice”.
 */
export function labeledCheckFormula(
  dice: string,
  diceLabel: string,
  modifiers: Modifier[],
): string {
  const parts = [`${dice}[${flavorLabel(diceLabel)}]`];
  for (const mod of modifiers) {
    const amount = Math.abs(mod.value);
    const label = flavorLabel(mod.label);
    if (mod.value < 0) {
      parts.push(`- ${String(amount)}[${label}]`);
    } else {
      parts.push(`+ ${String(amount)}[${label}]`);
    }
  }
  return parts.join(" ");
}
