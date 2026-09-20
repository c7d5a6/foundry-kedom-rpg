# Architecture decisions

ADR-style log. Each entry states the decision, the evidence behind it, and what would make us
revisit it. Dated September 2026.

---

## ADR-001 — Target Foundry v14 only

**Decision.** `compatibility: { minimum: "14.367", verified: "14" }`. No v13 support.

**Evidence.** Stable is 14.367 (August 2026); v15 is unreleased. Every actively maintained
comparable is already v14-only or v14-verified: `foundryvtt-wwn` 2.0.0-beta4 is
`min 14 / max 14`, `draw-steel` is `min 14.367`, `dnd5e` 6.0.3 requires `min 14.367`, Tidy 5e
is `min 14`. The two systems pinned to v13 — Lancer and StarWarsFFG — are both stranded
because they never migrated off ApplicationV1.

Supporting v13 would mean `template.json` compatibility shims and pre-Active-Effects-V2
handling, for zero benefit on a system with no existing users.

**Consequence.** The local Foundry install (13.351) must be updated before development.

**Revisit if** v15 lands with breaking changes, at which point this becomes a normal version
bump.

---

## ADR-002 — TypeScript, strict

**Decision.** TypeScript with `strict: true` across the system, the Forge web UI, and shared
types. `fvtt-types` at the v14 beta (`14.366.0-beta.*`).

**Evidence.** pf2e, Lancer, and Tidy 5e are all TypeScript. dnd5e and draw-steel use `.mjs`
with JSDoc, which the UI analysis flagged as "less ergonomic than TypeScript". The research
also found that most of the assertion burden in the style guide can be discharged statically
by the type system instead of at runtime — branded slug types being the key example.

**Risk accepted.** `fvtt-types` v14 support is in beta (PR #3626 open, beta packages published
August 2026). Mitigation: types are a development aid, not a runtime dependency; if a
declaration is wrong we widen locally rather than fight it.

**Revisit if** `fvtt-types` v14 proves unusable, in which case fall back to hand-written
ambient declarations for the surface we actually touch.

---

## ADR-003 — ApplicationV2 + Handlebars for all sheets; no Svelte inside Foundry

**Decision.** Every sheet and dialog is ApplicationV2 with Handlebars `PARTS`. Svelte 5 is
used only in the Forge web UI, outside Foundry.

**Evidence.** This was the central question, and it was settled by measurement rather than
preference. Tidy 5e has **6 lines** of scoped CSS across 373 Svelte components; its entire
appearance is **16,213 lines of plain global CSS**. dnd5e: 15,469 lines of Less against
100,709 of logic. Appearance is a CSS budget and is framework-independent.

What Svelte buys Tidy is reactive behaviour — live filtering, expansion tracking, a message
bus — at a cost of a ~580-line render bridge, a ~2,027-line document-sheet mixin, and a
coarse reactivity provider that re-renders the whole tree on any context change. Kedom needs
no animations.

Against that, native ApplicationV2 gets v14 pop-out windows for free, uses only public API,
and stays compatible with third-party modules through standard hooks and `data-action`.

**Consequence.** Live filtering and sorting are hand-written DOM work in `_onRender`. Accepted.

**Revisit if** a specific surface genuinely outgrows Handlebars. The escape hatch is a
**standalone** ApplicationV2 with one mounted component — never a hybrid sheet. Lancer's LCP
Manager demonstrates why hybrids go wrong.

---

## ADR-004 — DataModels only; no `template.json`

**Decision.** `foundry.abstract.TypeDataModel` subclasses registered on
`CONFIG.Actor.dataModels` and `CONFIG.Item.dataModels`, with composable schema template mixins
in dnd5e's style.

**Evidence.** `System#template` was **removed in v14**. dnd5e, pf2e, WWN, and shadowdark all
use DataModels. WFRP4e's hybrid `template.json` + DataModels state is explicitly a migration
burden. mothership and StarWarsFFG are `template.json`-only and both show the consequences: no
schema validation and manual migration patches.

---

## ADR-005 — Pure `derivations/` with zero-initialised paths

**Decision.** A `src/derivations/` directory of pure functions, one concern per file, called
from `prepareBaseData` / `prepareDerivedData` on the DataModel. All derived paths are
zero-initialised in `prepareBaseData` so Active Effects have stable targets.

**Evidence.** Lifted from `foundryvtt-wwn`, which separates `derivations/` (ac, saves,
encumbrance, attack-bonus, hit-dice, initiative, resource-pools) from `helpers/`. The
zero-initialisation detail matters: without it, whether an effect targeting
`system.combat.allAttack` works depends on preparation order.

The counter-example is mothership's ~2,994-line `module/actor/actor.js` monolith holding all
derivation, identified as its hardest file to maintain.

Pure functions are also directly unit-testable, which is how pf2e tests its rules maths.

---

## ADR-006 — Modifier collectors instead of a rules engine

**Decision.** A roll gathers modifiers by calling independent pure functions that each return
`Modifier[]`. Adding a rule means adding a function. No RuleElement-style class hierarchy, no
roll-option predicate graph.

**Evidence.** pf2e has 40 RuleElement classes plus a 25-collection synthetics bucket plus a
predicate engine — "a framework inside a system", and everything becomes stringly typed.
dnd5e's Activities reach ~1,400 lines in the mixin alone for 12 activity types.

Against a 10,000-line budget, neither is affordable, and neither is needed: Kedom resolves a
check by summing labelled modifiers and comparing a total to fixed thresholds.

**Consequence.** Complex conditional rules will need either a declarative effect definition or
a named handler in the registry (see ADR-009).

---

## ADR-007 — Slug identity for skills and specialisations

**Decision.** Skills carry an immutable `slug`; specialisations are slug-identified
sub-objects on the skill. All cross-references use slugs. Display labels are separate and
localisable.

```
skill: { slug, attribute, level, specializations: [{ slug, label, level }] }
```

**Evidence.** CoC7, WFRP4e, and StarWarsFFG **all** encode specialisation identity in the item
display name and parse it back (`"Locksmith (Craft)"`, `"Sailing (Navigation)"`). WFRP4e
compounds it by storing career skill lists as display-name string arrays, requiring a
`changeSkillName()` routine to rewrite every referencing career on rename — with silent
breakage on any missed path.

This is the single most important mistake identified in the whole survey.

**Consequence.** Slugs are assigned at authoring time in Forge and treated as immutable. A
rename is a label change; changing a slug is a migration.

---

## ADR-008 — One pure tier function; critical as an orthogonal flag

**Decision.**

```
resolveTier({ total, thresholds, proficiency }) -> { tier, margin, label }
```

with `critical` carried as a separate boolean rather than a fifth tier value.

**Evidence.** WFRP4e's Success Level banding is the closest analogue to Kedom's ladder, and it
keeps `isCriticalFumble` as a separate flag — the right shape. Its `computeResult()` is the
warning: ~200 lines interleaving margin calculation, sign handling, setting-dependent
variants, and description lookup.

CoC7's threshold-fractions model does not transfer, since Kedom compares a dice total to fixed
thresholds rather than fractions of a skill value.

---

## ADR-009 — Declarative effects and a handler registry; no user-authored JavaScript

**Decision.** Effects are schema-validated declarative definitions. Anything needing behaviour
registers a named handler in code. No arbitrary JS attached to content.

**Evidence.** WFRP4e ships ~2,100 hashed `.js` files packed into a generated bundle and
executed through `runScripts` hooks. It scales to per-talent automation, but the files are
unsearchable and undebuggable, there is no type safety or test coverage, failures are silent,
and it is arbitrary code execution in shared worlds.

v14 also makes this less necessary: Active Effects are now primary documents that can live in
compendiums, be dragged onto actors and tokens, modify token data, and expire on duration
events.

---

## ADR-010 — Numbered migrations from the first commit

**Decision.** `src/migrations/NNN-description.ts`, one isolated class each, with a version
stamp.

**Evidence.** pf2e has 120 such files and they are individually testable. dnd5e has one
~1,300-line `migration.mjs` with version-gated branches, flagged as hard to reason about.
mothership has no migration mechanism at all and patches data inside `prepareDerivedData`.

Retrofitting migration infrastructure after content exists is painful, so the harness goes in
before the first schema.

---

## ADR-011 — SQLite is the content source of truth; YAML is the reviewable artefact

**Decision.** Content (attributes, skills, specialisations, races, backgrounds, regions) is
authored in SQLite via Forge. Forge exports YAML into `packages/system/packs/_source/`, which
is compiled to LevelDB by `@foundryvtt/foundryvtt-cli`. One-way.

**Evidence.** dnd5e uses YAML sources (4,871 files) compiled with `foundryvtt-cli`; shadowdark
uses per-document JSON via a `PackHandler`; draw-steel round-trips JSON with
`pushLDBtoJSON` / `pullJSONtoLDB`. All of them keep content as reviewable text, and
mothership — which commits binary LevelDB packs — cannot diff content at all.

SQLite on top of that gives relational integrity for the nested authoring workflow (region →
races → backgrounds → skill choices) that flat files cannot express.

One-way export avoids the conflict-resolution problem entirely.

**Consequence.** SQLite is binary and diffs poorly in git, so a `dump` task also writes
`packages/content/dump.sql`. Hand-editing exported YAML is not supported; edit in Forge and
re-export.

---

## ADR-012 — Go for the Forge API, pure-Go SQLite

**Decision.** Go 1.26 with `modernc.org/sqlite` (no cgo), `sqlc` for typed queries, numbered
SQL migrations run in a transaction, `handler → service → repository` layering. TypeScript
types generated from the Go models with `tygo` into `packages/shared/`.

**Evidence.** Chosen by the project owner. `modernc.org/sqlite` is pure Go, so
`CGO_ENABLED=0` builds and cross-compilation work with no C toolchain; it is somewhat slower
than `mattn/go-sqlite3` on writes, which is irrelevant for a single-user authoring tool. The
layering and migration-safety rules are carried over from an existing project of the owner's
(`/home/c7d5a6/projects/rts/c7d5a6l/.cursor/rules/`) so conventions stay consistent.

`tygo` gives one definition of a skill or background shared between the Forge UI and the
Foundry system, rather than two hand-maintained copies.

---

## ADR-013 — Three CSS bundles on Foundry's cascade layers

**Decision.** `tokens` → `variables` layer, `elements` → `elements` layer, and component plus
sheet styles → `system` layer, declared in `system.json`. Dark mode via
`@scope (.theme-dark) to (.themed)`. Budget: 10,000-15,000 lines.

**Evidence.** draw-steel's architecture, which maps cleanly onto the cascade layers Foundry
introduced in v13 and documents in the manifest `styles[]` `layer` key. The community wiki
warns that relying on Foundry's own styles broke in v13 and that systems must own their
theming through variables and layers.

The budget comes from the measurement in ADR-003: Tidy spends 16,213 lines and dnd5e 15,469 to
look the way they do, while draw-steel's plainer look costs 3,535.

**Consequence.** This is the largest single line-count item in the project, and deliberately
so. It is where "slick" actually lives.

---

## ADR-014 — Playwright e2e with an explicit ready signal

**Decision.** Playwright against a running Foundry instance, with `globalSetup` joining as
Gamemaster and caching `storageState`, and a system-owned ready signal set on the `ready` hook.
Wired into CI.

**Evidence.** StarWarsFFG is the only one of the ten with e2e tests, and its Playwright setup
is the usable half (Cypress is legacy there). Two flaws to fix rather than copy: it waits on
`#destinyDark`, a system UI element standing in for a ready signal, and its CI never runs the
tests.

**Consequence.** `fullyParallel` stays off while tests share one world, and each test cleans
up after itself.

---

## ADR-015 — English canonical, Russian as an overlay

**Decision.** Author in English. Russian is a first-class overlay in SQLite, Forge, every
export, and the Foundry system. A third locale is new rows, not new columns.

Two channels, because Foundry forces the split:

1. **UI strings** — `lang/en.json` and `lang/ru.json`, native Foundry `languages`. Hand-authored.
2. **Content** — English `label` / `description` on the entity table; Russian in a
   `translation` table keyed by `(entity_kind, entity_id, locale, field)`. YAML packs stay
   English. Forge emits Babele JSON for the Russian overlay. The system registers Babele if
   present and does not require it.

**Evidence.** Foundry translates UI, not documents — community wiki, and Babele exists
specifically to fill that gap. Babele 2.8/2.9 targets v14. Duplicating packs per language
is what Babele is designed to avoid; storing `flags.kedom.name.ru` and swapping at render
misses chat cards, tokens, the sidebar, and every module that reads `document.name`.

`label_en` / `label_ru` columns were the alternative. They make a third language a migration
across every table, which is the retrofit this decision exists to prevent.

**Consequence.** Babele is an optional relationship, not a hard dependency. A Russian client
without it still gets a Russian sheet and English compendia. Incomplete Russian is a
fallback, never an export failure, and never a copy of English pretending to be complete.
Closed vocabularies (skills, attributes, saves) appear both in `lang/*.json` and in SQLite;
Forge should eventually check they match.

Full design: [../forge/localisation.md](../forge/localisation.md). Closes Q27.

**Revisit if** Foundry grows native document translation, or if a third locale arrives whose
script or fallback rules do not fit an overlay (right-to-left, for example).

---

## Open question carried forward

**The dice mechanic is unresolved.** `Kedom RPG.md` specifies `2d8 + STAT + level` with
thresholds at 9-/10-12/13-16/17+ and a proficiency-tier table. `WWN Kedom Hack.md` specifies
`2d6 + STAT MOD + SKILL LEVEL`. These are different probability curves and the system cannot
implement both. Tracked in [../rules/99-open-questions.md](../rules/99-open-questions.md);
the data model is being built so that thresholds and dice expression are configuration, not
hard-coded, which keeps the decision cheap for now.
