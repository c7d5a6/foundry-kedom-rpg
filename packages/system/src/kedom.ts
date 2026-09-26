import { CharacterData } from "./data/actor/character.ts";
import { FocusData } from "./data/item/focus.ts";
import { OriginData } from "./data/item/origin.ts";
import { WeaponData } from "./data/item/weapon.ts";
import { CharacterSheet } from "./applications/sheets/character-sheet.ts";
import { FocusSheet } from "./applications/sheets/focus-sheet.ts";
import { OriginSheet } from "./applications/sheets/origin-sheet.ts";
import { WeaponSheet } from "./applications/sheets/weapon-sheet.ts";
import { registerCharacterCreateDirectoryButton } from "./applications/apps/character-create-wizard.ts";
import { decorateAttackCardActions } from "./chat/attack-card-actions.ts";
import { decorateCheckCardActions } from "./chat/check-card-actions.ts";
import { decorateChatMessageHeader } from "./chat/decorate-message-header.ts";
import { decorateWoundCardActions } from "./chat/wound-card-actions.ts";
import { registerSettings } from "./settings.ts";

Hooks.once("init", () => {
  CONFIG.Actor.dataModels.character = CharacterData;
  // @ts-expect-error fvtt-types: Item subtypes from system.json are not augmented yet
  CONFIG.Item.dataModels.weapon = WeaponData;
  // @ts-expect-error fvtt-types: Item subtypes from system.json are not augmented yet
  CONFIG.Item.dataModels.origin = OriginData;
  // @ts-expect-error fvtt-types: Item subtypes from system.json are not augmented yet
  CONFIG.Item.dataModels.focus = FocusData;

  foundry.documents.collections.Actors.registerSheet("kedom", CharacterSheet, {
    types: ["character"],
    makeDefault: true,
    label: "KEDOM.Sheet.Character",
  });

  foundry.documents.collections.Items.registerSheet("kedom", WeaponSheet, {
    // @ts-expect-error fvtt-types: Item subtypes from system.json are not augmented yet
    types: ["weapon"],
    makeDefault: true,
    label: "KEDOM.Sheet.Weapon",
  });

  foundry.documents.collections.Items.registerSheet("kedom", OriginSheet, {
    // @ts-expect-error fvtt-types: Item subtypes from system.json are not augmented yet
    types: ["origin"],
    makeDefault: true,
    label: "KEDOM.Sheet.Origin",
  });

  foundry.documents.collections.Items.registerSheet("kedom", FocusSheet, {
    // @ts-expect-error fvtt-types: Item subtypes from system.json are not augmented yet
    types: ["focus"],
    makeDefault: true,
    label: "KEDOM.Sheet.Focus",
  });

  registerSettings();

  void foundry.applications.handlebars.loadTemplates([
    "systems/kedom/templates/chat/check.hbs",
    "systems/kedom/templates/chat/wound.hbs",
    "systems/kedom/templates/chat/attack.hbs",
    "systems/kedom/templates/chat/damage.hbs",
    "systems/kedom/templates/apps/check-dialog.hbs",
    "systems/kedom/templates/apps/create-character/wizard.hbs",
    "systems/kedom/templates/actor/partials/skill.hbs",
    "systems/kedom/templates/actor/partials/save.hbs",
    "systems/kedom/templates/item/weapon.hbs",
    "systems/kedom/templates/item/origin.hbs",
    "systems/kedom/templates/item/focus.hbs",
  ]);

  console.log("Kedom RPG | initialized (character + origin/focus/weapon + rolls)");
});

Hooks.on("renderActorDirectory", registerCharacterCreateDirectoryButton);

Hooks.on("renderChatMessageHTML", (message, html) => {
  decorateChatMessageHeader(message, html);
  decorateCheckCardActions(message, html);
  decorateWoundCardActions(message, html);
  decorateAttackCardActions(message, html);
});
