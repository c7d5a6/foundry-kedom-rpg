# Open questions

Everything the design does not yet decide, found while porting the Obsidian vault into
[docs/rules/](.). Ordered roughly by how much they block implementation.

Each entry records what the sources actually say, why it matters, and what the implementation
does in the meantime. Nothing here has been silently resolved.

---

## Blocking

### Q1 — The core dice mechanic

**The two source notes specify different dice.**

- `🗄️ slip-box/Kedom RPG.md` (newer): `2d8 + STAT + level`, `level − 1` if untrained, with
  thresholds at 9−/10–12/13–16/17+ and a six-tier proficiency table.
- `📥 inbox/WWN Kedom Hack.md` (older): `2d6 + STAT MOD + SKILL LEVEL`, untrained −1.

These are materially different: `2d8` spans 2–16 averaging 9; `2d6` spans 2–12 averaging 7.
The published threshold table was written for `2d8`, and under `2d6` a 17+ critical would be
unreachable.

**Blocks:** the skill check, the tier function, every threshold, the travel table (Q20), and
all difficulty tuning.

**Interim:** dice expression and thresholds are **configuration** in
`src/config/`, not constants in the roll code, so switching costs one config edit. See
[../system/roll-pipeline.md](../system/roll-pipeline.md).

### Q6 — Critical success versus the Legendary tier

The ladder in [20-skills.md](20-skills.md) says 17+ is a **critical success**. The proficiency
table says 17–20 against a **Legendary** difficulty is **success with a cost**. Both cannot
hold for a roll of 18 against a Legendary task.

**Likely resolution:** critical is an orthogonal flag rather than a fifth tier, exactly as
WFRP4e keeps `isCriticalFumble` separate from Success Level
([ADR-008](../research/05-decisions.md#adr-008--one-pure-tier-function-critical-as-an-orthogonal-flag)).
A roll would then be "success with a cost, critically" — which needs a meaning.

**Blocks:** the tier function's return shape.

### Q11 — The background table does not exist yet

`WWN Kedom Hack.md` says: roll **2d8** for a background; it grants a free skill; then either
roll three times on it, or roll once and take two "bold".

Missing: the table itself, what the three rolls are *for* (skills? equipment? traits?), and
what "bold" means.

**Blocks:** character creation, and the Forge authoring workflow, since backgrounds are the
hinge between region, race, and skill choices
([../forge/schema.md](../forge/schema.md)).

### Q12 — Classes are not specified

Named across the sources: Warrior, Expert, Mage (High Mage, Elementalist, Necromancer),
Priest, Adventurer, Duelist, Bard, Empath, Vowed, Beast, Mage Slayer, Rune Guardian, Accursed,
Wise, Artificer.

None has mechanics in the ported notes. Two have separate unported notes:
`📥 inbox/WWN Kedom - Quilisa priest.md` and `📥 inbox/WWN - Beast class.md`.

**Adventurer needs doing first**: it is the hybrid chassis, and most non-human races can *only*
be Adventurers with one slot pre-filled.

**Blocks:** attack progressions, skill points per level, hit dice, Effort pools — everything
`src/derivations/` computes from class grants.

### Q19 — The magic system does not exist yet

See [60-magic.md](60-magic.md). Arts, Effort, and spell preparation are referenced; no system
is written. Decide whether traditions are art-based, slot-based, or split; how Effort is
granted and recovered; whether magic feeds the corruption track; and the pantheon list.

**Blocks:** the `power` item type and `src/derivations/pools.ts`.

---

## Significant

### Q2 — Is Strength separate from Constitution?

`Kedom RPG.md` lists primary attributes as `strength/constitution`, `dex`, `int`, `wisdom`,
`charisma`, `luck` — six lines, but the first pairs two names. Racial modifiers elsewhere
adjust STR and CON **independently** (Halfling CON +1 / STR −1), so they are almost certainly
separate, giving seven attributes.

**Interim:** [10-attributes.md](10-attributes.md) treats them as separate.

### Q3 — Attribute modifier table

The score-to-modifier curve is never given. WWN's runs −2 to +2 across 3–18.

### Q4 — Secondary attributes are incomplete

The source list ends with a literal `???`. Hit points, sanity, and corruption have no
formulas. See [10-attributes.md](10-attributes.md).

### Q7 — Skill advancement costs and gates

Skill points per level, rank costs, and level gates are all "as WWN" by implication but never
stated for Kedom. WWN uses 3 points per level, cost `rank + 2`, gates at levels 3/6/9, maximum
rank 4.

### Q10 — Racial skill grants name skills that do not exist

Rats gain **Sneak**; Gnomes gain **Magic**. Neither is in the nineteen-skill list — sneaking is
a *specialisation* of Prowl, and the magic skill is **Arcana**.

Either the grants predate the skill list, or racial grants can target specialisations as well
as skills. **The latter is more interesting and more likely**, and the data model supports it
since specialisations have slugs of their own.

**Affects:** the grant resolution code, which must accept either a skill slug or a
specialisation slug.

### Q13 — Save target formula

Saves are derived targets rolled against with `1d20`, but the formula is not given. WWN's PC
formula is `16 + baseMod + saveMod − best(pair mods) − level`.

### Q16 — Feats reference the removed Stabilize state

Die Hard ("autostabilize") and Gifted Chirurgeon ("Stabilize as on turn action") still refer to
a state the wound rework deleted. Presumably they now mean removing a wound point without the
System Strain cost. See [50-wounds-strain.md](50-wounds-strain.md).

### Q18 — Sanity and corruption tracks are unspecified

Two secondary tracks are named — mental resilience from WIS, corruption or disease from CON —
with no mechanics. WWN's analogues are Alienation and Stress, both from WIS. Decide whether
Kedom keeps two tracks, and what drives them. A low-fantasy game with necromancers and a
corruption stat is inviting a link to magic (Q19).

### Q22 — How is critical severity determined?

[80-criticals.md](80-criticals.md) is built on severity levels 1–15, but nothing says how a
level is rolled: on a critical hit, by damage overflow, by weapon, by a table. The entire
subsystem hangs off this one unstated step.

---

## Minor

### Q5 — Mental/physical skill balance

The source records a target of "mental 10–15, physical 4–9, 2:1". The list is 10 mental,
4 physical, 5 mixed — at the bottom of both ranges.

### Q8 — Untrained restrictions

Untrained level is −1, but whether every skill can be attempted untrained is unstated. Most
OSR systems gate a few (surgery, spellcasting).

### Q9 — Human sub-cultures need mechanics

Only the Nitól are described, and only in flavour. The setting notes name others (Nerlander,
Ferori, Ñiziel). Whether human cultures carry mechanical differences or are purely flavour is
open — it matters because the Forge schema models region → race → background, and human
cultures would naturally sit at the race level.

**Largely answered by the WWN generator.** The public site's character generator treats
`niziel`, `ferori`, `nerland`, `half-elf`, and `half-orc` as five human sub-cultures, and gives
**each its own background list and its own allowed-class list**. Sub-cultures are mechanical,
they sit at the race level, and they differ by content rather than by statistics — no
sub-culture grants an attribute or focus the others do not. What remains open is whether Kedom
keeps that arrangement. See
[../forge/public-site-export.md](../forge/public-site-export.md#what-it-confirms-about-the-forge-schema).

### Q14 — Two difficulty scales

Skill checks use thresholds 9−/10–12/13–16/17+. Saves and the critical tables use fixed DCs of
6/8/10/12. Both are inherited from WWN's split between skill checks and saves. Consistent with
the parent system, but worth confirming as deliberate, because it will confuse players.

### Q15 — Initiative

Unstated. WWN uses `1d8 + DEX modifier`, with optional group and side initiative.

### Q17 — System Strain recovery rate

Recovery is blocked while Wounded, but the base rate is not given.

### Q20 — The travel table is on a 2d6 scale

The journey-event table in [70-travel.md](70-travel.md) runs 2 to 12+ with single values at 5,
6, and 11 — a `2d6` distribution. If Q1 settles on `2d8`, this table must be rescaled or
Joyful Sight becomes far too common.

### Q21 — Which skill rolls for travel events?

Travel and Survive overlap. Presumably Travel makes progress and Survive lives off the land,
but which one rolls on the journey table is unstated.

### Q23 — Critical tables use the pre-rework wound vocabulary

The location tables in [80-criticals.md](80-criticals.md) still say "Mortally Wounded" and
"Frail", which [50-wounds-strain.md](50-wounds-strain.md) replaced with wound points and
**Wounded**. The group summaries have been translated; the per-location tables need a pass.

### Q24 — Execution attacks

Named once in the wounds note with no rules.

### Q25 — The WWN generator content needs remapping to Kedom skills

The public site's character generator carries 204 background entries, 18 classes, and 13
races, all authored against **WWN's** skill list — `administer`, `lead`, `pray`, `ride`,
`sail`, `sneak`, `trade`, `work`. Kedom's nineteen ([20-skills.md](20-skills.md)) differ, and
some WWN skills became specialisations: sneaking is Prowl/Sneak, not a skill.

So the largest existing body of Kedom content cannot be imported as-is. Someone has to decide
each mapping, and a few have no clean answer — WWN `pray` against Kedom's Worship and Conduct,
for instance. Class `hd` and `ab` progressions are WWN's too. Until Q1 settles the dice
mechanic, this cannot start.

### Q26 — Description format for multi-target content

Entity prose has to reach a Foundry compendium (wants HTML), the public website (wants
theme-neutral markup), and the Obsidian export (wants Markdown). The existing generator stores
rendered HTML with inline styles and theme-specific attributes, which does not travel.

Storing Markdown in SQLite and rendering per target is the obvious answer, but it needs
deciding before content is authored at volume.

### Q27 — Content localisation

The public site is **entirely in Russian**. The Foundry system is English-first with strings in
`lang/en.json`. If both are fed by one Forge export, content needs a language dimension —
either `label_en`/`label_ru` columns or a `translation` table keyed by slug and locale.

This is worth settling early: retrofitting a locale dimension means touching every table that
holds display text, and every export target at once.

---

## Not questions, but noted

**The setting is much larger than the rules.** The `kedom/` vault has 161 notes covering
history, myth, calendar, weather, languages, places, and NPCs. None is needed for the system
to work, and none should be ported into `docs/rules/`. It belongs in compendium journal
entries authored through Forge.

**A conlang exists.** Place names reference `language.owlbeardm.com` with reconstructed forms
across several languages. Relevant only in that content authoring should preserve diacritics
correctly — hence `charset = utf-8` in `.editorconfig` and UTF-8 handling in the export
pipeline.
