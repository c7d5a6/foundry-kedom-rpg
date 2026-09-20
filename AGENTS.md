# AGENTS.md

Orientation for anyone — human or agent — working in this repository.

## What this is

Kedom RPG: an OSR tabletop system, a Foundry VTT system implementing it, and the tooling to
author its content. An npm workspaces monorepo with a Go component.

**Current state: scaffold.** Documentation, structure, and configuration exist. Almost no
implementation code has been written.

## Read these first

| Question | File |
|---|---|
| Why is the architecture like this? | [docs/research/00-summary.md](docs/research/00-summary.md) |
| What was decided, and on what evidence? | [docs/research/05-decisions.md](docs/research/05-decisions.md) |
| What are the game's rules? | [docs/rules/](docs/rules/) |
| What is still undecided? | [docs/rules/99-open-questions.md](docs/rules/99-open-questions.md) |
| How does content reach the website? | [docs/forge/public-site-export.md](docs/forge/public-site-export.md) |
| How does English/Russian localisation work? | [docs/forge/localisation.md](docs/forge/localisation.md) |
| How do I write code here? | [Style.md](Style.md) |

The research documents are not background reading. They contain measurements that settled
specific arguments, and re-opening those arguments without new evidence wastes everyone's time.

## Layout

```
docs/          research, game rules, system design, forge design
packages/
  system/      the Foundry VTT system (TypeScript, ApplicationV2 + Handlebars)
  forge/api/   content authoring backend (Go, SQLite)
  forge/web/   content authoring UI (Svelte 5)
  content/     the authored content database and its SQL dump
  shared/      types shared between system and forge, mostly generated from Go
tools/         repo tasks (tsx)
.cursor/rules/ per-area conventions
```

## The decisions not to re-open

Each has evidence behind it in `docs/research/`.

- **Foundry v14 only.** No v13 path. Lancer and StarWarsFFG are stranded on v13 because they
  kept ApplicationV1.
- **ApplicationV2 + Handlebars for all sheets. No Svelte inside Foundry.** Tidy 5e's looks are
  16,213 lines of plain CSS against 6 lines of scoped Svelte CSS. Appearance is a CSS budget,
  not a framework. Svelte is for `forge/web` only.
- **DataModels, never `template.json`.** It was removed in v14.
- **Slugs are identity, labels are display.** Never parse a name for meaning.
- **No rules engine.** Modifier collector functions, and one pure tier function.
- **No user-authored JavaScript in content.** Declarative effects plus a named handler registry.
- **SQLite is the content source of truth, export is one-way.**
- **Under 10,000 lines of logic; 10,000-15,000 lines of CSS.** The asymmetry is the design.

## Working here

```sh
nvm use
npm install
npm run check        # format, lint, typecheck, test -- run before committing
```

- Code style is [Style.md](Style.md), enforced where machines can (`eslint`, `prettier`,
  `golangci-lint`) and in review otherwise.
- Do not edit generated files: `packages/shared/src/generated/`,
  `packages/forge/api/internal/repository/generated/`, `packages/system/packs/_source/`,
  `packages/content/dump.sql`.
- Do not restyle unrelated code. A diff mixing a fix with a restyling is unreviewable.
- If [Style.md](Style.md) and existing code disagree, keep the existing shape unless the change
  in hand already has to rename that symbol.

## When the game rules are unclear

**Do not invent rules.** The design is genuinely incomplete — the core dice mechanic is
unresolved, the background table does not exist, and classes are barely specified.

Add an entry to [docs/rules/99-open-questions.md](docs/rules/99-open-questions.md) instead, and
where the code has to proceed anyway, put the uncertain value in `src/config/` so the decision
stays cheap. That is why dice expressions and thresholds are configuration rather than
constants.

## Prerequisites

Foundry 14.367+, Node 22 LTS (nvm + npm), Go 1.26. Optionally `golangci-lint`, `gofumpt`, and
`sqlc` for the full gate.
