# Kedom RPG — Foundry VTT system

A low-fantasy OSR system in the Worlds Without Number tradition. **Requires Foundry v14.367 or
later**; there is no v13 support.

**Status: scaffold.** The manifest, build, and directory structure exist. Implementation has
not started.

## Design documentation

- [Data model](../../docs/system/data-model.md) — actor and item types, the slug-based skill
  and specialisation model
- [Roll pipeline](../../docs/system/roll-pipeline.md) — modifier collectors and the pure tier
  function
- [UI design system](../../docs/system/ui-design-system.md) — CSS tokens, layers, and the
  sheet base class
- [Compendium pipeline](../../docs/system/compendium-pipeline.md) — how content becomes a pack
- [Game rules](../../docs/rules/) — the system this implements
- [Decisions](../../docs/research/05-decisions.md) — why it is built this way

## Layout

```
system.json              v14 manifest; declares the three CSS cascade layers
vite.config.ts           builds to dist/, which is what gets symlinked
src/
  kedom.ts               entry: register data models and sheets on init
  config/                the KEDOM config object -- dice, thresholds, skills
  data/                  TypeDataModels: actor/, item/, chat-message/, templates/
  documents/             document subclasses
  derivations/           pure functions; no game, no I/O, no document reads
  rolls/                 modifier collectors and the tier function
  applications/          api/ (sheet base), sheets/, dialogs/
  migrations/            numbered, one class each
  styles/                tokens/, elements/, components/, sheets/
templates/               Handlebars
lang/en.json             English UI strings
lang/ru.json             Russian UI strings
lang/babele/ru/          generated Babele overlays -- do not hand-edit
packs/_source/           YAML written by Forge -- generated, do not hand-edit
```

## Building

```sh
npm run system:build                     # or: npm run build -w @kedom/system
npm run system:watch                     # rebuild on change
npm run system:link                      # symlink dist/ into Data/systems/kedom
```

`hotReload` is declared in the manifest, so Foundry picks up CSS, template, and language
changes without a page refresh.

## The rules that shape this code

Stated in full in [.cursor/rules/kedom-system.mdc](../../.cursor/rules/kedom-system.mdc).
In short:

- ApplicationV2 and Handlebars only. No Svelte — appearance is a CSS budget, not a framework.
- TypeDataModels only; `template.json` was removed in v14.
- Derivations are pure. `prepareDerivedData` runs on every actor update.
- Every derived path is zero-initialised so Active Effects have stable targets.
- Slugs are identity; display labels are not. Never parse a name for meaning.
- Under 10,000 lines of logic.
