# Open questions

Everything the design does not yet decide, found while porting the Obsidian vault into
[docs/rules/](.). Ordered roughly by how much they block implementation.

Each entry records what the sources actually say, why it matters, and what the implementation
does in the meantime. Nothing here has been silently resolved — answered questions move to
[Recently resolved](#recently-resolved) with the answer, rather than disappearing.

---

## Blocking

### Q1 — The core dice mechanic

**Three dice are now in play, two of them inside the same note.**

- Body of `🗄️ slip-box/Kedom RPG.md` (newest): **`2d10 + STAT + proficiency`**, with half
  proficiency when no specialisation applies.
- Front matter of the *same file*: `dice: D20/2d6`.
- The threshold table in that note: generated for **`2d8`**, and flagged by the author as
  needing a redo.
- `📥 inbox/WWN Kedom Hack.md` (oldest): `2d6 + STAT MOD + SKILL LEVEL`.

The note says so itself: *"I'm not sure if d10 will be the dice to use. Final decision tbd. As
well as DC for successes."*

What is settled is the **shape**: a bell curve for skills, flat `d20` for attacks and saves.
Only the size of the dice is open.

The spreads differ enough to change every threshold — `2d6` averages 7, `2d8` averages 9,
`2d10` averages 11. [20-skills.md](20-skills.md#why-the-table-needs-the-redo) works the band
probabilities for the two live candidates.

**Blocks:** the tier function, every threshold, the travel table (Q20), and all difficulty
tuning.

**Interim:** dice expression and thresholds are **configuration** in `src/config/`, not
constants in the roll code, so switching costs one config edit. See
[../system/roll-pipeline.md](../system/roll-pipeline.md).

### Q11 — The background table does not exist yet

`WWN Kedom Hack.md` says: roll **2d8** for a background; it grants a free skill; then either
roll three times on it, or roll once and take two "bold".

Missing: the table itself, what the three rolls are *for* (skills? equipment? traits?), and
what "bold" means.

**Partially answered by the WWN generator**, which implements exactly this mechanic: a free
skill, a **two-entry** quick list (the "bold" options), and an **eight-entry `1d8` table**
rolled twice. So "bold" means the pre-picked pair, and the rolls are for skills. What is still
missing is the Kedom content itself — the generator's 204 entries are WWN-flavoured (Q25).

**Blocks:** character creation, and the Forge authoring workflow, since backgrounds are the
hinge between region, race, and skill choices ([../forge/schema.md](../forge/schema.md)).

### Q12 — Per-class mechanics are unspecified

**The roster is now fixed** — five full classes and twelve partials, confirmed identically by
the revised source and the public site's generator. See
[30-character-creation.md](30-character-creation.md#classes).

What is missing is every number: attack progressions, skill points per level, hit dice, and
Effort pools. The generator carries WWN values for all of these, plus working
partial-combination maths, so this is a rebalancing problem rather than a design-from-scratch
problem.

The Priest and Beast have unported development notes
(`📥 inbox/WWN Kedom - Quilisa priest.md`, `📥 inbox/WWN - Beast class.md`).

**Blocks:** everything `src/derivations/` computes from class grants.

### Q19 — The magic system does not exist yet

See [60-magic.md](60-magic.md). **Four candidate styles are now named** — vancian, ritual
(spending money, materials, blood, or strain), a roll to cast, and limited-use abilities — but
none is assigned to a tradition, and they are not mutually exclusive.

Still open: how Effort is granted and recovered, or whether Effort survives at all now that
ritual magic proposes spending strain instead; whether magic feeds the corruption tracks; and
the pantheon list.

**Blocks:** the `power` item type and `src/derivations/pools.ts`.

---

## Significant

### Q4 — Luck has no rules

Luck is one of the six primary attributes, and the source says only that it is *"a separate
attribute with its own rules"*. Those rules are not written anywhere.

It governs **no skills**, and it is **no longer a save** — the save set is now
Reflex/Fortitude/Will. So at present Luck is an attribute that does nothing at all.

Two other secondary-attribute gaps remain, though the list is otherwise now specified: hit
points are `class hit die + Might modifier` with no per-level progression given, and the three
save formulas are unstated (Q13).

### Q10 — Racial skill grants name skills that do not exist

Rats gain **Sneak**; Gnomes gain **Magic**. Neither is in the nineteen-skill list — sneaking is
a *specialisation* of Prowl, and the magic skill is **Arcana**.

Either the grants predate the skill list, or racial grants can target specialisations as well
as skills. **The latter is more interesting and more likely**, and the data model supports it
since specialisations have slugs of their own.

The `Know` → `Lore` rename adds a third case of the same kind, and is a plain rename rather
than a design question.

**Affects:** the grant resolution code, which must accept either a skill slug or a
specialisation slug.

### Q13 — Save target formula

Saves are currently modelled WWN-style as derived targets rolled against with `1d20`, but no
formula is given. WWN's PC formula is `16 + baseMod + saveMod − best(pair mods) − level`.

The revised source also reopens the framing, asking *"maybe saves as skills?"* and admitting
*"I don't know how to setup dc for them"*. Saves-as-skills would be the simpler system —
one resolution mechanic instead of two — but it conflicts with saves being rolled on `d20`
while skills use a bell curve.

### Q16 — Feats reference the removed Stabilize state

Die Hard ("autostabilize") and Gifted Chirurgeon ("Stabilize as on turn action") still refer to
a state the wound rework deleted. Presumably they now mean removing a wound point without the
System Strain cost. See [50-wounds-strain.md](50-wounds-strain.md).

### Q18 — The two corruption tracks are unspecified

Two strain sub-tracks are named: **mental/sanity** keyed to the Will save, and
**corruption/disease** keyed to Fortitude. The source frames them as *mind alterations* and
*body alterations*.

"Alteration" is the word to take seriously. It implies each track accumulates **discrete named
changes** to the character rather than filling a meter, which is a different data shape from
WWN's Alienation and Stress counters — closer to a list of Active Effects than to a number.

Decide the shape first, then the mechanics. A low-fantasy game with necromancers and a ritual
magic style that spends strain (Q19) is clearly inviting a link to magic.

### Q22 — How is critical severity determined?

[80-criticals.md](80-criticals.md) is built on severity levels 1–15, but nothing says how a
level is rolled: on a critical hit, by damage overflow, by weapon, by a table. The entire
subsystem hangs off this one unstated step.

---

## Minor

### Q5 — Focus governs only two skills

The nineteen skills now map to attributes explicitly, and the distribution is lopsided:
Knowledge 5, Might 5, Presence 4, Dexterity 3, **Focus 2**, Luck 0.

Focus covers "intuition, perception, will, wisdom" yet drives only Notice and Survive — while
simultaneously carrying Strain and the Will save. It is thin as a skill attribute and heavy as
a defensive one. Might has the opposite problem, doing the work of both strength and
constitution.

The older mental/physical target of "10–15 mental, 4–9 physical, roughly 2:1" is still met
(10 mental, 4 physical, 5 mixed).

### Q7 — Skill points per level

Rank costs and level gates are now specified
([20-skills.md](20-skills.md#proficiency)): costs 2/3/4/5/6 per tier, gates at character levels
3, 6, and 9, and 20 points cumulative to reach Legendary.

What is still unstated is **how many skill points a character receives per level**, and
whether it varies by class. Without it the cost table cannot be tuned. WWN grants 3 per level.

### Q8 — Untrained restrictions

Untrained proficiency is **−2** (changed from −1). Whether every skill can be attempted
untrained is still unstated. Most OSR systems gate a few — surgery, spellcasting.

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

Skill checks use thresholds 9−/10–12/13–16/17–20/21+. Saves and the critical tables use fixed
DCs of 6/8/10/12. Both are inherited from WWN's split between skill checks and saves.
Consistent with the parent system, but worth confirming as deliberate, because it will confuse
players. Folding saves into skills (Q13) would collapse the two scales into one.

### Q15 — Initiative

Unstated. WWN uses `1d8 + DEX modifier`, with optional group and side initiative.

### Q17 — System Strain recovery rate

Recovery is blocked while Wounded, but the base rate is not given.

### Q20 — The travel table is on a 2d6 scale

The journey-event table in [70-travel.md](70-travel.md) runs 2 to 12+ with single values at 5,
6, and 11 — a `2d6` distribution. If Q1 settles on `2d10`, this table is badly wrong: every
result above 12 collapses onto the top row, and Joyful Sight at 11 stops being rare. It needs
rescaling to whatever Q1 chooses.

### Q21 — Which skill rolls for travel events?

Travel and Survive overlap. Presumably Travel makes progress and Survive lives off the land,
but which one rolls on the journey table is unstated.

### Q23 — Critical tables use retired wound and save vocabulary

The location tables in [80-criticals.md](80-criticals.md) still say "Mortally Wounded" and
"Frail", which [50-wounds-strain.md](50-wounds-strain.md) replaced with wound points and
**Wounded**. They also call for **Luck** and **Physical** saves, both retired by the move to
Reflex/Fortitude/Will ([40-combat.md](40-combat.md#saves)) — as does the Ignited condition.

The group summaries have been translated; the per-location tables need one pass for both the
wound vocabulary and the save names.

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

The class roster arrives named in Russian only (Воин, Эксперт, Кверанский арканист), so the
English names in [30-character-creation.md](30-character-creation.md#classes) are translations
this document chose, not source text.

### Q28 — Do specialisations have their own proficiency tiers?

The rule is *"`2d10 + STAT + skill proficiency`, if no specialization proficiency/2"* — half
proficiency when no specialisation applies. That reads as **one tier per skill**, with
specialisations acting as a yes/no gate on whether you get all of it.

But the earlier design gave specialisations their own levels that stacked. If specialisations
keep individual tiers, the cost table in [20-skills.md](20-skills.md#proficiency) has to say
whether they are bought at the same prices.

The data model currently assumes the simpler reading, which is the cheaper one to widen later.

---

## Recently resolved

Kept for the record, because each shaped a decision already written into the docs.

### Q2 — Is Strength separate from Constitution? — **No**

They are merged into a single **Might** attribute: *"I think there is no need in separate str
and con"*. This drops the attribute count from seven to six and makes Might carry hit points,
melee damage, and encumbrance together. See
[10-attributes.md](10-attributes.md#primary-attributes).

The consequence to watch: racial modifiers in the older notes adjust STR and CON independently
(Halfling CON +1 / STR −1), and those grants now collapse into a single ±0 on Might. Every
racial modifier needs rechecking against the merge.

### Q3 — Attribute modifier table — **Specified**

`−3` at 3, then `−2` at 4–5, `−1` at 6–8, `0` at 9–12, `+1` at 13–15, `+2` at 16–17, `+3` at
18. Symmetric band widths of 1/2/3/4/3/2/1, and **wider than WWN's −2…+2**. See
[10-attributes.md](10-attributes.md#the-modifier-table).

### Q6 — Critical success versus the Legendary tier — **Critical success removed**

The contradiction was between a ladder saying "17+ is a critical success" and a table saying
"17–20 versus Legendary is success with a cost". The revised source **drops the critical
outcome entirely**, leaving three: failure, success with a cost, success.

The tier function therefore returns one of three outcomes and needs no orthogonal critical
flag, simplifying
[ADR-008](../research/05-decisions.md#adr-008--one-pure-tier-function-critical-as-an-orthogonal-flag).
Note this concerns *critical success on skill checks*; critical **injuries** in
[80-criticals.md](80-criticals.md) are a separate combat subsystem and are unaffected.

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
