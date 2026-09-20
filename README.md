# Kedom RPG

An OSR tabletop system in the Worlds Without Number tradition, together with the tooling to
author its content and play it in Foundry VTT.

**Status: scaffold.** Documentation, project structure, and configuration are in place. No
implementation code has been written yet.

## What is in here

| Path | What it is |
|---|---|
| [docs/rules/](docs/rules/) | The game itself — attributes, skills, combat, magic. The design spec. |
| [docs/research/](docs/research/) | Survey of ten existing Foundry systems that informed the architecture. |
| [docs/system/](docs/system/) | How the Foundry system is built: data model, roll pipeline, UI, packs. |
| [docs/forge/](docs/forge/) | The content tool: relational schema and export formats. |
| [packages/system/](packages/system/) | The Foundry VTT game system. |
| [packages/forge/](packages/forge/) | Kedom Forge — content authoring: Go + SQLite API, Svelte web UI. |
| [packages/content/](packages/content/) | The authored content database and its reviewable SQL dump. |
| [packages/shared/](packages/shared/) | TypeScript types generated from the Go models, shared by both sides. |
| [Style.md](Style.md) | Coding standard for TypeScript and Go. |

Start with [docs/research/00-summary.md](docs/research/00-summary.md) for why the architecture
looks the way it does, then [docs/research/05-decisions.md](docs/research/05-decisions.md) for
the decisions themselves.

## Architecture in one paragraph

The Foundry system targets **v14 only**, uses **TypeDataModels** with no `template.json`, and
builds every sheet on **ApplicationV2 with Handlebars** — no UI framework inside Foundry.
Appearance comes from a CSS design system layered onto Foundry's own cascade layers, which is
where a "slick" sheet actually comes from; see
[ADR-003](docs/research/05-decisions.md#adr-003--applicationv2--handlebars-for-all-sheets-no-svelte-inside-foundry).
Game rules are pure functions in `derivations/` and `rolls/`, not a rules engine. Content is
authored in SQLite through Forge and exported one-way to YAML, which compiles to compendium
packs.

## Prerequisites

- **Foundry VTT 14.367 or later.** v14 is required; the system does not support v13.
- **Node 22 LTS** via [nvm](https://github.com/nvm-sh/nvm) (`.nvmrc` pins the major) and **npm**
  (ships with Node).
- **Go 1.26** for the Forge API. No C toolchain needed — SQLite is pure Go.
- Optional for the full lint gate: `golangci-lint`, `gofumpt`, `sqlc`.

## Getting started

```sh
nvm use
npm install

# Point the build at your Foundry user data directory.
cp foundry-config.example.json foundry-config.json
$EDITOR foundry-config.json

npm run system:link     # symlink packages/system/dist into Data/systems/kedom
npm run system:watch    # rebuild on change; Foundry hot-reloads CSS and templates
```

For content authoring:

```sh
npm run forge:api       # Go API on :7777
npm run forge:web       # Svelte UI on :5173
```

## Everyday commands

```sh
npm run check           # format, lint, typecheck, unit tests — run before committing
npm test                # Vitest unit tests (rules arithmetic)
npm run test:e2e        # Playwright against a running Foundry instance
npm run packs:build     # compile packs/_source YAML into LevelDB packs
npm run packs:extract   # the reverse, for inspecting what Foundry wrote
npm run forge:types     # regenerate packages/shared types from the Go models
npm run forge:export:md # barebones markdown rulebook → exports/markdown/
```

## Licence

MIT for code. The Kedom setting and rules text are the author's own work; Worlds Without
Number is the work of Kevin Crawford and Sine Nomine Publishing, and is referenced here only
as a design influence. This project contains no WWN text and is not affiliated with or
endorsed by Sine Nomine Publishing.
