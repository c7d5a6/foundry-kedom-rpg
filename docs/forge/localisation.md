# Localisation

Kedom is authored in English and played in English and Russian. That is a first-class
requirement, not a later overlay: it has to live in the database, the Forge UI, every export,
and the Foundry system, or the next language (or the next missing Russian description) becomes
a retrofit across all four.

The decision is [ADR-015](../research/05-decisions.md#adr-015--english-canonical-russian-as-an-overlay).
This document is the how.

## The split that Foundry forces

Foundry translates **two different kinds of text**, and they do not share a mechanism.

| Kind | Example | Where it lives | How Foundry consumes it |
|---|---|---|---|
| **System UI strings** | sheet tabs, "Success at a Cost", ability names, error messages | `packages/system/lang/{en,ru}.json` | Native `languages` in `system.json` + `game.i18n.localize` |
| **Content** | a skill's description, a race's flavour, a background's prose | SQLite, then exported | **Not natively.** Foundry does not translate document data. Babele applies a JSON overlay at runtime |

Mixing the two is the usual failure. Putting race descriptions in `lang/ru.json` means the
compendium still shows English when opened, and putting "Roll" in the database means the
sheet cannot switch language without a re-export. Keep them apart.

System UI strings land in the two JSON files. **Closed vocabulary** (ability/skill names,
proficiency, outcomes, …) is authored in Forge and written by `forge export lang`.
**Sheet chrome** (tabs, buttons, errors) stays hand-authored. Content translations are
authored in Forge against the English row, stored in SQLite, and exported (Babele when built).

## English is canonical, Russian is an overlay

Every translatable entity keeps its English `label` and `description` on the entity table.
Those columns are the source. They are what the YAML packs contain, what git diffs review,
and what every consumer falls back to.

Russian lives in a `translation` table, one row per `(entity, locale, field)`. English is
**never** stored there — duplicating it would create two sources for the same string.

```
skill.label = "Survive"                         canonical
translation(skill, ru, label) = "Выживание"     overlay
translation(skill, ru, description) = "..."     overlay, independently fillable
```

A missing overlay is not an error. Every consumer falls back to English, and Forge's
completeness view makes the gap visible so it can be filled on purpose rather than discovered
at the table.

This is the cheap direction to widen: a third locale is new rows, not new columns.

## What is translatable

Only display text.

| Field | Translatable | Why |
|---|---|---|
| `label` | yes | what humans read |
| `abbreviation` | yes | Might → МЩ |
| `description` | yes | flavour and rules prose |
| `comment` | **never** | authoring note; one field for all languages |
| `slug` | **never** | identity; `survive.tracking` in every language |
| `foundry_id` | **never** | Foundry document identity |
| numbers, weights, pick counts, grants | **never** | mechanics are language-independent |
| player-written free-form labels | **never** | play state, not content |

The last row is the one that looks like a gap. A character's Craft specialisation "cooper" is
typed at the table in whatever language the player speaks. Translating it would mean the
system invents a Russian word for a string it does not understand. Leave it.

## The `translation` table

One table, not one per entity. Completeness queries are a single `SELECT`, and a new entity
kind is a new allowed value rather than a new migration.

```
translation:
  id
  entity_kind     'attribute' | 'skill' | 'specialization' | 'race' | 'class'
                  | 'background' | 'region' | 'focus' | 'power' | 'condition'
                  | 'injury' | 'proficiency' | 'outcome' | 'save' | 'difficulty'
                  | 'derived' | 'injury_severity' | 'injury_location' | 'injury_weapon'
  entity_id       INTEGER NOT NULL     the id in that kind's table
  locale          TEXT NOT NULL        BCP 47; currently 'ru'
  field           'label' | 'abbreviation' | 'description'
  value           TEXT NOT NULL
  UNIQUE(entity_kind, entity_id, locale, field)
  CHECK(locale != 'en')
  CHECK(entity_kind IN (...))
  CHECK(field IN ('label', 'abbreviation', 'description'))
```

Referential integrity against twelve parent tables cannot be a foreign key, so a trigger
rejects a row whose `entity_id` does not exist in the kind's table, and `ON DELETE CASCADE`
is simulated by another trigger on each parent. That is the cost of the single table, and it
is cheaper than twelve identical ones.

`locale != 'en'` is the invariant that English stays on the entity.

## Forge UI

The editor is **side-by-side**. English on the left, read-only, because it is the source.
Russian on the right, editable. Switching the locale switcher in the chrome changes the right
pane, not the left.

A **completeness** view is a first-class screen, not a report you generate:

```
Survive            label ✓   description ✗
  Tracking         label ✓   description ✗
  Forest           label ✗   description ✗
```

It is the query `entity LEFT JOIN translation WHERE locale = 'ru'`, grouped by kind. Export
does not refuse incomplete Russian — a half-translated site is still playable, because
fallback exists — but the view makes "we shipped Survive with no Russian description" a
visible fact rather than a surprise.

Empty Russian fields stay empty. The UI does not copy English into the overlay as a
placeholder; that would mark the row complete.

## Exports

Same one-way rule as everything else. Each target handles locale differently because each
consumer's constraint is different.

### YAML packs — English only

`packs/_source/**` stays English. It is the reviewable artefact and the Foundry document
source. Putting both languages in the YAML would make every content diff bilingual noise, and
Foundry would still only display `name`.

### Babele JSON — the Foundry overlay

Forge emits one file per pack per locale:

```
packages/system/lang/babele/ru/kedom.skills.json
packages/system/lang/babele/ru/kedom.races.json
...
```

The shape is Babele's, not ours:

```json
{
  "label": "Skills",
  "mapping": {
    "description": "system.description"
  },
  "entries": {
    "Survive": {
      "name": "Выживание",
      "description": "..."
    }
  }
}
```

Babele keys entries by the document's **English `name`**, not by `_id` or slug. That is
uncomfortable given ADR-007, but it is the module's contract, and renaming an English label
already requires a translation edit in Forge, so the two stay in lockstep. The exporter
looks up by slug internally and writes the English label as the key.

A document with no Russian row is **omitted**, not emitted with English copied in. Babele
then leaves the original in place, which is the same fallback.

These files are generated and committed, same as the YAML. They are how a Russian world gets
translated content without a second copy of every pack.

### Site JSON — one tree per locale

```
site/v1/en/index/races.json
site/v1/ru/index/races.json
site/v1/en/race/nitol.json
site/v1/ru/race/nitol.json
```

The Russian tree contains Russian where it exists and English where it does not, plus
`"partial": true` on any record that fell back, so the site can mark untranslated strings
instead of silently presenting them as Russian. Layout and lazy-loading are unchanged; see
[public-site-export.md](public-site-export.md).

### Markdown — `--locale`

Defaults to English. `npm run forge:export:md -- -locale=ru` writes the overlay where present.
Gitignored either way.

## Foundry

### UI strings

`system.json` declares both languages:

```json
"languages": [
  { "lang": "en", "name": "English",  "path": "lang/en.json" },
  { "lang": "ru", "name": "Русский", "path": "lang/ru.json" }
]
```

Every user-facing string in sheets, dialogs, and chat cards goes through `game.i18n.localize`
or the Handlebars `localize` helper. Hard-coded English in a template is a bug.

`lang/ru.json` is **source**, like `en.json`, and is complete: same keys, Russian values. A
missing key falls back to English automatically; that is Foundry's default and is how partial
work stays playable.

### Content, via Babele

The system **does not require** Babele. A Russian client without the module still gets a
Russian sheet (UI strings) and English compendia (documents). With Babele active, the system
registers the generated overlay on `init`:

```
if (game.babele) {
  game.babele.register({
    module: "kedom",
    lang: "ru",
    dir: "lang/babele/ru"
  });
}
```

Babele is listed in `system.json` as a **relationship of type `optional`**, so Foundry can
prompt to enable it without making the system uninstallable without it. Pin the v14 line
(Babele 2.8.x / 2.9.x).

Do not reinvent this inside the system. Storing `flags.kedom.name.ru` on every document and
swapping it at render time misses chat cards, tokens, the sidebar, and every module that
reads `document.name`. That is the job Babele already does.

### What the sheet never does

The sheet looks up skill names with `game.i18n.localize("KEDOM.Skill.survive")`, **not** by
reading the item's `name`. The item's `name` is content, comes from the pack, and is what
Babele overlays. The localisation key is the slug, which does not change. This is why slugs
exist, and it is the same rule as ADR-007 applied to languages.

## Closed vocabularies are authored in Forge, generated into lang JSON

Attributes, the nineteen skills, fixed skill specializations, proficiency tiers, outcomes,
saves (Reflex / Fortitude / Will; Luck save when seeded), difficulty labels,
derived combat labels (`KEDOM.Attributes`), conditions, and injury axes live in SQLite
(`attribute` / `skill` / `specialization` / `vocab`) with Russian in `translation`.
Sheet chrome for **Strain roll** (not a vocab save) stays hand-authored under `Sheet` /
`Chat` until renamed in lang.

`npm run forge:export:lang` regenerates those closed sections in
`packages/system/lang/{en,ru}.json`. Sheet chrome (`TYPES`, `System`, `Sheet`, `Chat`,
`Roll`, `Error`, `Settings`) stays hand-authored and is preserved across exports.

That is deliberate:

- The sheet and roll pipeline must resolve a name **without loading an item** — that is
  what `lang/*.json` is for, keyed by slug.
- The sidebar / compendium still use `document.name` (Babele) once packs exist.

Edit labels in Forge (Attributes, Skills, Specializations, or Vocabulary), then re-export lang. Do not
hand-edit closed sections in the JSON files. When YAML pack export lands, it will call the
same lang emitter first so packs and UI strings stay aligned.

## Completeness, not blocking

Export never fails because Russian is incomplete. The author writes English first, by design;
Russian lags, also by design. What the pipeline must not do is ship a Russian overlay that
silently contains English, because that marks the work done.

The rule: **omit or fall back, never copy.** Forge's completeness view is how the lag is
managed.

## UTF-8, still

Russian and the conlang's diacritics (`Kedôm`, `Nitól`, `Ñiziel`) travel through the same
pipe. No transliteration, no Unicode normalisation, no escaping on the way out. The existing
UTF-8 invariant in [export-formats.md](export-formats.md) covers both.

## What this does not cover

**Rules documents in `docs/rules/`.** Those stay English. They are the design spec, not
player-facing text. A Russian rules book, if one happens, is a Markdown export of content
plus a separately authored document, not a translation of this folder.

**Chat cards of rolls already made.** A check message persists the modifier labels that were
localised *at roll time*. Switching the client language later does not rewrite old cards —
the labels are data, not keys. That is the same persistence trade-off as
[data-model.md](../system/data-model.md) already makes for the modifier list.

**A translation memory or glossary.** If the same English phrase is translated two ways,
Forge will not notice. A glossary is a tool we can add when the corpus is large enough to
make inconsistency expensive; it is not needed to start.
