# Public site export — the character generator

**Status: design note, not built.** Nothing in this document is implemented. It records what
the existing WWN generator does, what a Kedom one would need, and how Forge should feed it.

There is a working character generator for the **WWN** version of Kedom in the public site
project at `/home/c7d5a6/projects/rpg/kedom/`. The goal is a Kedom-rules equivalent, driven by
JSON that Forge emits rather than by data pasted into components.

## The existing generator

VuePress 2 (`2.0.0-rc.11`) with `vuepress-theme-hope`, Vue 3.4, the Vite bundler,
`@vuepress/plugin-register-components`, and `@3d-dice/dice-box` for 3D dice. Components live
in `.vuepress/components/` and are used from Markdown.

It is a four-step funnel:

```
Character.vue      orchestrator, 583 B
  └─ Races.vue         pick race/culture          →  emits race
  └─ Backgrounds.vue   filtered by race           →  emits background
  └─ Classes.vue       filtered by race           →  emits class1, class2
  └─ Summary.vue       derives level-1 statistics
     Roll.vue          3D dice for the random path
```

Every step offers **roll or choose**. `Races.vue` carries a `toRoll` weight per entry and
computes `minRoll`/`maxRoll` ranges with a `reduce` at load time, so the list doubles as a d20
table. Backgrounds roll on `1d<list length>`, and background skills roll `1d8` twice.

`Summary.vue` is the only real logic: `calcHd`, `calcAb`, and `calcArts` combine two partial
classes, taking the better hit die, the constrained attack bonus, and the union of arts.

### The data shapes it uses

```
race:        { id, name, toRoll, foci, description, suboptions[] }
background:  { title, description, freeSkill, quickSkills[2], allSkills[8] }
class:       { id, title, partial, hd, ab, minAb, arts[], spells, foci, skill, description }
raceToClass: { id, classes[], forcedClass[] }
```

`backgrounds` is an object keyed by race/culture id. `raceToClass` maps a race to its allowed
class ids, with `forcedClass` for races that must take a particular one.

### Why it needs replacing rather than porting

**The data is hardcoded inside the components.** `Races.vue` is 25.9 KB, `Backgrounds.vue`
46.6 KB, `Classes.vue` 64.0 KB — **136 KB of source, of which almost all is data**, mostly
Russian HTML description blobs in template literals. The logic in those three files is a few
dozen lines.

The intent to externalise is already there and abandoned half-way: there is a 129-byte stub at
`.vuepress/components/classes/races.json` and a commented-out
`//const races = require('./classes/races.json')` in both `Races.vue` and `Backgrounds.vue`.

**The content is WWN, not Kedom.** The skill slugs are WWN's — `administer`, `lead`, `pray`,
`ride`, `sail`, `sneak`, `trade`, `work`, plus the `any combat` / `any skill` wildcards. Kedom
has a different nineteen ([../rules/20-skills.md](../rules/20-skills.md)), where sneaking is a
*specialisation* of Prowl rather than a skill. `hd` and `ab` are WWN class progressions.

So this is a **remapping job, not a port**. Tracked as
[Q25](../rules/99-open-questions.md#q25--the-wwn-generator-content-needs-remapping-to-kedom-skills).

## What it confirms about the Forge schema

Reading the generator was useful beyond the export question, because it is a working
implementation of the same content graph [schema.md](schema.md) models.

**Confirmed:**

- **Sub-cultures are real and mechanical.** `niziel`, `ferori`, `nerland`, `half-elf`, and
  `half-orc` are human sub-cultures, and **each has its own background list**. That is direct
  evidence for `race.parent_race_id`, and it largely answers
  [Q9](../rules/99-open-questions.md#q9--human-sub-cultures-need-mechanics): human cultures do
  carry mechanical weight, at least through backgrounds.
- **`race_class.is_prefilled_slot` is right.** The generator's `forcedClass` is the same idea:
  Rats force Expert, Lizards force partial-Beast, Gnomes force Elementalist.
- **Backgrounds belong to races, not regions.** `backgrounds` is keyed by culture id, exactly
  as `race_background` assumes.

**Gaps it exposes:**

- **No weight column.** The generator needs an integer `toRoll` per race to build d20 ranges.
  `region_race.prevalence` is a three-value enum (`common`/`uncommon`/`rare`), which cannot
  reconstruct "Nitól is 3/20, Half-Orc is 1/20". A `weight INTEGER` column is needed wherever a
  list is rollable.
- **Background skill tables are ordered, not just a set.** A WWN background has a free skill, a
  **2-entry** quick-skill list, and an **8-entry** `1d8` table with **deliberate duplicates**
  (`["pray", "pray"]` doubles the odds). `skill_choice` with `pick_count` covers the quick
  skills; the d8 table needs an ordered list that permits repeats, so
  `skill_choice_option` needs a `roll_index` and must not be constrained unique.
- **Nothing models "any combat" / "any skill".** A wildcard option is a real option type, not a
  missing reference.

These are recorded in [schema.md](schema.md#known-gaps) rather than fixed here.

## The export

A fourth Forge target alongside YAML, JSON, and Markdown
([export-formats.md](export-formats.md)). Same rules apply: one-way, deterministic, slugs are
identity, UTF-8 preserved.

```
Forge -> content.sqlite -> site/v1/**.json -> committed into the kedom site repo
```

The site consumes **static JSON over `fetch`**. It is a GitHub Pages deployment, so there is no
API — which is fine, because the content is read-only and changes only when Forge re-exports.

## Payload, measured

The concern was that all the JSON would load for every user. Here is the actual size of today's
WWN dataset:

| | Bytes |
|---|---|
| Raw (the three data components) | 136,442 |
| gzip -9 | **23,851** |

13 races and cultures, 204 background entries, 18 classes.

**So the whole dataset is ~23 KB compressed.** As a single fetched file that is already
acceptable — smaller than most web fonts. Chunking purely to reduce bytes would be premature.

### The real problem is different, and worse

The data is not fetched at all today — it is **inside Vue components that
`@vuepress/plugin-register-components` registers globally**. Globally registered components go
into the app bundle, not a route chunk, so a reader who opens a lore page and never touches the
generator very likely still downloads all 136 KB of it.

That is worth verifying with `pnpm docs:build` and a look at the chunk graph before building
anything, but if it holds, it means:

> **The first and largest win is getting the data out of the JS bundle entirely, not splitting
> the JSON.** Moving 136 KB of Russian HTML from the app bundle into a file fetched only on the
> generator page is the whole optimisation. Chunking that file is a second, much smaller step.

## Proposed layout

Even at 23 KB, an **index/detail split** is worth doing — not mainly for size, but because it
matches the funnel, makes caching granular, and means adding a race does not invalidate the
cached copy of every other race.

```
site/v1/
  manifest.json                     version + content hashes for every file below
  index/
    races.json                      id, label, weight, rollRange, parentId, thumb
    classes.json                    id, label, partial, allowedFor[]
    skills.json                     id, label, attribute
  race/<slug>.json                  full record: description, foci, grants
  background/<slug>.json
  class/<slug>.json
  by-race/<slug>.json               that race's background ids and class ids
```

The split follows what each step actually renders:

| Step | Needs | Fetches |
|---|---|---|
| Land on the page | 13 race names + roll ranges | `index/races.json`, under 1 KB |
| Pick a race | one description, its background and class lists | `race/<slug>.json`, `by-race/<slug>.json` |
| Pick a background | one description and its skill tables | `background/<slug>.json` |
| Pick a class | one description | `class/<slug>.json` |

First paint drops from the full dataset to roughly 1 KB, and each click costs one small
request. A user who builds one character fetches maybe 6 KB of the 23 KB total.

### Caching

GitHub Pages does not let you set cache headers per file, so **content-hashed filenames**
referenced from `manifest.json` are the mechanism: `race/nitol.a3f9c2.json` can be cached
indefinitely, and only `manifest.json` needs revalidating. `manifest.json` also carries the
schema version, so the site can refuse to render against an export it does not understand.

### Do not

- **Do not fetch per list item.** 204 background files fetched to render one list is worse than
  one 23 KB file. The `by-race/<slug>.json` roll-up exists to prevent this.
- **Do not build a loading spinner per step.** At these sizes, prefetch the likely next file
  when a radio button gains focus, and the fetch finishes before the click does.
- **Do not put the descriptions in the index files.** The descriptions *are* the payload; that
  is the entire reason the split works.

## Descriptions: HTML or Markdown

The existing generator stores rendered HTML in template literals, including `<img>` tags with
inline styles and `photo-swipe` attributes. That couples content to the current theme.

Forge should export **Markdown**, with the site rendering it. The compendium pipeline already
needs a prose field per entity, and Foundry wants HTML while the site wants something
theme-neutral. Storing Markdown and rendering per target keeps one source. Tracked as
[Q26](../rules/99-open-questions.md#q26--description-format-for-multi-target-content).

## Localisation

The existing generator is **entirely in Russian**, with English rules terms left untranslated
mid-sentence. The Foundry system is English-first with everything in `lang/en.json`.

If both consume the same Forge export, content needs a language dimension — `label_en` /
`label_ru`, or a `translation` table keyed by slug and locale. This has to be decided before
the schema sets, because retrofitting it means touching every table. Tracked as
[Q27](../rules/99-open-questions.md#q27--content-localisation).

## Relationship to the other exports

The site export is a **view**, exactly like the Markdown export. It is not a source of truth,
it is not editable, and it does not round-trip. Slugs match across all four targets, so a race
on the website, a race in a Foundry compendium, and a race row in SQLite are the same entity.

That is the payoff of [ADR-007](../research/05-decisions.md#adr-007--slug-identity-for-skills-and-specialisations)
reaching outside Foundry: the website can deep-link to `#/race/nitol` and the Foundry
compendium can carry the same identifier without a mapping table between them.
