import { resolveFromFocus, strainSaveBand } from "../derivations/strain.ts";
import type { CharacterData } from "../data/actor/character.ts";
import { styleCheckRollHTML } from "./skill-check.ts";

const CHECK_TEMPLATE = "systems/kedom/templates/chat/check.hbs";

function localize(path: string, fallback: string): string {
  const v = game.i18n.localize(path);
  return !v || v === path ? fallback : v;
}

/** Strain Save: d20 vs Resolve and current Strain (Harm / Failure / Success). */
export async function rollStrainSave(actor: Actor.Implementation): Promise<void> {
  const system = actor.system as CharacterData;
  const foc = (system.abilities as { foc?: { value?: number } }).foc;
  const focusScore = foc?.value ?? 10;
  const attrs = system.attributes as {
    resolve?: number;
    strain?: { value?: number };
  };
  const resolve = attrs.resolve ?? resolveFromFocus(focusScore);
  const strain = attrs.strain?.value ?? 0;

  const roll = await new Roll("1d20").evaluate();
  const total = roll.total ?? 0;
  const band = strainSaveBand(total, resolve, strain);

  let panelClass: "success" | "failure" | "cost" = "success";
  let verdictLabel = localize("KEDOM.Outcome.success", "Success");
  let iconKind: "success" | "failure" = "success";
  if (band === "harm") {
    panelClass = "failure";
    verdictLabel = localize("KEDOM.Outcome.harm", "Harm");
    iconKind = "failure";
  } else if (band === "failure") {
    panelClass = "cost";
    verdictLabel = localize("KEDOM.Outcome.failure", "Failure");
    iconKind = "failure";
  }

  const degreeIcons = [{ cssClass: iconKind === "success" ? "fa-dice-d20" : "fa-skull", kind: iconKind }];

  const rollHTML = styleCheckRollHTML(await roll.render(), {
    panelClass,
    verdictLabel,
    degreeIcons,
    outcomeSummary: verdictLabel,
    modifiers: [],
  });

  const content = await foundry.applications.handlebars.renderTemplate(CHECK_TEMPLATE, {
    outcome: { kind: band, degree: 1 },
    rollHTML,
  });

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: actor as Actor.Stored }),
    flavor: game.i18n.format("KEDOM.Chat.StrainSaveFlavor", {
      resolve: String(resolve),
      strain: String(strain),
    }),
    content,
    rolls: [roll],
    sound: CONFIG.sounds.dice,
  });
}
