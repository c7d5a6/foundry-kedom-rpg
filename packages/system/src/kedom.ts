import { CharacterData } from "./data/actor/character.ts";
import { CharacterSheet } from "./applications/sheets/character-sheet.ts";
import { decorateCheckCardActions } from "./chat/check-card-actions.ts";
import { decorateChatMessageHeader } from "./chat/decorate-message-header.ts";
import { decorateWoundCardActions } from "./chat/wound-card-actions.ts";
import { registerSettings } from "./settings.ts";

Hooks.once("init", () => {
  CONFIG.Actor.dataModels.character = CharacterData;

  foundry.documents.collections.Actors.registerSheet("kedom", CharacterSheet, {
    types: ["character"],
    makeDefault: true,
    label: "KEDOM.Sheet.Character",
  });

  registerSettings();

  void foundry.applications.handlebars.loadTemplates([
    "systems/kedom/templates/chat/check.hbs",
    "systems/kedom/templates/chat/wound.hbs",
    "systems/kedom/templates/apps/check-dialog.hbs",
    "systems/kedom/templates/actor/partials/skill.hbs",
    "systems/kedom/templates/actor/partials/save.hbs",
  ]);

  console.log("Kedom RPG | initialized (barebone character + skill checks)");
});

Hooks.on("renderChatMessageHTML", (message, html) => {
  decorateChatMessageHeader(message, html);
  decorateCheckCardActions(message, html);
  decorateWoundCardActions(message, html);
});
