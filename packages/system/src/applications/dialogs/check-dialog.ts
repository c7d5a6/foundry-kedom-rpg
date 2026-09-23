import {
  DIFFICULTY_COLUMNS,
  type DifficultyColumn,
} from "../../config/kedom.ts";
import type { Modifier } from "../../rolls/collectors.ts";
import {
  defaultCheckConfigure,
  type CheckConfigureResult,
} from "../../rolls/check-configure.ts";

const TEMPLATE = "systems/kedom/templates/apps/check-dialog.hbs";

function localize(path: string, fallback: string): string {
  const v = game.i18n.localize(path);
  return !v || v === path ? fallback : v;
}

function clampSlider(n: number): number {
  return Math.min(3, Math.max(-3, Math.trunc(n)));
}

function formatSigned(value: number): string {
  return value >= 0 ? `+${String(value)}` : String(value);
}

function parseForm(form: HTMLFormElement): CheckConfigureResult {
  const data = new FormData(form);
  const difficultyRaw = String(data.get("difficulty") ?? "trained");
  const difficulty = (
    DIFFICULTY_COLUMNS.includes(difficultyRaw as DifficultyColumn) ? difficultyRaw : "trained"
  ) as DifficultyColumn;
  const situational = Number.parseInt(String(data.get("situational") ?? "0"), 10) || 0;
  const advantageNet = Number.parseInt(String(data.get("advantageNet") ?? "0"), 10) || 0;
  return { difficulty, situational, advantageNet };
}

function wireAdvantageControls(root: HTMLElement): void {
  const slider = root.querySelector<HTMLInputElement>('input[name="advantageSlider"]');
  const number = root.querySelector<HTMLInputElement>('input[name="advantageNet"]');
  if (!slider || !number) return;
  slider.addEventListener("input", () => {
    number.value = slider.value;
  });
  number.addEventListener("input", () => {
    const parsed = Number.parseInt(number.value, 10);
    if (Number.isNaN(parsed)) return;
    slider.value = String(clampSlider(parsed));
  });
}

/**
 * Opt-in pre-roll dialog: difficulty button-radios, advantage net, situational mod.
 * Resolves with the chosen values, or `null` if cancelled.
 */
export async function promptCheckDialog(options: {
  title: string;
  modifiers: Modifier[];
  defaults?: Partial<CheckConfigureResult>;
}): Promise<CheckConfigureResult | null> {
  const defaults = { ...defaultCheckConfigure(), ...options.defaults };
  const difficulties = DIFFICULTY_COLUMNS.map((key) => ({
    key,
    label: localize(
      `KEDOM.DifficultyColumn.${key}`,
      key.charAt(0).toUpperCase() + key.slice(1),
    ),
    selected: key === defaults.difficulty,
  }));

  const content = await foundry.applications.handlebars.renderTemplate(TEMPLATE, {
    title: options.title,
    modifiers: options.modifiers.map((m) => ({
      label: m.label,
      signed: formatSigned(m.value),
    })),
    difficulties,
    difficulty: defaults.difficulty,
    situational: defaults.situational,
    advantageNet: defaults.advantageNet,
    advantageSlider: clampSlider(defaults.advantageNet),
  });

  try {
    const result = await foundry.applications.api.DialogV2.wait({
      window: { title: options.title },
      position: { width: 390 },
      content,
      classes: ["kedom", "kedom-check-dialog"],
      buttons: [
        {
          action: "roll",
          label: localize("KEDOM.Roll.Dialog.submit", "Roll"),
          icon: "fa-solid fa-dice-d20",
          default: true,
          callback: (_event, button, dialog) => {
            const root = dialog?.element ?? button.closest("dialog") ?? button.closest(".app");
            const form =
              button.form ??
              (root instanceof HTMLElement ? root.querySelector("form") : null);
            if (!(form instanceof HTMLFormElement)) return defaultCheckConfigure();
            return parseForm(form);
          },
        },
        {
          action: "cancel",
          label: localize("KEDOM.Roll.Dialog.cancel", "Cancel"),
        },
      ],
      render: (_event, dialog) => {
        const el = "element" in dialog ? dialog.element : null;
        if (el instanceof HTMLElement) wireAdvantageControls(el);
      },
      rejectClose: false,
    });
    if (result === "cancel" || result == null) return null;
    if (typeof result === "object" && "difficulty" in result) {
      return result as CheckConfigureResult;
    }
    return null;
  } catch {
    return null;
  }
}
