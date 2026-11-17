/** True when Foundry can parse `formula` as a roll. Blank formulas are not valid. */
export function isValidDiceFormula(formula: string): boolean {
  return formula.trim() !== "" && Roll.validate(formula);
}

/** Warn once and return false when a weapon's damage formula cannot be rolled. */
export function ensureDamageFormula(formula: string, weaponName: string): boolean {
  if (isValidDiceFormula(formula)) return true;
  ui.notifications.error(
    game.i18n.format("KEDOM.Error.InvalidDamageFormula", { formula, weapon: weaponName }),
  );
  return false;
}
