import {
  WEAPON_SKILL_KEYS,
  normalizeWeaponSkill,
  type WeaponDataFields,
} from "../../data/item/weapon.ts";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

export class WeaponSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static override DEFAULT_OPTIONS = {
    ...ItemSheetV2.DEFAULT_OPTIONS,
    classes: ["kedom", "sheet", "item", "weapon"],
    position: { width: 420, height: 360 },
    window: {
      ...ItemSheetV2.DEFAULT_OPTIONS.window,
      resizable: true,
    },
    form: {
      submitOnChange: true,
      closeOnSubmit: false,
    },
  };

  static override PARTS = {
    body: {
      template: "systems/kedom/templates/item/weapon.hbs",
      classes: ["kedom-weapon-sheet-body"],
    },
  };

  protected override async _prepareContext(
    options: foundry.applications.api.ApplicationV2.RenderOptions,
  ) {
    const context = await super._prepareContext(options);
    const system = this.item.system as unknown as WeaponDataFields;
    const skill = normalizeWeaponSkill(system.skill);

    const skillOptions = WEAPON_SKILL_KEYS.map((value) => ({
      value,
      label: game.i18n.localize(`KEDOM.Skill.${value}`),
      selected: value === skill,
    }));

    return Object.assign(context, {
      item: this.item,
      system: { ...system, skill },
      skillLabel: game.i18n.localize(`KEDOM.Skill.${skill}`),
      skillOptions,
      editable: this.isEditable,
    });
  }
}
