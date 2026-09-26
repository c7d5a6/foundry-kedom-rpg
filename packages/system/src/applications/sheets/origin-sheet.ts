import {
  ORIGIN_SUBTYPES,
  normalizeOriginSubtype,
  type OriginDataFields,
} from "../../data/item/origin.ts";
import type { GrantsFields } from "../../data/item/grants.ts";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

function formatGrantsJson(grants: GrantsFields | undefined): string {
  const g = grants ?? { skills: [], specializations: [], abilities: [] };
  return JSON.stringify(g, null, 2);
}

function parseGrantsJson(raw: string): GrantsFields | null {
  try {
    const parsed = JSON.parse(raw) as GrantsFields;
    if (!parsed || typeof parsed !== "object") return null;
    return {
      skills: Array.isArray(parsed.skills) ? parsed.skills : [],
      specializations: Array.isArray(parsed.specializations) ? parsed.specializations : [],
      abilities: Array.isArray(parsed.abilities) ? parsed.abilities : [],
    };
  } catch {
    return null;
  }
}

export class OriginSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static override DEFAULT_OPTIONS = {
    ...ItemSheetV2.DEFAULT_OPTIONS,
    classes: ["kedom", "sheet", "item", "origin"],
    position: { width: 460, height: 520 },
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
      template: "systems/kedom/templates/item/origin.hbs",
      classes: ["kedom-origin-sheet-body"],
    },
  };

  protected override async _prepareContext(
    options: foundry.applications.api.ApplicationV2.RenderOptions,
  ) {
    const context = await super._prepareContext(options);
    const system = this.item.system as unknown as OriginDataFields;
    const subType = normalizeOriginSubtype(system.subType);

    return Object.assign(context, {
      item: this.item,
      system: { ...system, subType },
      subTypeLabel: game.i18n.localize(`KEDOM.Origin.SubType.${subType}`),
      subTypeOptions: ORIGIN_SUBTYPES.map((value) => ({
        value,
        label: game.i18n.localize(`KEDOM.Origin.SubType.${value}`),
        selected: value === subType,
      })),
      isClass: subType === "class",
      grantsJson: formatGrantsJson(system.grants),
      editable: this.isEditable,
    });
  }

  protected override _processFormData(
    event: SubmitEvent | null,
    form: HTMLFormElement,
    formData: foundry.applications.ux.FormDataExtended,
  ) {
    const data = super._processFormData(event, form, formData);
    const raw = form.querySelector<HTMLTextAreaElement>('textarea[name="grantsJson"]')?.value;
    if (raw !== undefined) {
      const parsed = parseGrantsJson(raw);
      if (parsed) {
        foundry.utils.setProperty(data, "system.grants", parsed);
      } else {
        ui.notifications.warn(game.i18n.localize("KEDOM.Error.InvalidGrantsJson"));
      }
    }
    return data;
  }
}
