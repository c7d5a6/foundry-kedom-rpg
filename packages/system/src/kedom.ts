import { CharacterData } from "./data/actor/character.ts";
import { ArmorData } from "./data/item/armor.ts";
import { ArtData } from "./data/item/art.ts";
import { OriginData } from "./data/item/origin.ts";
import { TalentData } from "./data/item/talent.ts";
import { WeaponData } from "./data/item/weapon.ts";
import { ArmorSheet } from "./applications/sheets/armor-sheet.ts";
import { ArtSheet } from "./applications/sheets/art-sheet.ts";
import { CharacterSheet } from "./applications/sheets/character-sheet.ts";
import { OriginSheet } from "./applications/sheets/origin-sheet.ts";
import { TalentSheet } from "./applications/sheets/talent-sheet.ts";
import { WeaponSheet } from "./applications/sheets/weapon-sheet.ts";
import { registerCharacterCreateDirectoryButton } from "./applications/apps/character-create-wizard.ts";
import { applyTalentAbilityGrants, revertItemAbilityGrants } from "./creation/apply-grants.ts";
import { decorateAttackCardActions } from "./chat/attack-card-actions.ts";
import { decorateCheckCardActions } from "./chat/check-card-actions.ts";
import { decorateChatMessageHeader } from "./chat/decorate-message-header.ts";
import { decorateWoundCardActions } from "./chat/wound-card-actions.ts";
import { loadOriginsCatalog } from "./creation/origins-catalog.ts";
import { registerMessageSocket } from "./chat/message-update.ts";
import { registerSettings } from "./settings.ts";

const ITEM_MODELS: [string, unknown][] = [
  ["weapon", WeaponData],
  ["armor", ArmorData],
  ["origin", OriginData],
  ["talent", TalentData],
  ["art", ArtData],
];

const ITEM_SHEETS: [string, unknown, string][] = [
  ["weapon", WeaponSheet, "KEDOM.Sheet.Weapon"],
  ["armor", ArmorSheet, "KEDOM.Sheet.Armor"],
  ["origin", OriginSheet, "KEDOM.Sheet.Origin"],
  ["talent", TalentSheet, "KEDOM.Sheet.Talent"],
  ["art", ArtSheet, "KEDOM.Sheet.Art"],
];

Hooks.once("init", () => {
  // Keep transfer effects on Items; apply via allApplicableEffects (Foundry v11+).
  CONFIG.ActiveEffect.legacyTransferral = false;

  CONFIG.Actor.dataModels.character = CharacterData;
  // fvtt-types: Item subtypes from system.json are not augmented yet, so go through a loose view.
  const itemModels = CONFIG.Item.dataModels as unknown as Record<string, unknown>;
  for (const [type, model] of ITEM_MODELS) itemModels[type] = model;

  foundry.documents.collections.Actors.registerSheet("kedom", CharacterSheet, {
    types: ["character"],
    makeDefault: true,
    label: "KEDOM.Sheet.Character",
  });

  const itemSheets = foundry.documents.collections.Items as unknown as {
    registerSheet(
      scope: string,
      sheet: unknown,
      options: { types: string[]; makeDefault: boolean; label: string },
    ): void;
  };
  for (const [type, sheet, label] of ITEM_SHEETS) {
    itemSheets.registerSheet("kedom", sheet, { types: [type], makeDefault: true, label });
  }

  registerSettings();

  void foundry.applications.handlebars.loadTemplates([
    "systems/kedom/templates/chat/check.hbs",
    "systems/kedom/templates/chat/wound.hbs",
    "systems/kedom/templates/chat/attack.hbs",
    "systems/kedom/templates/chat/damage.hbs",
    "systems/kedom/templates/chat/art.hbs",
    "systems/kedom/templates/apps/check-dialog.hbs",
    "systems/kedom/templates/apps/create-character/wizard.hbs",
    "systems/kedom/templates/actor/partials/skill.hbs",
    "systems/kedom/templates/actor/partials/save.hbs",
    "systems/kedom/templates/item/weapon.hbs",
    "systems/kedom/templates/item/armor.hbs",
    "systems/kedom/templates/item/origin.hbs",
    "systems/kedom/templates/item/talent.hbs",
    "systems/kedom/templates/item/art.hbs",
  ]);

});

Hooks.on("renderActorDirectory", registerCharacterCreateDirectoryButton);

/** The character actor owning `item`, or null (world items, other actor types). */
function characterParent(item: Item.Implementation): Actor.Implementation | null {
  const parent = item.parent;
  if (!parent || parent.documentName !== "Actor") return null;
  return (parent as Actor.Implementation).type === "character"
    ? (parent as Actor.Implementation)
    : null;
}

/** When a talent is added to a character, apply skill/ability grants (with level-gate overflow). */
function onCreateItem(
  item: Item.Implementation,
  _data: unknown,
  _options: unknown,
  userId: string,
): void {
  if (game.userId !== userId) return;
  if ((item.type as string) !== "talent") return;
  const actor = characterParent(item);
  if (actor) void applyTalentAbilityGrants(actor, item);
}

// fvtt-types: Hooks.on overload resolution is excessively deep for Item hooks.
Hooks.on("createItem", onCreateItem as never);

/** When a talent/origin leaves a character, undo the ability bumps it granted. */
Hooks.on(
  "deleteItem",
  (item: Item.Implementation, _options: unknown, userId: string) => {
    if (game.userId !== userId) return;
    const type = item.type as string;
    if (type !== "talent" && type !== "origin") return;
    const actor = characterParent(item);
    if (!actor) return;
    revertItemAbilityGrants(actor, item).catch((err: unknown) => {
      console.error("Kedom | grant revert failed", err);
    });
  },
);

Hooks.once("ready", () => {
  registerMessageSocket();
  // Warm the origins catalog (loads every pack document) off the critical path so the
  // creation wizard opens instantly.
  if (!game.user.can("ACTOR_CREATE")) return;
  const warm = (): void => {
    loadOriginsCatalog().catch((err: unknown) => {
      console.warn("Kedom | catalog prewarm failed", err);
    });
  };
  if ("requestIdleCallback" in window) window.requestIdleCallback(warm, { timeout: 10_000 });
  else setTimeout(warm, 2000);
});

Hooks.on("renderChatMessageHTML", (message, html) => {
  decorateChatMessageHeader(message, html);
  decorateCheckCardActions(message, html);
  decorateWoundCardActions(message, html);
  decorateAttackCardActions(message, html);
});
