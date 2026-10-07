# Forge content schema

The relational schema behind the authoring tool. This exists to make one specific workflow
work:

> I want to create a new region, and I think it has these races, and for each of them I need a
> list of backgrounds, and every background needs a list of skills to choose from.

That is a foreign key graph. Expressing it in flat files means maintaining referential
integrity by hand, which is the reason SQLite is the source of truth
([ADR-011](../research/05-decisions.md#adr-011--sqlite-is-the-content-source-of-truth-yaml-is-the-reviewable-artefact)).

## The graph

```mermaid
flowchart TD
  region --> region_culture
  region_culture --> race
  region --> region_culture_background
  race --> region_culture_background
  region_culture_background --> background
  race --> race_class
  race_class --> class
  race --> talentC[talent]
  class --> talentK[talent]
  background --> background_growth
  background_growth --> skill
  background --> freeSkill[skill]
  skill --> specialization
  attribute --> skill
  translation -.-> skill
  translation -.-> race
  translation -.-> class
  translation -.-> background
  translation -.-> region
  translation -.-> talent
```

`race` is the **culture** table (Forge UI label “Culture”; Foundry `origin` `subType: "race"`).
Background lists are **region × culture** scoped via `region_culture_background`, not culture-only.

`translation` is an overlay, not a parent. English `label` / `description` live on the entity;
Russian lives in `translation`. See [localisation.md](localisation.md).

## Identity, and why it is separate from names

Every content row carries three distinct identifiers, and conflating any two of them is the
mistake this whole schema is designed to avoid:

| Column | Mutable? | Purpose |
|---|---|---|
| `id` | never | SQLite primary key. Internal to Forge. |
| `slug` | never (after create) | Cross-system identity. Referenced by the Foundry system and by exports. **Auto-generated** from the English label on create (`kebab-case`); uniqueness enforced with `-2`, `-3`, … suffixes. Authors do not type a slug; updates never change it. |
| `foundry_id` | never | The 16-character Foundry document `_id`, stored so re-export does not regenerate it. |
| `label` | freely | What humans read. **English**, the canonical display name. Russian lives in `translation`. |

Call of Cthulhu 7e, WFRP4e, and Star Wars FFG all use the display name as identity and parse
it back out with string operations, so renaming a skill silently breaks references
([../research/04-skill-systems.md](../research/04-skill-systems.md)). Storing `foundry_id`
matters for the same reason one level down: a regenerated `_id` breaks every reference to that
document in every existing world.

Slugs are enforced by a `CHECK` constraint: lower-case, `[a-z0-9]`, dot-separated segments.

## Tables

### `attribute`

The six primary attributes — Might, Dexterity, Knowledge, Focus, Presence, Luck. Small and
fixed, but a table rather than an enum because skills reference it and the set has already
changed once: strength and constitution merged into Might, dropping the count from seven
([Q2](../rules/99-open-questions.md#q2--is-strength-separate-from-constitution--no)).

Closed `vocab` of `kind = 'save'` currently seeds **reflex**, **fortitude**, and **will**
(class saves on `2d10`). **Luck save** is a separate `d20` roll with Luck save proficiency —
add a `luck` save vocab row (and Foundry save field) when that proficiency is implemented;
**Strain roll** is not a save vocab entry (plain `d20` vs Resolve/Strain). See
[../rules/10-attributes.md](../rules/10-attributes.md).

```
id, slug, label, abbreviation, description, comment, sort_order
```

`comment` is an authoring note shared across languages — not exported to play, not translated.

`description` (and `translation` rows for field `description`) are **Markdown**. Foundry and
the public site render to HTML on export — see
[Q26](../rules/99-open-questions.md#q26--description-format-for-multi-target-content--markdown-in-sqlite).

### `skill`

```
id, slug, label, description, comment
attribute_id            -> attribute      the usual governing attribute
specialization_mode     'none' | 'fixed' | 'free' | 'parameterized'
is_secondary            skills outside the core nineteen
sort_order
foundry_id
```

`specialization_mode` encodes the three kinds from
[../rules/20-skills.md](../rules/20-skills.md), plus `none` for Exert, Punch, Shoot, and Stab:

- `fixed` — options come from `specialization` rows authored here
- `free` — the player writes a label at character creation; Forge stores no options
- `parameterized` — closed `specialization` rows **plus** an open parameter the player fills
  free-form (Survive's Environment). Authored rows have `parameter` null; free-form play
  labels use slugs like `survive.environment.forest`.

Governing `attribute_id` and `specialization_mode` are editable in the Forge Skills editor
(PATCH `/api/skills/{id}`). The Foundry system still mirrors ability links in
`packages/system/src/config/kedom.ts` (`SKILL_ABILITY`) until pack export generates that
config — after changing an attribute in Forge, update `SKILL_ABILITY` to match.

### `specialization`

```
id, slug, label, description, comment
skill_id                -> skill
parameter               nullable; 'environment', 'pantheon', 'culture'
sort_order
foundry_id
```

`slug` nests under the skill, and under the parameter when there is one:
`conduct.law`, `survive.environment.forest`. The nesting is not decoration — it lets a query
ask "which environment specialisations exist" by prefix, which is what the character sheet
needs.

`parameter` is null for plain fixed specialisations.

### `race`

```
id, slug, label, description
parent_race_id          nullable; self-reference for sub-cultures
unarmored_ac            nullable; Lizards are 13
sort_order
foundry_id
```

`parent_race_id` handles human sub-cultures such as the Nitól — currently flavour-only, but
the setting notes list several, and if they gain mechanics they need to be first-class
([Q9](../rules/99-open-questions.md#q9--human-sub-cultures-need-mechanics)).

### `race_grant`

What a race gives. One row per grant, because races grant heterogeneous things and a wide
table with mostly-null columns would be worse.

```
id
race_id                 -> race
kind                    'skill' | 'specialization' | 'attribute' | 'ability' | 'save_bonus'
level                   1 by default; 2 for the Dwarf's level-2 ability
skill_id                -> skill,          nullable
specialization_id       -> specialization, nullable
attribute_id            -> attribute,      nullable
delta                   nullable; +1 / -1
is_player_choice        the Lizard's "STR or CHA +1"
choice_group            nullable; ties the +1 and the -1 of one choice together
text                    nullable; for narrative grants
```

Three things this shape gets right:

**`kind` distinguishes skill from specialisation grants.** The source has Rats granting
"Sneak" and Gnomes granting "Magic", neither of which is a skill — sneaking is a
specialisation of Prowl and the magic skill is Arcana. Either the grants predate the skill
list or racial grants can target specialisations, and the latter is both more likely and more
interesting
([Q10](../rules/99-open-questions.md#q10--racial-skill-grants-name-skills-that-do-not-exist)).

**`level` supports level-gated racial abilities.** Dwarves are the only race in the source with
one, but one is enough to need the column.

**`is_player_choice` plus `choice_group`** model "STR or CHA +1, DEX or CHA −1" as a decision
made at character creation rather than a fixed modifier. Both halves share a `choice_group`
so the UI can present them together, and the resolved answer is persisted on the actor, never
re-derived.

### `class` and `race_class`

```
class:       id, slug, label, description, comment,
             is_full (0|1), is_partial (0|1),
             attack_progression, skill_points_per_level, hit_die,
             sort_order, foundry_id
race_class:  race_id, class_id, is_prefilled_slot
```

`is_full` and `is_partial` are independent booleans because the five full classes are **also**
selectable as Adventurer partials. At least one must be true. Adventurer itself is **not** a
row — it is two partials combined at character creation.

The class list is a many-to-many with races because that is the main mechanical weight of
choosing a race. `is_prefilled_slot` captures the Adventurer pattern: most non-human races can
*only* be Adventurers with one of the two slots already filled.

The class roster is now fixed — five with `is_full` and `is_partial`, plus seven partial-only,
listed in [../rules/30-character-creation.md](../rules/30-character-creation.md#classes) —
but none of the progression numbers exist yet
([Q12](../rules/99-open-questions.md#q12--per-class-mechanics-are-unspecified)), so
`attack_progression`, `skill_points_per_level`, and `hit_die` stay nullable. They are named
after WWN's `classEdge` fields because those are known to be the right shape.

### `talent`

Character talents (not “feats”). Linked from cultures and classes by **slug** after export.

```
talent: id, slug, label, description, comment,
        category ('class'|'culture'|'skills'|'combat'|'general'|'other'),
        feature_key, grants_json, sort_order, foundry_id
```

Cultures and classes that link a talent are shown on the talent’s Forge page (and reverse links
appear on culture/class/background/region pages for pack-exported entities).

`grants_json` matches the Foundry talent `grants` shape. Active Effect authoring in Forge is
deferred.

### `race` (culture)

```
race: id, slug, label, description, comment, parent_race_id?, talent_id?,
      sort_order, foundry_id
race_class: race_id, class_id, is_prefilled_slot
```

UI label is **Culture**. Allowed classes are culture-global (`race_class`); background lists
are not — see `region_culture_background`.

### `region`, `region_culture`, `region_culture_background`

```
region:                     id, slug, label, description, comment, sort_order, foundry_id
region_culture:             region_id, race_id, weight INTEGER CHECK (weight > 0)
region_culture_background:  region_id, race_id, background_id, sort_order
                            FK (region_id, race_id) → region_culture
```

Integer **weight** (not prevalence enum). The create wizard displays percentages
(`round(100 * weight / sum)`; last culture absorbs rounding so the UI totals 100).

The same culture can have **different background lists in different regions**. The ternary
join requires a matching `region_culture` row.

### `background` and `background_growth`

```
background:         id, slug, label, description, comment,
                    free_skill_id, free_specialization_id?, free_specialization_label?,
                    sort_order, foundry_id
background_growth:  background_id, roll_index (1–8 UNIQUE), skill_id,
                    specialization_id?, specialization_label?
```

`free_specialization_id` / `specialization_id` reference a catalog `specialization` row
(`fixed` / closed leaves of `parameterized`). `free_specialization_label` /
`specialization_label` hold an English freeform label (`free` / open parameter of
`parameterized`). At most one of id/label per grant; both may be empty (player fills at
creation). Mode is taken from the skill’s `specialization_mode`. Freeform labels are not
translated.

Creation grants the free skill (+ optional specialization), then rolls **2×1d8** on the eight
growth rows ([Q11](../rules/99-open-questions.md#q11--background-growth-free-skill--21d8)).
Application validation: exactly eight growth rows; unique `(skill, specialization id|label)`
across free + growth for one background.

### `class` (origins fields)

In addition to roster flags, class rows carry Foundry progression fields used by pack export:
`talent_id`, `hit_die` / `hit_die_priority`, talent picks, prioritized saves, `arts_skill_key`,
`class_talent_keys` (JSON array). **Effort** authoring is deferred.

### `translation`

The Russian overlay. English stays on the entity; this table never contains `locale = 'en'`.
The full design is [localisation.md](localisation.md).

```
id
entity_kind     'attribute' | 'skill' | 'specialization' | 'race' | 'class'
                | 'background' | 'region' | 'talent' | 'power' | 'condition'
                | 'injury'
entity_id       INTEGER NOT NULL
locale          TEXT NOT NULL        currently only 'ru'
field           'label' | 'abbreviation' | 'description'
value           TEXT NOT NULL
UNIQUE(entity_kind, entity_id, locale, field)
CHECK(locale != 'en')
```

One table rather than one per entity so completeness is a single query and a new kind is a
new allowed value. The cost is that `entity_id` cannot be a real foreign key: a trigger
rejects rows whose id is missing from the kind's table, and each parent deletes its
translations on `DELETE`.

A missing row means "fall back to English", not "this entity has no name". Empty `value` is
rejected — omit the row instead, so completeness cannot be faked by storing a blank.

### `schema_migrations`

```
version, applied_at
```

Written by the migration runner. See
[../../packages/forge/api/README.md](../../packages/forge/api/README.md).

## Invariants the database enforces

Enforced in SQL, not in application code, because the database is the only layer that cannot
be bypassed:

- `PRAGMA foreign_keys = ON` on every connection. Without it SQLite silently ignores foreign
  keys, which defeats the entire design.
- `slug` is `UNIQUE` per table and `CHECK`-constrained to the slug character set.
- `specialization.skill_id` is `ON DELETE CASCADE`; deleting a skill removes its
  specialisations.
- `race_grant` has a `CHECK` that the column matching `kind` is non-null and the others are
  null.
- `skill_choice_option` has a `CHECK` that exactly one of `skill_id` and `specialization_id` is
  set.
- `skill_choice.pick_count` is `CHECK`-constrained to be at least 1 and no greater than the
  option count — enforced by trigger, since a `CHECK` cannot count rows.
- Every join table has a composite primary key, so a duplicate link is impossible.
- `translation.locale` cannot be `'en'`, and `(entity_kind, entity_id, locale, field)` is
  unique, so an entity cannot carry two Russian labels.
- `translation.value` is `NOT NULL` and `CHECK(length(value) > 0)`.

## Known gaps

**Full Nerland (and other) content** is not authored yet — the schema and export path exist;
pack YAML stays empty until Forge is filled. Draft wizard config remains the fallback.

**Wildcards in growth rows** (`any combat` / `any skill`) appear in legacy draft tables and the
WWN generator. Authored Forge growth rows are concrete skill(+spec) pairs; wildcards are not a
first-class column.

**Effort / Active Effects** are not authored in Forge yet.

Class skill/save die is settled (`2d10`); Luck save and Strain roll use `d20`. Remaining open
questions (class numbers beyond hit die, magic) still argue for keeping progressions as data
rather than code constants. See also
[public-site-export.md](public-site-export.md#what-it-confirms-about-the-forge-schema).

## What is not in here

**Setting text.** The vault has 161 notes on history, myth, calendar, weather, languages, and
places. None of it is relational, and forcing it into tables buys nothing. It exports to
compendium journal entries from Markdown directly.

**Play state.** Actors, worlds, and campaign notes are Foundry's business.

**The critical-injury design notes.** [80-criticals.md](../rules/80-criticals.md) is
equivalence/design scaffolding (severity × location × weapon), not a play lookup. Wound play
uses the source Wound-count table. Optional Active Effects can be hand-authored from those
notes via YAML once needed
([../system/compendium-pipeline.md](../system/compendium-pipeline.md)).
