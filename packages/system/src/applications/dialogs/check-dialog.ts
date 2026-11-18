import { localize } from "../../i18n/localize.ts";
import { DIFFICULTY_COLUMNS, type DifficultyColumn } from "../../config/kedom.ts";
import { skillCheckDiceTerm } from "../../rolls/advantage.ts";
import { bandRows } from "../../rolls/band-table.ts";
import type { Modifier } from "../../rolls/collectors.ts";
import { defaultCheckConfigure, type CheckConfigureResult } from "../../rolls/check-configure.ts";

const TEMPLATE = "systems/kedom/templates/apps/check-dialog.hbs";

function clampSlider(n: number): number {
  return Math.min(3, Math.max(-3, Math.trunc(n)));
}

function formatSigned(value: number): string {
  return value >= 0 ? `+${String(value)}` : String(value);
}

function parseForm(form: HTMLFormElement, defaults: CheckConfigureResult): CheckConfigureResult {
  const data = new FormData(form);
  const difficultyRaw = String(data.get("difficulty") ?? "trained");
  const difficulty = (
    DIFFICULTY_COLUMNS.includes(difficultyRaw as DifficultyColumn) ? difficultyRaw : "trained"
  ) as DifficultyColumn;
  const situational = Number.parseInt(String(data.get("situational") ?? "0"), 10) || 0;
  const advantageNet = Number.parseInt(String(data.get("advantageNet") ?? "0"), 10) || 0;
  return { difficulty, situational, advantageNet, baseDice: defaults.baseDice };
}

function wireAdvantageControls(root: HTMLElement, diceTerm: (net: number) => string): void {
  const slider = root.querySelector<HTMLInputElement>('input[name="advantageSlider"]');
  const number = root.querySelector<HTMLInputElement>('input[name="advantageNet"]');
  const diceLine = root.querySelector<HTMLElement>(".kedom-check-dialog__dice-term");
  const updateDice = (): void => {
    const net = Number.parseInt(number?.value ?? "0", 10) || 0;
    if (diceLine) diceLine.textContent = diceTerm(net);
  };
  if (!slider || !number) return;
  slider.addEventListener("input", () => {
    number.value = slider.value;
    updateDice();
  });
  number.addEventListener("input", () => {
    const parsed = Number.parseInt(number.value, 10);
    if (Number.isNaN(parsed)) return;
    slider.value = String(clampSlider(parsed));
    updateDice();
  });
}

/** Highlight the band-table column of the selected difficulty. */
function wireBandTable(root: HTMLElement): void {
  const table = root.querySelector<HTMLElement>(".kedom-check-dialog__bands");
  if (!table) return;
  const sync = (): void => {
    const selected = root.querySelector<HTMLInputElement>('input[name="difficulty"]:checked');
    table.dataset.selected = selected?.value ?? "";
  };
  for (const radio of root.querySelectorAll<HTMLInputElement>('input[name="difficulty"]')) {
    radio.addEventListener("change", sync);
  }
  sync();
}

/**
 * Opt-in pre-roll dialog: difficulty button-radios, advantage net, situational mod.
 * Resolves with the chosen values, or `null` if cancelled.
 */
export async function promptCheckDialog(options: {
  title: string;
  modifiers: Modifier[];
  defaults?: Partial<CheckConfigureResult>;
  /** Dice expression for a given advantage net (skill checks 2d10, Luck save d20). */
  diceTerm?: (net: number) => string;
}): Promise<CheckConfigureResult | null> {
  const defaults = { ...defaultCheckConfigure(), ...options.defaults };
  const diceTerm =
    options.diceTerm ?? ((net: number) => skillCheckDiceTerm(net, defaults.baseDice));
  const outcomeLabel = (o: { kind: string; degree: number }): string => {
    if (o.kind === "cost") return localize("KEDOM.Roll.Dialog.bandCost", "Cost");
    const word =
      o.kind === "failure"
        ? localize("KEDOM.Outcome.failure", "Failure")
        : localize("KEDOM.Outcome.success", "Success");
    return `${word} ${String(o.degree)}`;
  };
  const rows = bandRows().map((row) => ({
    range: row.range,
    cells: DIFFICULTY_COLUMNS.map((key) => ({
      key,
      kind: row.outcomes[key].kind,
      label: outcomeLabel(row.outcomes[key]),
    })),
  }));
  const difficulties = DIFFICULTY_COLUMNS.map((key) => ({
    key,
    label: localize(`KEDOM.DifficultyColumn.${key}`, key.charAt(0).toUpperCase() + key.slice(1)),
    selected: key === defaults.difficulty,
  }));

  const content = await foundry.applications.handlebars.renderTemplate(TEMPLATE, {
    title: options.title,
    modifiers: options.modifiers.map((m) => ({
      label: m.label,
      signed: formatSigned(m.value),
    })),
    difficulties,
    bandRows: rows,
    diceLine: diceTerm(defaults.advantageNet),
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
              button.form ?? (root instanceof HTMLElement ? root.querySelector("form") : null);
            if (!(form instanceof HTMLFormElement)) return defaultCheckConfigure();
            return parseForm(form, defaults);
          },
        },
        {
          action: "cancel",
          label: localize("KEDOM.Roll.Dialog.cancel", "Cancel"),
        },
      ],
      render: (_event, dialog) => {
        const el = "element" in dialog ? dialog.element : null;
        if (el instanceof HTMLElement) {
          wireAdvantageControls(el, diceTerm);
          wireBandTable(el);
        }
      },
      rejectClose: false,
    });
    if (result === "cancel" || result == null) return null;
    if (typeof result === "object" && "difficulty" in result) {
      return result;
    }
    return null;
  } catch {
    return null;
  }
}
