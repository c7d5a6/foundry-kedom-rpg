# Open questions

Everything the design does not yet decide, found while porting the Obsidian vault into
[docs/rules/](.). Ordered roughly by how much they block implementation.

Each entry records what the sources actually say, why it matters, and what the implementation
does in the meantime. Nothing here has been silently resolved — answered questions move to
[Recently resolved](#recently-resolved) with the answer, rather than disappearing.

---

## Blocking

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

### Q4 — Luck save proficiency

Luck pool rules are settled: score **0–20**, start **3d6**, restore **narratively**; Luck
save `d20 + Luck mod + Luck save proficiency`; spend 1-to-1 or all to ignore a wound result
([10-attributes.md](10-attributes.md)).

Still open: whether **Luck save proficiency** uses the same six-tier ladder and costs as
skills/class saves.

Secondary-attribute gaps that remain: hit points are `class hit die + Might modifier` with no
per-level progression given; class save attribute pairing is under Q30 (Reflex←Dex,
Fortitude←Might, Will←Focus are the working defaults in
[10-attributes.md](10-attributes.md)).

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

---

## Minor

### Q5 — Focus skill vs defensive load

The nineteen skills map to attributes: Knowledge 5, Presence 4, Might 4, **Focus 3**
(Notice, Survive, Travel), Dexterity 3, Luck 0.

Focus covers intuition, perception, will, and wisdom, drives three skills, and also carries
Strain Limit (`10 + Focus mod`), Resolve (`20 − Focus score`), and the Will save. Might still
does the work of both strength and constitution.

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

Skill checks and saves share thresholds ≤10 / 11–14 / 15–21 / 22–26 / 27+. Critical tables
and older notes still use fixed DCs of 6/8/10/12. Those fixed DCs are now a **legacy scale
for unported content**, not a second way to roll saves. Whether the critical tables should be
rewritten onto the graded ladder is open; until then both numbers appear in the docs.

### Q15 — Initiative

Unstated. WWN uses `1d8 + DEX modifier`, with optional group and side initiative.

### Q17 — System Strain recovery rate

Recovery is blocked while Wounded, but the base rate is not given.

### Q20 — The travel table is on a 2d6 scale

The journey-event table in [70-travel.md](70-travel.md) runs 2 to 12+ with single values at 5,
6, and 11 — a `2d6` distribution. Now that skills settle on `2d10` (Q1), this table is badly
wrong for any journey roll that reuses the core die: every result above 12 collapses onto the
top row, and Joyful Sight at 11 stops being rare. It needs rescaling.

### Q21 — Which skill rolls for travel events?

Travel and Survive overlap. Presumably Travel makes progress and Survive lives off the land,
but which one rolls on the journey table is unstated.

### Q23 — Critical tables use retired wound and save vocabulary

The location tables in [80-criticals.md](80-criticals.md) still say "Mortally Wounded" and
"Frail", which [50-wounds-strain.md](50-wounds-strain.md) replaced with wound points and
**Wounded** (`wounds >= 1`). They also call for **Physical** / **Mental** / older **Luck**
wording as class-style checks; class saves are now Reflex/Fortitude/Will on `2d10`
([40-combat.md](40-combat.md#saves)). The revived **Luck save** (`d20`) may reclaim some
Luck-named lines (including Ignited); Physical/Mental still need remapping.

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
for instance. Class `hd` and `ab` progressions are WWN's too.

### Q26 — Description format for multi-target content

Entity prose has to reach a Foundry compendium (wants HTML), the public website (wants
theme-neutral markup), and the Obsidian export (wants Markdown). The existing generator stores
rendered HTML with inline styles and theme-specific attributes, which does not travel.

Storing Markdown in SQLite and rendering per target is the obvious answer, but it needs
deciding before content is authored at volume.

### Q28 — Do specialisations have their own proficiency tiers?

The rule is *"`2d10 + STAT + skill/save proficiency`, if no specialization proficiency/2"* —
half proficiency when no specialisation applies. That reads as **one tier per skill**, with
specialisations acting as a yes/no gate on whether you get all of it.

But the earlier design gave specialisations their own levels that stacked. If specialisations
keep individual tiers, the cost table in [20-skills.md](20-skills.md#proficiency) has to say
whether they are bought at the same prices.

The data model currently assumes the simpler reading, which is the cheaper one to widen later.

### Q30 — Per-class primary and secondary saves

Each class should have a **primary** and **secondary** save that progress better than the
third. Adventurer takes both partials' primaries; if those collide, the player picks any other
save as secondary. See [30-character-creation.md](30-character-creation.md#saves).

Missing: which save is primary/secondary for each of the twelve classes, which **attribute**
feeds Reflex / Fortitude / Will, and what the numerical "better progression" is (flat bonus
per level? better tier costs? a separate save proficiency track?).

**Blocks:** class items in Forge and anything `src/derivations/` computes from save grants.

---

## Recently resolved

Kept for the record, because each shaped a decision already written into the docs.

### Q1 — The core dice mechanic — **Settled for now**

- **Skills and class saves (Reflex / Fortitude / Will):** `2d10 + attribute modifier +
  proficiency` (half proficiency on skills when no relevant specialisation).
- **Attacks:** `1d20 + attribute modifier + proficiency`.
- **Luck save:** `d20 + Luck mod + Luck save proficiency`.
- **Strain roll:** plain `d20` vs Resolve and current Strain.
- **Success ladder** (skills / class saves): ≤10 / 11–14 / 15–21 / 22–26 / 27+, three kinds
  with stored degrees, no critical-success kind.
  See [20-skills.md](20-skills.md#resolution), [10-attributes.md](10-attributes.md).

Source front matter is `dice: d20/2d10`. Dice and thresholds stay in `src/config/` so a later
change is cheap. The travel table (Q20) still needs rescaling to match.

### Q13 — Save target formula — **Class saves use the skill mechanic**

**Reflex / Fortitude / Will** are not WWN-style derived targets on `d20`. They roll like
skills: `2d10` + attribute + save proficiency, against the same graded ladder. Class
primary/secondary progression remains under Q30.

**Luck save** and **Strain roll** stay on `d20` by design (see Q1 / Q4).

### Q22 — Critical severity 1–15 — **Design scaffolding only**

The Pathfinder-style severity ladder and groups in [80-criticals.md](80-criticals.md) are
**import/design notes** (equivalence from other systems), not a Kedom play procedure. There is
no “roll for severity” step in the RPG.

Play wounds use the **Wound count column** + `d20 + Luck mod` + body part → effect index from
the source wound table (`Kedom RPG.md` / [50-wounds-strain.md](50-wounds-strain.md)). Keep
`80-criticals.md` as reference when authoring effects; do not gate Foundry on choosing a
severity die.

### Q29 — Success ladder gap at 17–22 — **Filled**

The ladder is now continuous: ≤10 / 11–14 / 15–21 / 22–26 / 27+.

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
outcome as a separate kind**, leaving three kinds: failure, success with a cost, success.

Degrees of failure and success are stored beside the kind in the same breakpoints (Failure
1…n, Success 1…n, cost always degree 1). They are not a fourth kind and do not restore
"critical success" as a label — see
[20-skills.md](20-skills.md#the-success-ladder).

The resolve helper looks up `{ kind, degree }` from the table and needs no orthogonal critical
flag, simplifying
[ADR-008](../research/05-decisions.md#adr-008--outcome-banding-deferred-collect-values-first).
Note this concerns *critical success on skill checks*; critical **injuries** in
[80-criticals.md](80-criticals.md) are a separate combat subsystem and are unaffected.

### Q27 — Content localisation — **English canonical, Russian overlay**

Author in English. Russian is a `translation` table, not `label_en` / `label_ru` columns.
YAML packs stay English; Foundry content translation is Babele JSON; the site export is one
tree per locale; UI strings are `lang/{en,ru}.json`. Babele is optional. Missing Russian
falls back to English and is never faked by copying.

[ADR-015](../research/05-decisions.md#adr-015--english-canonical-russian-as-an-overlay),
design in [../forge/localisation.md](../forge/localisation.md).

The class roster still arrives named in Russian only in the source note (Воин, Эксперт,
Кверанский арканист). The English names in
[30-character-creation.md](30-character-creation.md#classes) remain translations this
document chose.

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
