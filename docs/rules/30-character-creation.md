# Character creation

Ported from `📥 inbox/WWN Kedom Hack.md`.

## Order of play

1. Roll attributes: **3d6 in order, replacing any one roll with 14**.
2. Choose a **race**, which grants bonus skills, attribute adjustments, and a class list.
3. Roll or choose a **background**.
4. Choose a **class** from those the race allows.
5. Spend starting skill points, choose foci, and buy equipment.

## Races

Every race grants **Expert foci**. Each also restricts which classes are available, which is
the main mechanical weight of the choice.

### Human

The most widespread of the civilised peoples, adaptable above all else.

**Sub-cultures.** The source details one, the **Nitól** (dark-haired, expressive, seafarers of
the inner sea; blunt, self-sufficient, individualist). Other human cultures exist in the
setting notes but have no mechanics yet —
[Q9](99-open-questions.md#q9--human-sub-cultures-need-mechanics).

**Classes:** Warrior, Expert, Mage (High), or Adventurer choosing two from Warrior, Expert,
Priest, High Mage, Elementalist, Necromancer.

### Half-orc

**Classes:** Adventurer only — Accursed or Half-orc, plus one of Warrior, Expert, Priest,
High Mage, Elementalist, Necromancer.

### Half-elf

**Classes:** Warrior, Expert, Mage (Elementalist), or Adventurer choosing two from Duelist,
Warrior, Expert, Priest, High Mage, Elementalist, Necromancer.

### Halfling

Gains **Connect** and any one other skill as bonus skills. Sees thirty feet in any light short
of total darkness. **CON +1, STR −1.**

**Classes:** Adventurer only — Bard or Empath, plus one of Warrior, Expert, Priest, High Mage,
Elementalist, Necromancer.

### Dwarf

**Level 1:** Gains **Exert** as a bonus skill. Natural magic resistance: **+2 on all saves
against hostile magical effects**. Needs half the usual food, water, and air. **CON +1.**

**Level 2:** Once per day, as an Instant action, negate an unwanted magical effect that would
otherwise affect them.

**Classes:** Warrior, Expert, or Adventurer choosing two from Warrior, Expert, Priest, Mage
Slayer / Rune Guardian, Bard / Empath.

Dwarves are the only race in the source with a **level-gated racial ability**, which the data
model must support generally — see
[../system/data-model.md](../system/data-model.md).

### Rats

**Level 1:** Gains **Sneak** as a bonus skill. **CON +1, DEX +1.** Too small for two-handed
melee weapons or large bows.

**Classes:** Adventurer only — Expert plus one of Warrior, Expert, Priest, High Mage,
Vowed / Beast, Necromancer.

> The granted skill is named **Sneak**, but the skill list in
> [20-skills.md](20-skills.md) has no such skill — sneaking is a *specialisation* of Prowl.
> Tracked as [Q10](99-open-questions.md#q10--racial-skill-grants-name-skills-that-do-not-exist).

### Lizard

**Level 1:** Gains **Punch** and **Survive** as bonus skills. **STR or CHA +1, DEX or CHA −1.**
Unarmoured AC is **13**; better armour grants **+1 AC** on top.

**Classes:** Adventurer only — Vowed / Beast plus one of Warrior, Expert, Priest, Wise.

The "STR or CHA +1, DEX or CHA −1" pattern means a **player choice recorded at creation**, not
a fixed modifier, and the same choice can land on the same attribute twice. The data model
stores the resolved choice.

### Gnome

**Level 1:** Gains **Magic** and **Convince** as bonus skills. **DEX or INT +1, CON −1.**
Gains one additional art as an Elementalist.

**Classes:** Adventurer only — Elementalist plus one of Warrior, Expert, Duelist, Elementalist.

> **Magic** is likewise not in the skill list; the equivalent is **Arcana**. Same issue as
> Rats — [Q10](99-open-questions.md#q10--racial-skill-grants-name-skills-that-do-not-exist).

## Backgrounds

Roll **2d8** for a background. The background grants a free skill, and the player may either
**roll three times** on it, or **roll once and take two "bold"** options.

The background table itself is not in the source, nor is the meaning of "bold". This is the
largest gap in character creation —
[Q11](99-open-questions.md#q11--the-background-table-does-not-exist-yet).

Backgrounds are also the pivot of the Forge authoring workflow: a region has races, each race
has backgrounds, and each background offers skills to choose from. See
[../forge/schema.md](../forge/schema.md).

## Classes

Referenced throughout but only partially specified. Named so far:

**Core:** Warrior, Expert, Mage (High Mage, Elementalist, Necromancer), Priest, Adventurer

**Partial / sub-classes:** Duelist, Bard, Empath, Vowed, Beast, Mage Slayer, Rune Guardian,
Accursed, Wise, Artificer

The Priest has its own development note (`📥 inbox/WWN Kedom - Quilisa priest.md`), and
`📥 inbox/WWN - Beast class.md` covers the Beast. Neither is ported yet —
[Q12](99-open-questions.md#q12--classes-are-not-specified).

**Adventurer** is the hybrid chassis: it takes two partial classes, and most non-human races
can *only* be Adventurers with one slot pre-filled. It is the most mechanically load-bearing
class and needs specifying first.

## Implementation note

Race, background, and class are all **items** on the actor, not enumerations, because each
grants things: bonus skills, attribute adjustments, class lists, foci, progressions. Grants
are declarative data on the item, resolved by `src/derivations/`, following
`foundryvtt-wwn`'s `classEdge` pattern where the class item carries `poolGrant`,
`skillPointsPerLevel`, and `attackProgression`.

Player choices made at creation — which attribute took the Lizard's +1, which free
specialisation label was written for Craft — are stored as resolved values on the actor, never
re-derived.
