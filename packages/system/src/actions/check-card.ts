import { localize } from "../i18n/localize.ts";
import { degreeIcons, modifierTooltipParts } from "../rolls/tooltip-parts.ts";
import type { DifficultyColumn, GradedOutcome } from "../config/kedom.ts";
import { checkSubtitle } from "../rolls/check-subtitle.ts";

const CHECK_TEMPLATE = "systems/kedom/templates/chat/check.hbs";

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
    /** One muted line under the verdict, e.g. how close the roll was to the next outcome. */
    subtitle?: string;
    modifiers?: readonly { label: string; value: number }[];
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

    if (opts.subtitle !== undefined) {
      const sub = doc.createElement("span");
      sub.className = "kedom-chat-check__subtitle";
      sub.textContent = opts.subtitle;
      formula.append(sub);
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

function subtitleText(total: number, difficulty: DifficultyColumn): string {
  const { next } = checkSubtitle(total, difficulty);
  const difficultyLabel = localize(`KEDOM.DifficultyColumn.${difficulty}`, difficulty);
  if (!next) {
    return game.i18n.format("KEDOM.Roll.subtitleBest", { difficulty: difficultyLabel });
  }
  return game.i18n.format("KEDOM.Roll.subtitle", {
    difficulty: difficultyLabel,
    outcome: verdictFor({ kind: next.kind, degree: 1 }).verdictLabel,
    at: String(next.at),
  });
}

/** Build graded check HTML; optional Luck spend adjusts displayed total and tooltip. */
export async function renderGradedCheckContent(input: {
  roll: Roll;
  outcome: GradedOutcome;
  modifiers: readonly { label: string; value: number }[];
  effectiveTotal: number;
  luckSpent?: number;
  /** When given, the card says what the next outcome needs on this difficulty. */
  difficulty?: DifficultyColumn;
}): Promise<string> {
  const verdict = verdictFor(input.outcome);
  const icons = degreeIcons(input.outcome.degree, verdict.iconKind);
  const luckSpent = input.luckSpent ?? 0;
  const luckLabel = localize("KEDOM.Roll.modifier.luckSpend", "Luck");
  const modifiers =
    luckSpent > 0
      ? [...input.modifiers, { label: luckLabel, value: luckSpent }]
      : [...input.modifiers];

  const subtitle =
    input.difficulty !== undefined
      ? subtitleText(input.effectiveTotal, input.difficulty)
      : undefined;

  let rollHTML = styleCheckRollHTML(await input.roll.render(), {
    panelClass: verdict.panelClass,
    verdictLabel: verdict.verdictLabel,
    degreeIcons: icons,
    // The tooltip summary only repeated the verdict; the subtitle replaces it when present.
    outcomeSummary: subtitle !== undefined ? "" : verdict.verdictLabel,
    ...(subtitle !== undefined ? { subtitle } : {}),
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
