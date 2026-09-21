import { CharacterData } from "./data/actor/character.ts";
import { CharacterSheet } from "./applications/sheets/character-sheet.ts";

Hooks.once("init", () => {
  CONFIG.Actor.dataModels.character = CharacterData;

  foundry.documents.collections.Actors.registerSheet("kedom", CharacterSheet, {
    types: ["character"],
    makeDefault: true,
    label: "KEDOM.Sheet.Character",
  });

  console.log("Kedom RPG | initialized (barebone character + skill checks)");
});
