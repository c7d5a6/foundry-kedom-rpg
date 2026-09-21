import { CharacterData } from "./data/actor/character.ts";
import { CharacterSheet } from "./applications/sheets/character-sheet.ts";
import { placeCheckDegreeIcons } from "./rolls/skill-check.ts";

Hooks.once("init", () => {
  CONFIG.Actor.dataModels.character = CharacterData;

  foundry.documents.collections.Actors.registerSheet("kedom", CharacterSheet, {
    types: ["character"],
    makeDefault: true,
    label: "KEDOM.Sheet.Character",
  });

  void foundry.applications.handlebars.loadTemplates(["systems/kedom/templates/chat/check.hbs"]);

  console.log("Kedom RPG | initialized (barebone character + skill checks)");
});

Hooks.on("renderChatMessageHTML", (_message, html) => {
  placeCheckDegreeIcons(html);
});
