import type { ArmorDataFields } from "../../data/item/armor.ts";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

export class ArmorSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static override DEFAULT_OPTIONS = {
    ...ItemSheetV2.DEFAULT_OPTIONS,
    classes: ["kedom", "sheet", "item", "armor"],
    position: { width: 420, height: 280 },
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
      template: "systems/kedom/templates/item/armor.hbs",
      classes: ["kedom-armor-sheet-body"],
    },
  };

  protected override async _prepareContext(
    options: foundry.applications.api.ApplicationV2.RenderOptions,
  ) {
    const context = await super._prepareContext(options);
    const system = this.item.system as unknown as ArmorDataFields;

    return Object.assign(context, {
      item: this.item,
      system,
      editable: this.isEditable,
    });
  }
}
