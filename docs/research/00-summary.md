# Research summary

Survey of ten Foundry VTT projects, conducted September 2026, to inform the architecture of
the Kedom system. Every claim here is traceable to a file path in one of the sibling
checkouts under `/home/c7d5a6/projects/rpg/foundry-systems/`.

Read the detail in:

- [01-big-systems.md](01-big-systems.md) — dnd5e, pf2e
- [02-osr-systems.md](02-osr-systems.md) — foundryvtt-wwn, shadowdark, mothership
- [03-ui-architecture.md](03-ui-architecture.md) — Tidy 5e, Lancer, draw-steel
- [04-skill-systems.md](04-skill-systems.md) — CoC7, WFRP4e, StarWarsFFG
- [05-decisions.md](05-decisions.md) — what we chose and why

## The environment as of September 2026

Foundry stable is **14.367** (released 18 August 2026). Version 15 is not out; the team is
working on an interim "14.5". The relevant consequences for a new system:

- **ApplicationV1 is deprecated until v16.** Anything new must be ApplicationV2.
- **Active Effects became primary documents in v14.** They can live in compendiums, be
  dragged onto actors and tokens, modify token data as well as actor data, and expire on
  real duration events. A new system should lean on core Active Effects instead of building
  a bespoke rules engine.
- **Any ApplicationV2 gets pop-out-to-its-own-window for free.** This is a strong argument
  for native ApplicationV2 over a custom render bridge.
- **`template.json` is gone.** `System#template` was removed in v14; use
  `foundry.abstract.TypeDataModel` with `CONFIG.Actor.dataModels` / `CONFIG.Item.dataModels`.
- **DataModel internals changed.** `cleanData` and `updateSource` were consolidated and made
  faster; the `-=` and `==` update operators are deprecated in favour of `DataFieldOperator`.
- **CSS cascade layers.** Manifest stylesheets are auto-assigned to the `system` or `module`
  layer, and a `layer` key can target `variables`, `elements`, or `null`.

## The size argument

Measured with `wc -l` over each checkout, excluding `node_modules`, `dist`, and vendored types.

| Project | Role | Logic LOC | Styling LOC |
|---|---|---|---|
| pf2e | system | ~123,851 TS | 150 SCSS files |
| dnd5e | system | ~100,709 MJS | 15,469 Less |
| Tidy 5e | sheets module | ~57,484 TS + ~38,129 Svelte | 16,213 CSS |
| foundryvtt-wwn | system | ~29,911 MJS (~51,048 all) | SCSS |
| draw-steel | system | ~33,831 MJS | 3,535 CSS |
| CoC7 | system | ~54,000 JS | Less |
| WFRP4e | system | ~36,000 JS | SCSS |
| StarWarsFFG | system | ~31,000 JS | SCSS |
| shadowdark | system | ~18,121 JS | SCSS |
| mothership | system | ~8,135 JS | SCSS |

The spread is not explained by polish. It is explained by **scope**: how many actor types,
item types, game lines, and rules subsystems each project carries. dnd5e is large because it
has a 12-type Activities pseudo-document system and a full Advancement engine. pf2e is large
because it has 40 RuleElement classes, 28 item types, and 34,331 compendium JSON files.

**Kedom's budget: under 10,000 lines of logic for v1, plus 10,000-15,000 lines of CSS.**
That is deliberately close to shadowdark's logic size and Tidy's CSS size.

## The finding that decided the UI

The question was whether a "gorgeous" sheet like Tidy 5e requires Svelte. It does not.

```
Tidy 5e: scoped CSS inside all 373 .svelte components ...........      6 lines
Tidy 5e: global CSS in src/less/quadrone/ ....................... 16,213 lines
```

Tidy's entire visual identity is plain global CSS: a 411-line `variables-quadrone.css` token
file, 21 component files (`inputs.css` 672, `buttons.css` 555, `pills.css` 271, `tabs.css`
230, `toggles.css` 220, `listboxes.css` 219), and per-surface files (`header.css` 1,776,
`actors.css` 1,520, `tables.css` 1,338). None of it depends on Svelte.

dnd5e corroborates: 15,469 lines of Less against 100,709 lines of logic. draw-steel, which is
clean but plainer, has 3,535 lines of CSS.

What Svelte actually buys Tidy is **reactive behaviour** — live inventory filtering, section
expansion tracking, a sheet-wide message bus. Kedom does not need animations, so the
framework is not needed either. Appearance is a CSS budget, and that budget is portable to
Handlebars.

## What to copy

- **dnd5e** — `SystemDataModel.mixin()` composable schema templates; typed ChatMessage
  DataModels so an attack card is a real document subtype; YAML pack sources compiled to
  LevelDB via `@foundryvtt/foundryvtt-cli`; the three-stage
  `buildConfigure` → `buildEvaluate` → `buildPost` roll flow.
- **pf2e** — numbered migration classes from day one; Vitest for rules arithmetic; a single
  `data-action` chat-card listener instead of per-card wiring.
- **foundryvtt-wwn** — `derivations/` as pure functions separate from `helpers/`; derived
  paths zero-initialised so Active Effects have stable targets; resource pools derived rather
  than stored.
- **Tidy 5e** — the CSS token and component architecture, and the play/edit sheet mode.
- **draw-steel** — ApplicationV2 `PARTS` + `TABS` decomposition, and three CSS bundles mapped
  onto Foundry's own cascade layers.
- **StarWarsFFG** — the Playwright end-to-end harness shape.

## What to avoid

- **dnd5e's Activities and Advancement subsystems.** Twelve activity types, each with data
  model, document, sheet, and usage dialog. Kedom has fixed progression and does not need it.
- **pf2e's RuleElement framework and roll-option predicate graph.** 40 classes and
  stringly-typed option sets; a framework inside a system.
- **pf2e's `getContextualClone()` on damage application.** Correct for immunity graphs,
  expensive, and unnecessary here.
- **WFRP4e's effect scripts.** About 2,100 hashed user-authored `.js` files packed into a
  bundle. Unsearchable, untestable, arbitrary code execution.
- **Skill specialisations encoded in display names.** CoC7, WFRP4e, and StarWarsFFG all do
  this. See [04-skill-systems.md](04-skill-systems.md); it is the single most important
  mistake to not repeat.
- **ApplicationV1.** shadowdark, mothership, and Lancer are all still on it. Lancer is
  stranded on Foundry v13 as a direct result.
- **`template.json`.** Removed in v14. mothership and StarWarsFFG still depend on it.
