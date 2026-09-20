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

> **Every racial attribute modifier below is stale.** They are quoted from
> `WWN Kedom Hack.md` and use the pre-merge attribute set, so they adjust STR and CON
> independently — the Halfling's "CON +1, STR −1" and the Dwarf's "CON +1". Both now target
> **Might**, which means the Halfling's pair cancels to **±0** and the racial identity it
> encoded is simply lost.
>
> This is the sharpest consequence of merging strength and constitution
> ([Q2](99-open-questions.md#q2--is-strength-separate-from-constitution--no)), and the grants
> need reassigning before any of them is entered into Forge. The class lists in this section
> are also pre-revision; the current roster is [below](#classes).

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

**The roster is now fixed.** Five full classes, plus Adventurer as a hybrid chassis:

| Class | Source name | Full | Partial |
|---|---|---|---|
| Warrior | Воин | yes | yes |
| Expert | Эксперт | yes | yes |
| Queran Arcanist | Кверанский арканист | yes | yes |
| Elementalist | Элементалист | yes | yes |
| Necromancer | Некромант | yes | yes |
| Priest | Жрец | — | yes |
| Wise | Ведун | — | yes |
| Accursed | Проклятый | — | yes |
| Duelist | Дуэлянт | — | yes |
| Empath | Эмпат | — | yes |
| Rune Guardian | Рунный защитник | — | yes |
| Beast | Зверь | — | yes |

**Adventurer** (Приключенец) is not a class of its own; it is *two partials combined*, drawn
from the twelve in the Partial column. Most non-human races can only be Adventurers, with one
slot pre-filled by the race.

Three things changed from the earlier notes, and all three are deletions worth noticing:

- **"Mage" / "High Mage" is now specifically the Queran Arcanist**, tying the class to the
  setting's lost magical empire rather than to a generic archetype.
- **Priest is no longer a full class.** It exists only as a partial.
- **Bard, Vowed, Mage Slayer, and Artificer are gone**, having appeared in earlier notes.

### Independently confirmed by the WWN generator

This roster matches the public site's character generator **exactly** — the same five full
classes and the same twelve partials, with no additions or omissions on either side
([../forge/public-site-export.md](../forge/public-site-export.md)).

That is worth more than it looks. The generator also carries per-class `hd`, `ab`, `arts`, and
foci values, and its `Summary.vue` implements the partial-combination maths: the better hit
die of the two, a constrained attack bonus, and the union of arts. Those are WWN's numbers and
need rebalancing for Kedom, but the **structure** of the hybrid chassis is already worked out
and does not need inventing.

What remains missing is per-class mechanics for Kedom: attack progressions, skill points per
level, hit dice, and Effort pools —
[Q12](99-open-questions.md#q12--per-class-mechanics-are-unspecified). The Priest and Beast have
unported development notes (`📥 inbox/WWN Kedom - Quilisa priest.md`,
`📥 inbox/WWN - Beast class.md`).

### Saves

**Each class has a primary and a secondary save.** Those two progress better than the third.
The revised source states the rule without naming which save is primary for which class:

> Should have 2 saves — primary and secondary. If Adventurer [is] used so 2 classes combined,
> then two primaries [are] used; if they are the same, then [the] player can select any second
> save. Progression for the 2 saves [is] better than for the other one.

So for a full class: pick (or author) primary + secondary; the remaining save is tertiary.
For Adventurer: take each partial's primary; if both partials share the same primary, the
player chooses any other save as the secondary.

Which save is primary/secondary per class, and what "better progression" means numerically,
are [Q30](99-open-questions.md#q30--per-class-primary-and-secondary-saves). The three save
names themselves are Reflex / Fortitude / Will —
[40-combat.md](40-combat.md#saves).

## Implementation note

Race, background, and class are all **items** on the actor, not enumerations, because each
grants things: bonus skills, attribute adjustments, class lists, foci, progressions. Grants
are declarative data on the item, resolved by `src/derivations/`, following
`foundryvtt-wwn`'s `classEdge` pattern where the class item carries `poolGrant`,
`skillPointsPerLevel`, and `attackProgression`.

Player choices made at creation — which attribute took the Lizard's +1, which free
specialisation label was written for Craft — are stored as resolved values on the actor, never
re-derived.
