import { systemOf } from "../types/accessors.ts";
import { enrichHTML } from "../applications/enrich.ts";
import type { ArtDataFields } from "../data/item/art.ts";

/** Post an art use chat card for the owning actor. */
export async function postArtUseChat(item: Item.Implementation): Promise<void> {
  const actor = item.actor;
  if (!actor) return;
  // game.user is unset until Foundry finishes loading the session; the types claim otherwise.
  const user = game.user as User.Implementation | null | undefined;
  const system = systemOf<Partial<ArtDataFields>>(item);
  const description = await enrichHTML(system.description ?? "", {
    secrets: false,
    relativeTo: item,
  });
  // Items created before `commitment` existed may lack it (or hold an empty string).
  const stored: string | undefined = system.commitment;
  const commitment = stored === undefined || stored === "" ? "scene" : stored;
  const free = commitment === "free";
  const content = await foundry.applications.handlebars.renderTemplate(
    "systems/kedom/templates/chat/art.hbs",
    {
      name: item.name,
      img: item.img,
      description,
      commitmentLabel: game.i18n.localize(`KEDOM.Art.Commitment.${commitment}`),
      effortCost: !free,
      effortCostLabel: game.i18n.localize("KEDOM.Art.EffortCostOne"),
    },
  );
  await ChatMessage.implementation.create({
    author: user?.id,
    speaker: ChatMessage.implementation.getSpeaker({ actor: actor as Actor.Stored }),
    content,
    style: CONST.CHAT_MESSAGE_STYLES.OTHER,
  });
}
