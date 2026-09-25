import type { GradedOutcome } from "../config/kedom.ts";

const CHECK_TEMPLATE = "systems/kedom/templates/chat/check.hbs";

function localize(path: string, fallback: string): string {
  const v = game.i18n.localize(path);
  return !v || v === path ? fallback : v;
}

export function verdictFor(outcome: GradedOutcome): {
  verdictKind: "success" | "failure" | "cost";
  verdictLabel: string;
  iconKind: "success" | "failure";
  panelClass: "success" | "failure" | "cost";
} {
  if (outcome.kind === "failure") {
    return {
      verdictKind: "failure",
      verdictLabel: localize("KEDOM.Outcome.failure", "Failure"),
      iconKind: "failure",
      panelClass: "failure",
    };
  }
  if (outcome.kind === "cost") {
    return {
      verdictKind: "cost",
      verdictLabel: localize("KEDOM.Outcome.cost", "Success at a Cost"),
      iconKind: "success",
      panelClass: "cost",
    };
  }
  return {
    verdictKind: "success",
    verdictLabel: localize("KEDOM.Outcome.success", "Success"),
    iconKind: "success",
    panelClass: "success",
  };
}

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
  modifiers: ReadonlyArray<{ label: string; value: number }>,
): { formula: string; flavor: string; total: number }[] {
  return modifiers.map((mod) => ({
    formula: mod.value >= 0 ? `+${String(mod.value)}` : String(mod.value),
    flavor: mod.label,
    total: mod.value,
  }));
}

/**
 * Restyle Foundry's default roll HTML into a CoC-like card:
 * clickable success/fail panel → expand for dice + modifiers → total below.
 */
export function styleCheckRollHTML(
  rollHTML: string,
  opts: {
    panelClass: "success" | "failure" | "cost";
    verdictLabel: string;
    degreeIcons: { cssClass: string; kind: string }[];
    outcomeSummary: string;
    modifiers?: ReadonlyArray<{ label: string; value: number }>;
  },
): string {
  const doc = new DOMParser().parseFromString(rollHTML, "text/html");
  const root = doc.body.firstElementChild;
  if (!(root instanceof HTMLElement)) return rollHTML;

  const diceRoll = root.matches(".dice-roll") ? root : root.querySelector(".dice-roll");
  if (diceRoll instanceof HTMLElement) {
    diceRoll.setAttribute("data-action", "expandRoll");
  }

  const formula = root.querySelector(".dice-formula");
  if (formula instanceof HTMLElement) {
    formula.classList.remove("success", "failure", "cost");
    formula.classList.add(opts.panelClass);
    formula.replaceChildren();

    const text = doc.createElement("span");
    text.className = "kedom-chat-check__verdict-text";
    text.textContent = opts.verdictLabel;
    formula.append(text);

    if (opts.degreeIcons.length > 0) {
      formula.append(doc.createTextNode(" "));
      const iconsWrap = doc.createElement("span");
      iconsWrap.className = "kedom-chat-check__roll-icons";
      iconsWrap.setAttribute("aria-hidden", "true");
      for (const icon of opts.degreeIcons) {
        const el = doc.createElement("i");
        el.className = `fas ${icon.cssClass} kedom-chat-check__degree kedom-chat-check__degree--${icon.kind}`;
        iconsWrap.append(el);
      }
      formula.append(iconsWrap);
    }
  }

  const total = root.querySelector(".dice-total");
  if (total instanceof HTMLElement) {
    total.classList.remove("success", "failure", "cost");
    total.classList.add(opts.panelClass);
  }

  const tooltip =
    root.querySelector(".dice-tooltip .wrapper") ?? root.querySelector(".dice-tooltip");
  if (tooltip instanceof HTMLElement) {
    for (const part of modifierTooltipParts(opts.modifiers ?? [])) {
      const section = doc.createElement("section");
      section.className = "tooltip-part kedom-chat-check__modifier";

      const dice = doc.createElement("div");
      dice.className = "dice";

      const header = doc.createElement("header");
      header.className = "part-header flexrow";

      const partFormula = doc.createElement("span");
      partFormula.className = "part-formula";
      partFormula.textContent = part.formula;
      header.append(partFormula);

      if (part.flavor) {
        const partFlavor = doc.createElement("span");
        partFlavor.className = "part-flavor";
        partFlavor.textContent = part.flavor;
        header.append(partFlavor);
      }

      const partTotal = doc.createElement("span");
      partTotal.className = "part-total";
      partTotal.textContent = String(part.total);
      header.append(partTotal);

      dice.append(header);
      section.append(dice);
      tooltip.append(section);
    }

    if (opts.outcomeSummary) {
      const summary = doc.createElement("div");
      summary.className = "kedom-chat-check__summary";
      summary.textContent = opts.outcomeSummary;
      tooltip.append(summary);
    }
  }

  /* CoC order: formula → tooltip → total (Foundry sometimes puts total before tooltip). */
  const result = root.querySelector(".dice-result");
  const tooltipEl = root.querySelector(".dice-tooltip");
  if (
    result instanceof HTMLElement &&
    tooltipEl instanceof HTMLElement &&
    total instanceof HTMLElement
  ) {
    result.append(tooltipEl, total);
  }

  return root.outerHTML;
}

function setDiceTotalText(rollHTML: string, total: number): string {
  const doc = new DOMParser().parseFromString(rollHTML, "text/html");
  const totalEl = doc.body.querySelector(".dice-total");
  if (totalEl instanceof HTMLElement) {
    totalEl.textContent = String(total);
  }
  const root = doc.body.firstElementChild;
  return root instanceof HTMLElement ? root.outerHTML : rollHTML;
}

/** Build graded check HTML; optional Luck spend adjusts displayed total and tooltip. */
export async function renderGradedCheckContent(input: {
  roll: Roll;
  outcome: GradedOutcome;
  modifiers: ReadonlyArray<{ label: string; value: number }>;
  effectiveTotal: number;
  luckSpent?: number;
}): Promise<string> {
  const verdict = verdictFor(input.outcome);
  const icons = degreeIcons(input.outcome.degree, verdict.iconKind);
  const luckSpent = input.luckSpent ?? 0;
  const luckLabel = localize("KEDOM.Roll.modifier.luckSpend", "Luck");
  const modifiers =
    luckSpent > 0
      ? [...input.modifiers, { label: luckLabel, value: luckSpent }]
      : [...input.modifiers];

  let rollHTML = styleCheckRollHTML(await input.roll.render(), {
    panelClass: verdict.panelClass,
    verdictLabel: verdict.verdictLabel,
    degreeIcons: icons,
    outcomeSummary: verdict.verdictLabel,
    modifiers,
  });

  if (input.effectiveTotal !== (input.roll.total ?? 0) || luckSpent > 0) {
    rollHTML = setDiceTotalText(rollHTML, input.effectiveTotal);
  }

  return foundry.applications.handlebars.renderTemplate(CHECK_TEMPLATE, {
    outcome: input.outcome,
    rollHTML,
  });
}
