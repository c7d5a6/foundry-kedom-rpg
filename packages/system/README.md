# Kedom RPG — Foundry VTT system

A low-fantasy OSR system in the Worlds Without Number tradition. **Requires Foundry v14.367 or
later**; there is no v13 support.

**Status: barebone playable.** Character actors with six abilities, nineteen skills, and skill
checks that post `2d10` + attribute mod + proficiency to chat. No NPCs, items, packs, or
migrations yet.

## Getting it into Foundry

Foundry loads systems from `<User Data>/Data/systems/<id>/`. The build writes to
`packages/system/dist/`; you symlink that into Foundry.

1. Copy [`foundry-config.example.json`](../../foundry-config.example.json) → `foundry-config.json`
   at the repo root. Set `dataPath` to the Foundry user-data root (the folder that contains
   `Data/`), as a **path relative to the repo root** — e.g. `../foundrydata`.
2. `nvm use && npm install`
3. `npm run system:build` — emits `dist/` (`kedom.mjs`, CSS, `system.json`, `lang/`, `templates/`).
4. `npm run system:link` — symlinks `dist/` → `{dataPath}/Data/systems/kedom`.
5. Start Foundry **v14.367+**, create/open a world, enable **Kedom RPG**.

Dev loop: `npm run system:watch` plus Foundry `hotReload` for CSS/HBS/lang; reload the page for
JS changes.

Manual fallback (from repo root; adjust `dataPath`):

```sh
ln -sfn "$(pwd)/packages/system/dist" "../foundrydata/Data/systems/kedom"
```

## Design documentation

- [Data model](../../docs/system/data-model.md) — actor and item types, the key-based skill
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
  config/                dice, proficiency table, skill→ability map, outcome bands
  data/actor/            Character TypeDataModel
  derivations/           pure ability-mod (no game / I/O)
  rolls/                 modifier collectors + skill check → ChatMessage
  applications/sheets/   CharacterSheet (ApplicationV2 + Handlebars)
  styles/                tokens / elements / system CSS entries
templates/               Handlebars
lang/en.json             English UI strings
lang/ru.json             Russian UI strings
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
- Keys are identity; display labels are not. Never parse a name for meaning.
- Under 10,000 lines of logic.
