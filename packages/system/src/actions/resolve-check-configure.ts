import { localize } from "../i18n/localize.ts";
import { skillCheckDiceTerm } from "../rolls/advantage.ts";
import { promptCheckDialog } from "../applications/dialogs/check-dialog.ts";
import {
  defaultCheckConfigure,
  type CheckConfigureOptions,
  CHECK_DIALOG_SETTING,
  type CheckConfigureResult,
} from "../rolls/check-configure.ts";
import type { Modifier } from "../rolls/collectors.ts";

/** Prompt when needed; otherwise defaults (or explicit options). */
export async function resolveCheckConfigure(
  title: string,
  modifiers: Modifier[],
  options: CheckConfigureOptions = {},
  diceTerm?: (net: number) => string,
): Promise<CheckConfigureResult | null> {
  const base = {
    ...defaultCheckConfigure(),
    ...(options.difficulty !== undefined ? { difficulty: options.difficulty } : {}),
    ...(options.situational !== undefined ? { situational: options.situational } : {}),
    ...(options.advantageNet !== undefined ? { advantageNet: options.advantageNet } : {}),
    ...(options.baseDice !== undefined ? { baseDice: options.baseDice } : {}),
  };

  if (!shouldPromptCheckDialog(options.configure)) {
    return base;
  }

  return promptCheckDialog({
    title,
    modifiers,
    defaults: base,
    ...(diceTerm ? { diceTerm } : {}),
  });
}

export function withSituationalModifier(modifiers: Modifier[], situational: number): Modifier[] {
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

export function checkDiceExpression(advantageNet: number, baseDice = 2): string {
  return skillCheckDiceTerm(advantageNet, baseDice);
}

export function advantageFlavorSuffix(advantageNet: number): string {
  const n = Math.trunc(advantageNet);
  if (n === 0) return "";
  if (n > 0) {
    return ` · ${game.i18n.format("KEDOM.Roll.Dialog.advantageFlavor", { n: `+${String(n)}` })}`;
  }
  return ` · ${game.i18n.format("KEDOM.Roll.Dialog.disadvantageFlavor", { n: String(n) })}`;
}

/** True when the world setting or Ctrl/Meta click requests the dialog. */
export function shouldPromptCheckDialog(configure?: boolean): boolean {
  if (configure === true) return true;
  try {
    // @ts-expect-error fvtt-types: system settings namespace is not in the core union yet
    return game.settings.get("kedom", CHECK_DIALOG_SETTING) === true;
  } catch {
    return false;
  }
}
