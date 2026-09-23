import { skillCheckDiceTerm } from "./advantage.ts";
import { promptCheckDialog } from "../applications/dialogs/check-dialog.ts";
import {
  defaultCheckConfigure,
  shouldPromptCheckDialog,
  type CheckConfigureOptions,
  type CheckConfigureResult,
} from "./check-configure.ts";
import type { Modifier } from "./collectors.ts";

function localize(path: string, fallback: string): string {
  const v = game.i18n.localize(path);
  return !v || v === path ? fallback : v;
}

/** Prompt when needed; otherwise defaults (or explicit options). */
export async function resolveCheckConfigure(
  title: string,
  modifiers: Modifier[],
  options: CheckConfigureOptions = {},
): Promise<CheckConfigureResult | null> {
  const base = {
    ...defaultCheckConfigure(),
    ...(options.difficulty !== undefined ? { difficulty: options.difficulty } : {}),
    ...(options.situational !== undefined ? { situational: options.situational } : {}),
    ...(options.advantageNet !== undefined ? { advantageNet: options.advantageNet } : {}),
  };

  if (!shouldPromptCheckDialog(options.configure)) {
    return base;
  }

  return promptCheckDialog({ title, modifiers, defaults: base });
}

export function withSituationalModifier(
  modifiers: Modifier[],
  situational: number,
): Modifier[] {
  if (situational === 0) return modifiers;
  const label = localize("KEDOM.Roll.modifier.situational", "Situational");
  return [
    ...modifiers,
    {
      label,
      value: situational,
      source: { id: "situational", label },
      kind: "situational",
    },
  ];
}

export function checkDiceExpression(advantageNet: number): string {
  return skillCheckDiceTerm(advantageNet);
}

export function advantageFlavorSuffix(advantageNet: number): string {
  const n = Math.trunc(advantageNet);
  if (n === 0) return "";
  if (n > 0) {
    return ` · ${game.i18n.format("KEDOM.Roll.Dialog.advantageFlavor", { n: `+${String(n)}` })}`;
  }
  return ` · ${game.i18n.format("KEDOM.Roll.Dialog.disadvantageFlavor", { n: String(n) })}`;
}
