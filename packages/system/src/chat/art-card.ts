import type { ArtDataFields } from "../data/item/art.ts";

/** Post an art use chat card for the owning actor. */
export async function postArtUseChat(item: Item.Implementation): Promise<void> {
  const actor = item.actor;
  if (!actor) return;
  const system = item.system as unknown as ArtDataFields;
  const description = await TextEditor.enrichHTML(system.description ?? "", {
    secrets: false,
    relativeTo: item,
  });
  const commitment = system.commitment || "scene";
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
    author: game.user?.id,
    speaker: ChatMessage.implementation.getSpeaker({ actor }),
    content,
    style: CONST.CHAT_MESSAGE_STYLES.OTHER,
  });
}
