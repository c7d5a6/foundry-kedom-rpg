import {
  CLASS_SAVE_TRACKS,
  ORIGIN_SUBTYPES,
  normalizeOriginSubtype,
  type OriginDataFields,
} from "../../data/item/origin.ts";
import type { GrantsFields } from "../../data/item/grants.ts";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

type ClassJsonBlock = {
  talentPicks: OriginDataFields["talentPicks"];
  arts: OriginDataFields["arts"];
};

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

function formatClassJson(system: OriginDataFields): string {
  const block: ClassJsonBlock = {
    talentPicks: system.talentPicks ?? { warrior: 0, expert: 0, any: 0 },
    arts: system.arts ?? {
      skillKey: "",
      abilityKeys: [],
      receiveTableKey: "",
      artKeys: [],
    },
  };
  return JSON.stringify(block, null, 2);
}

function parseClassJson(raw: string): ClassJsonBlock | null {
  try {
    const parsed = JSON.parse(raw) as ClassJsonBlock;
    if (!parsed || typeof parsed !== "object") return null;
    return {
      talentPicks: {
        warrior: Number(parsed.talentPicks?.warrior) || 0,
        expert: Number(parsed.talentPicks?.expert) || 0,
        any: Number(parsed.talentPicks?.any) || 0,
      },
      arts: {
        skillKey: parsed.arts?.skillKey ?? "",
        abilityKeys: Array.isArray(parsed.arts?.abilityKeys) ? parsed.arts.abilityKeys : [],
        receiveTableKey: parsed.arts?.receiveTableKey ?? "",
        artKeys: Array.isArray(parsed.arts?.artKeys) ? parsed.arts.artKeys : [],
      },
    };
  } catch {
    return null;
  }
}

export class OriginSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static override DEFAULT_OPTIONS = {
    ...ItemSheetV2.DEFAULT_OPTIONS,
    classes: ["kedom", "sheet", "item", "origin"],
    position: { width: 480, height: 640 },
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
      systemFields: this.item.system.schema.fields,
      enrichedDescription: await TextEditor.enrichHTML(system.description ?? "", {
        secrets: this.item.isOwner,
        relativeTo: this.item,
      }),
      subTypeLabel: game.i18n.localize(`KEDOM.Origin.SubType.${subType}`),
      subTypeOptions: ORIGIN_SUBTYPES.map((value) => ({
        value,
        label: game.i18n.localize(`KEDOM.Origin.SubType.${value}`),
        selected: value === subType,
      })),
      saveTrackOptionsPrimary: CLASS_SAVE_TRACKS.map((value) => ({
        value,
        label: game.i18n.localize(`KEDOM.Save.${value}`),
        selected: system.saves?.primary?.save === value,
      })),
      saveTrackOptionsSecondary: CLASS_SAVE_TRACKS.map((value) => ({
        value,
        label: game.i18n.localize(`KEDOM.Save.${value}`),
        selected: system.saves?.secondary?.save === value,
      })),
      isClass: subType === "class",
      isRegion: subType === "region",
      grantsJson: formatGrantsJson(system.grants),
      classJson: formatClassJson(system),
      editable: this.isEditable,
    });
  }

  protected override _processFormData(
    event: SubmitEvent | null,
    form: HTMLFormElement,
    formData: foundry.applications.ux.FormDataExtended,
  ) {
    const data = super._processFormData(event, form, formData);
    const grantsRaw = form.querySelector<HTMLTextAreaElement>('textarea[name="grantsJson"]')?.value;
    if (grantsRaw !== undefined) {
      const parsed = parseGrantsJson(grantsRaw);
      if (parsed) {
        foundry.utils.setProperty(data, "system.grants", parsed);
      } else {
        ui.notifications.warn(game.i18n.localize("KEDOM.Error.InvalidGrantsJson"));
      }
    }
    const classRaw = form.querySelector<HTMLTextAreaElement>('textarea[name="classJson"]')?.value;
    if (classRaw !== undefined) {
      const parsed = parseClassJson(classRaw);
      if (parsed) {
        foundry.utils.setProperty(data, "system.talentPicks", parsed.talentPicks);
        foundry.utils.setProperty(data, "system.arts", parsed.arts);
      } else {
        ui.notifications.warn(game.i18n.localize("KEDOM.Error.InvalidClassJson"));
      }
    }
    const isFull = form.querySelector<HTMLInputElement>('input[name="system.isFull"]');
    if (isFull) {
      foundry.utils.setProperty(data, "system.isFull", isFull.checked);
    }
    return data;
  }
}
