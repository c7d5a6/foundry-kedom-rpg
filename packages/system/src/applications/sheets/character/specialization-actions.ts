import {
  SKILL_FREE_PARAMETER,
  SKILL_SPECIALIZATION_KIND,
  allowsFreeSpecialization,
  freeParameterSpecializationSlug,
  freeSpecializationSlug,
} from "../../../config/specializations.ts";
import type { SkillKey } from "../../../config/kedom.ts";
import type { SkillFields } from "../../../data/actor/character.ts";
import { characterData } from "../../../types/accessors.ts";
import { rollSkillCheck } from "../../../actions/skill-check.ts";
import {
  countSelectedSpecializations,
  isSkillKey,
  isSpecializationSelected,
  localizeSpecLabel,
  requireOwnership,
  specializationSlots,
  type SheetHost,
} from "./helpers.ts";

export async function onRollSpecialization(
  this: SheetHost,
  event: PointerEvent,
  target: HTMLElement,
): Promise<void> {
  if (this.isEditMode) return;
  if (!requireOwnership(this)) return;
  const skillKey = target.dataset.skillKey;
  const specializationSlug = target.dataset.specializationSlug;
  if (!isSkillKey(skillKey) || specializationSlug === undefined || specializationSlug === "")
    return;
  await rollSkillCheck(this.actor, skillKey, {
    specializationSlug,
    configure: event.ctrlKey || event.metaKey,
  });
}

export async function onToggleSpecialization(
  this: SheetHost,
  _event: PointerEvent,
  target: HTMLElement,
): Promise<void> {
  if (!this.isEditMode) return;
  const skillKey = target.dataset.skillKey;
  const slug = target.dataset.specializationSlug;
  if (skillKey === undefined || skillKey === "" || slug === undefined || slug === "") return;

  const system = characterData(this.actor);
  const skill = (system.skills as Record<SkillKey, SkillFields>)[skillKey];
  if (!skill) return;

  const kind = SKILL_SPECIALIZATION_KIND[skillKey] ?? "none";
  const isFreeForm = target.dataset.free === "1";
  const existing = skill.specializations.find((s) => s.slug === slug);
  const currentlySelected = existing !== undefined && isSpecializationSelected(existing);

  if (currentlySelected) {
    if (kind === "fixed" || (kind === "parameterized" && !isFreeForm)) {
      await this.actor.update({
        [`system.skills.${skillKey}.specializations`]: skill.specializations.filter(
          (s) => s.slug !== slug,
        ),
      });
      return;
    }
    const specializations = skill.specializations.map((s) =>
      s.slug === slug ? { ...s, selected: false } : s,
    );
    await this.actor.update({ [`system.skills.${skillKey}.specializations`]: specializations });
    return;
  }

  const slots = specializationSlots(skill.proficiency);
  if (countSelectedSpecializations(skill) >= slots) {
    ui.notifications.warn(
      game.i18n.format("KEDOM.Sheet.SpecializationSelectBlocked", {
        slots: String(slots),
        proficiency: game.i18n.localize(`KEDOM.Proficiency.${skill.proficiency}`),
      }),
    );
    return;
  }

  if (kind === "fixed" || (kind === "parameterized" && !isFreeForm)) {
    const leaf = target.dataset.specializationLeaf;
    if (leaf === undefined || leaf === "") return;
    const label = localizeSpecLabel(skillKey, leaf);
    await appendSpecialization(this.actor, skillKey, slug, label, true);
    return;
  }

  if (!existing) return;
  const specializations = skill.specializations.map((s) =>
    s.slug === slug ? { ...s, selected: true } : s,
  );
  await this.actor.update({ [`system.skills.${skillKey}.specializations`]: specializations });
}

export async function onAddSpecialization(
  this: SheetHost,
  _event: PointerEvent,
  target: HTMLElement,
): Promise<void> {
  const skillKey = target.dataset.skillKey;
  if (skillKey === undefined || skillKey === "" || !this.isEditMode) return;
  const kind = SKILL_SPECIALIZATION_KIND[skillKey] ?? "none";
  if (!allowsFreeSpecialization(kind)) return;

  const label = await promptFreeLabel(skillKey);
  if (label === null) return;
  const parameter = SKILL_FREE_PARAMETER[skillKey];
  const slug =
    parameter !== undefined
      ? freeParameterSpecializationSlug(skillKey, parameter, label)
      : freeSpecializationSlug(skillKey, label);
  const system = characterData(this.actor);
  const skill = (system.skills as Record<SkillKey, SkillFields>)[skillKey];
  if (!skill) return;
  if (skill.specializations.some((s) => s.slug === slug)) return;

  const slots = specializationSlots(skill.proficiency);
  const selected = countSelectedSpecializations(skill) < slots;
  await appendSpecialization(this.actor, skillKey, slug, label, selected);
}

export async function onRemoveSpecialization(
  this: SheetHost,
  _event: PointerEvent,
  target: HTMLElement,
): Promise<void> {
  const skillKey = target.dataset.skillKey;
  const slug = target.dataset.specializationSlug;
  if (skillKey === undefined || skillKey === "" || slug === undefined || slug === "") return;
  if (!allowsFreeSpecialization(SKILL_SPECIALIZATION_KIND[skillKey] ?? "none")) return;
  const system = characterData(this.actor);
  const skill = (system.skills as Record<SkillKey, SkillFields>)[skillKey];
  if (!skill) return;
  const specializations = skill.specializations.filter((s) => s.slug !== slug);
  await this.actor.update({ [`system.skills.${skillKey}.specializations`]: specializations });
}

async function appendSpecialization(
  actor: Actor.Implementation,
  skillKey: SkillKey,
  slug: string,
  label: string,
  selected: boolean,
): Promise<void> {
  const system = characterData(actor);
  const skill = (system.skills as Record<SkillKey, SkillFields>)[skillKey];
  if (!skill) return;
  if (skill.specializations.some((s) => s.slug === slug)) return;
  await actor.update({
    [`system.skills.${skillKey}.specializations`]: [
      ...skill.specializations,
      { slug, label, selected },
    ],
  });
}

async function promptFreeLabel(skillKey: SkillKey): Promise<string | null> {
  const skillLabel = game.i18n.localize(`KEDOM.Skill.${skillKey}`);
  try {
    const result: unknown = await foundry.applications.api.DialogV2.prompt({
      window: {
        title: game.i18n.format("KEDOM.Sheet.Action.addSpecialization", { skill: skillLabel }),
      },
      content: `<p><label>${game.i18n.localize("KEDOM.Sheet.SpecializationLabel")}
        <input type="text" name="label" autofocus /></label></p>`,
      ok: {
        label: game.i18n.localize("KEDOM.Sheet.Action.create"),
        callback: (_event: Event, button: HTMLButtonElement) => {
          const form = button.form;
          if (!form) return "";
          const data = new FormData(form);
          const label = data.get("label");
          return (typeof label === "string" ? label : "").trim();
        },
      },
    });
    if (typeof result !== "string" || result === "") return null;
    return result;
  } catch {
    return null;
  }
}
