import type { FeatureKey } from "../config/creation.ts";
import type { TalentCategory } from "../config/talent.ts";

export type FeatureTalentDef = {
  featureKey: FeatureKey;
  name: string;
  category: TalentCategory;
  description: string;
  img?: string;
};

/** Auto-granted class / race feature talents (no pick UI yet). */
export const CLASS_FEATURE_TALENTS: Record<FeatureKey, FeatureTalentDef> = {
  killingBlow: {
    featureKey: "killingBlow",
    name: "Killing Blow",
    category: "class",
    img: "icons/svg/sword.svg",
    description:
      "<p>When you attack with a weapon, if your weapon-skill proficiency bonus is positive, " +
      "double that bonus on the attack roll and add the same positive bonus to damage.</p>",
  },
  veteransLuck: {
    featureKey: "veteransLuck",
    name: "Veteran's Luck",
    category: "class",
    img: "icons/svg/combat.svg",
    description:
      "<p>Once per scene, as an Instant action, turn a missed attack you made into a hit, " +
      "or a hit against you into a miss. Only one use per scene.</p>",
  },
  masterfulExpertise: {
    featureKey: "masterfulExpertise",
    name: "Masterful Expertise",
    category: "class",
    img: "icons/svg/upgrade.svg",
    description:
      "<p>Once per scene, as an Instant action, reroll a failed non-combat skill check. " +
      "Use the better roll if it matters.</p>",
  },
  humanExpertTalent: {
    featureKey: "humanExpertTalent",
    name: "Human Adaptability",
    category: "race",
    img: "icons/svg/mystery-man.svg",
    description:
      "<p>Humans gain one additional Expert-pool talent pick at character creation.</p>",
  },
  warriorTalentPicks: {
    featureKey: "warriorTalentPicks",
    name: "Warrior Talents",
    category: "class",
    img: "icons/svg/book.svg",
    description:
      "<p>At character creation, choose <strong>1 Any</strong> talent and <strong>1 Warrior</strong> talent.</p>",
  },
  expertTalentPicks: {
    featureKey: "expertTalentPicks",
    name: "Expert Talents",
    category: "class",
    img: "icons/svg/book.svg",
    description:
      "<p>At character creation, choose <strong>1 Any</strong> talent and <strong>1 Expert</strong> talent.</p>",
  },
  adventurerTalentPicks: {
    featureKey: "adventurerTalentPicks",
    name: "Warrior/Expert Talents",
    category: "class",
    img: "icons/svg/book.svg",
    description:
      "<p>At character creation, choose <strong>1 Expert</strong> talent, <strong>1 Warrior</strong> talent, and <strong>1 Any</strong> talent.</p>",
  },
};

export function featureTalentCreateData(featureKey: FeatureKey): {
  name: string;
  type: "talent";
  img: string;
  system: {
    description: string;
    category: TalentCategory;
    featureKey: FeatureKey;
    grants: { skills: []; specializations: []; abilities: [] };
  };
} {
  const def = CLASS_FEATURE_TALENTS[featureKey];
  return {
    name: def.name,
    type: "talent",
    img: def.img ?? "icons/svg/aura.svg",
    system: {
      description: def.description,
      category: def.category,
      featureKey: def.featureKey,
      grants: { skills: [], specializations: [], abilities: [] },
    },
  };
}

export function featureKeysForCreate(
  raceFeatures: readonly FeatureKey[] | undefined,
  classFeatures: readonly FeatureKey[] | undefined,
): FeatureKey[] {
  const seen = new Set<FeatureKey>();
  const out: FeatureKey[] = [];
  for (const key of [...(raceFeatures ?? []), ...(classFeatures ?? [])]) {
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}
