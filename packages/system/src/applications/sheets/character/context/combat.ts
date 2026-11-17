import { previewWeaponRollBonuses } from "../../../../actions/attack-roll.ts";
import { previewWoundLuckBonus } from "../../../../actions/wound-roll.ts";
import type { CharacterData } from "../../../../data/actor/character.ts";
import type { ArmorDataFields } from "../../../../data/item/armor.ts";
import { normalizeWeaponSkill, type WeaponDataFields } from "../../../../data/item/weapon.ts";
import { formatSignedBonus } from "../../../../rolls/build-skill-check.ts";
import { systemOf } from "../../../../types/accessors.ts";
import { collate } from "./shared.ts";

/** AC, wound preview, weapons and armor rows. Item lists are empty off the combat tab. */
export function buildCombat(actor: Actor.Implementation, system: CharacterData, onCombat: boolean) {
  const combatData = system.combat as {
    ac: number;
  };
  const combat = {
    ac: combatData.ac ?? 0,
    woundLuckSigned: onCombat ? formatSignedBonus(previewWoundLuckBonus(actor)) : "",
  };

  const weapons = actor.items
    .filter((item) => onCombat && (item.type as string) === "weapon")
    .map((item) => {
      const wsys = systemOf<WeaponDataFields>(item);
      const skill = normalizeWeaponSkill(wsys.skill);
      const preview = previewWeaponRollBonuses(actor, item);
      const attackTotal = preview?.attackBonus ?? Math.floor(wsys.attackBonus ?? 0);
      const damageTotal = preview?.damageBonus ?? 0;
      return {
        id: item.id,
        name: item.name,
        skill,
        skillLabel: game.i18n.localize(`KEDOM.Skill.${skill}`),
        damageFormula: wsys.damageFormula || "1d6",
        attackTotalSigned: formatSignedBonus(attackTotal),
        damageTotalSigned: formatSignedBonus(damageTotal),
      };
    })
    .sort((a, b) => collate(a.name, b.name));

  const armor = actor.items
    .filter((item) => onCombat && (item.type as string) === "armor")
    .map((item) => {
      const asys = systemOf<ArmorDataFields>(item);
      const woundBonus = Math.floor(asys.woundBonus ?? 0);
      return {
        id: item.id,
        name: item.name,
        woundBonus,
        woundBonusSigned: woundBonus !== 0 ? formatSignedBonus(woundBonus) : "",
      };
    })
    .sort((a, b) => collate(a.name, b.name));
  return { combat, weapons, armor };
}
