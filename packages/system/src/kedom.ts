import { CharacterData } from "./data/actor/character.ts";
import { ArmorData } from "./data/item/armor.ts";
import { OriginData } from "./data/item/origin.ts";
import { TalentData } from "./data/item/talent.ts";
import { WeaponData } from "./data/item/weapon.ts";
import { ArmorSheet } from "./applications/sheets/armor-sheet.ts";
import { CharacterSheet } from "./applications/sheets/character-sheet.ts";
import { OriginSheet } from "./applications/sheets/origin-sheet.ts";
import { TalentSheet } from "./applications/sheets/talent-sheet.ts";
import { WeaponSheet } from "./applications/sheets/weapon-sheet.ts";
import { registerCharacterCreateDirectoryButton } from "./applications/apps/character-create-wizard.ts";
import { applyTalentAbilityGrants } from "./creation/apply-grants.ts";
import { decorateAttackCardActions } from "./chat/attack-card-actions.ts";
import { decorateCheckCardActions } from "./chat/check-card-actions.ts";
import { decorateChatMessageHeader } from "./chat/decorate-message-header.ts";
import { decorateWoundCardActions } from "./chat/wound-card-actions.ts";
import { registerSettings } from "./settings.ts";

Hooks.once("init", () => {
  // Keep transfer effects on Items; apply via allApplicableEffects (Foundry v11+).
  CONFIG.ActiveEffect.legacyTransferral = false;

  CONFIG.Actor.dataModels.character = CharacterData;
  // @ts-expect-error fvtt-types: Item subtypes from system.json are not augmented yet
  CONFIG.Item.dataModels.weapon = WeaponData;
  // @ts-expect-error fvtt-types: Item subtypes from system.json are not augmented yet
  CONFIG.Item.dataModels.armor = ArmorData;
  // @ts-expect-error fvtt-types: Item subtypes from system.json are not augmented yet
  CONFIG.Item.dataModels.origin = OriginData;
  // @ts-expect-error fvtt-types: Item subtypes from system.json are not augmented yet
  CONFIG.Item.dataModels.talent = TalentData;

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

  foundry.documents.collections.Items.registerSheet("kedom", ArmorSheet, {
    // @ts-expect-error fvtt-types: Item subtypes from system.json are not augmented yet
    types: ["armor"],
    makeDefault: true,
    label: "KEDOM.Sheet.Armor",
  });

  foundry.documents.collections.Items.registerSheet("kedom", OriginSheet, {
    // @ts-expect-error fvtt-types: Item subtypes from system.json are not augmented yet
    types: ["origin"],
    makeDefault: true,
    label: "KEDOM.Sheet.Origin",
  });

  foundry.documents.collections.Items.registerSheet("kedom", TalentSheet, {
    // @ts-expect-error fvtt-types: Item subtypes from system.json are not augmented yet
    types: ["talent"],
    makeDefault: true,
    label: "KEDOM.Sheet.Talent",
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
    "systems/kedom/templates/item/armor.hbs",
    "systems/kedom/templates/item/origin.hbs",
    "systems/kedom/templates/item/talent.hbs",
  ]);

  console.log("Kedom RPG | initialized (character + origin/talent/weapon/armor + rolls + AE)");
});

Hooks.on("renderActorDirectory", registerCharacterCreateDirectoryButton);

/** When a talent is added to a character, apply skill/ability grants (with level-gate overflow). */
Hooks.on(
  "createItem",
  (item: Item.Implementation, _data: unknown, _options: unknown, userId: string) => {
    if (game.userId !== userId) return;
    if ((item.type as string) !== "talent") return;
    const parent = item.parent;
    if (!parent || parent.documentName !== "Actor") return;
    if ((parent as Actor.Implementation).type !== "character") return;
    void applyTalentAbilityGrants(parent as Actor.Implementation, item);
  },
);

Hooks.on("renderChatMessageHTML", (message, html) => {
  decorateChatMessageHeader(message, html);
  decorateCheckCardActions(message, html);
  decorateWoundCardActions(message, html);
  decorateAttackCardActions(message, html);
});
