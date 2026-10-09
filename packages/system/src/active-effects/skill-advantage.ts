import { SKILL_KEYS, type SkillKey } from "../config/kedom.ts";

/** Active Effect change key for skill default advantage (ADD stacks). */
export function skillAdvantageChangeKey(skillKey: SkillKey): string {
  return `system.skills.${skillKey}.defaultAdvantage`;
}

export type EffectListRow = {
  id: string;
  name: string;
  disabled: boolean;
  transfer: boolean;
  img: string;
};

export function effectListRows(effects: Iterable<ActiveEffect.Implementation>): EffectListRow[] {
  return [...effects]
    .map((effect) => ({
      id: effect.id ?? "",
      name: effect.name,
      disabled: effect.disabled,
      transfer: effect.transfer,
      img: effect.img || "icons/svg/aura.svg",
    }))
    .filter((row) => row.id)
    .sort((a, b) => Number(a.disabled) - Number(b.disabled) || a.name.localeCompare(b.name));
}

/** Create a transferable skill-advantage effect on a talent (or any) item. */
export async function createSkillAdvantageEffect(
  item: Item.Implementation,
  skillKey: SkillKey,
): Promise<ActiveEffect.Implementation | undefined> {
  const skillLabel = game.i18n.localize(`KEDOM.Skill.${skillKey}`);
  const name = game.i18n.format("KEDOM.Talent.SkillAdvantageEffectName", { skill: skillLabel });
  const created = await item.createEmbeddedDocuments("ActiveEffect", [
    {
      name,
      img: "icons/svg/upgrade.svg",
      transfer: true,
      origin: item.uuid,
      disabled: false,
      changes: [
        {
          key: skillAdvantageChangeKey(skillKey),
          type: "add",
          value: "1",
          priority: 20,
        },
      ],
    },
  ]);
  const effect = Array.isArray(created) ? created[0] : created;
  return effect as ActiveEffect.Implementation | undefined;
}

export async function promptSkillKeyForAdvantage(): Promise<SkillKey | null> {
  const options = SKILL_KEYS.map((key) => {
    const label = game.i18n.localize(`KEDOM.Skill.${key}`);
    return `<option value="${key}">${label}</option>`;
  }).join("");
  try {
    const result = await foundry.applications.api.DialogV2.prompt({
      window: { title: game.i18n.localize("KEDOM.Talent.AddSkillAdvantage") },
      content: `<p><label>${game.i18n.localize("KEDOM.Talent.SkillAdvantagePick")}
        <select name="skillKey" autofocus>${options}</select></label></p>`,
      ok: {
        label: game.i18n.localize("KEDOM.Sheet.Action.create"),
        callback: (_event, button) => {
          const form = button.form;
          if (!form) return "";
          return String(new FormData(form).get("skillKey") ?? "").trim();
        },
      },
    });
    if (typeof result !== "string" || !SKILL_KEYS.includes(result as SkillKey)) return null;
    return result as SkillKey;
  } catch {
    return null;
  }
}
