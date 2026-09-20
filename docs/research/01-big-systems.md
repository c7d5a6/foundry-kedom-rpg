# Big systems: dnd5e and pf2e

Both target Foundry v14, both abandoned `template.json` for pure DataModels, and both are
large because of **rules scope**, not UI polish. They are the best available reference for
data-model hygiene and the clearest warning about abstraction cost.

Checkouts: `../dnd5e`, `../pf2e`.

## dnd5e 6.0.3

`compatibility: { minimum: "14.367", verified: "14" }`. JavaScript `.mjs` with JSDoc types.
Rollup + Less. ~100,709 lines under `module/`, 189 data-model files, 326 Handlebars templates,
4,871 YAML pack sources.

### Worth copying

**Composable schema templates.** `SystemDataModel` extends `TypeDataModel` and adds a
`mixin()` static that merges partial schemas. This recovers what `template.json` templates
used to do, with types.

- `module/data/abstract/system-data-model.mjs`
- Templates like `module/data/item/templates/physical-item.mjs`

**Typed ChatMessage DataModels.** Seventeen message subtypes in
`module/data/chat-message/`, so an attack card is a real document with a schema rather than a
bag of flags. `attack-message-data.mjs`, `damage-message-data.mjs`.

**Three-stage roll flow.** `buildConfigure` → `buildEvaluate` → `buildPost`, each with a hook.
Readable and interceptable. `module/documents/activity/attack.mjs:168-175`.

**YAML pack sources.** `packs/_source/**.yml` compiled to LevelDB by
`@foundryvtt/foundryvtt-cli` via `utils/packs.mjs`. Content lands in git as reviewable text.

**Derived-data placement.** `prepareBaseData` / `prepareDerivedData` live on the DataModel,
not the document. `module/data/actor/character.mjs:229-258`.

**Rules cache cleared per prepare.** An `AppliedRules` map is rebuilt on every `prepareData`,
and Active Effect changes of type `"rule"` are collected into it instead of mutating paths
directly, then read back at roll time. `module/documents/mixins/document.mjs:53-63`,
`module/documents/active-effect.mjs:502-505`.

### Worth avoiding

**Activities.** Twelve activity types, each a pseudo-document with its own data model,
document class, sheet, and usage dialog. The mixin alone is ~1,400 lines
(`module/documents/activity/mixin.mjs`). Every item action routes through it. For a system
where an attack is "roll d20, add modifiers, compare to AC", this is enormous overhead.

**Advancement.** A separate pseudo-document tree under `module/documents/advancement/` for
level-up flows, item grants, and scale values. Kedom's progression is fixed.

**Monolithic migration.** One ~1,300-line `module/migration.mjs` with version-gated branches.
pf2e's numbered files are strictly better.

**The enricher DSL.** `module/enrichers.mjs` is ~1,900 lines implementing `[[/attack]]`,
`[[/damage]]`, and friends. Powerful, high maintenance.

**Dual legacy/modern content.** Parallel SRD 5.1 and 5.2 pack trees with runtime rules-version
switching, across 24 packs.

### Visible cost

`prepareDerivedData` recomputes AC, skills, HP, and encumbrance on every update, and
`appliedRules` is rebuilt from scratch each time. World migration walks every actor, item,
scene, and compendium entry.

## pf2e 8.5.1

`compatibility: { minimum: "14.361", verified: "14.367", maximum: "14" }`. TypeScript 5.9 with
Svelte 5 for newer apps only. Vite 8, pnpm, Node >= 24.14. ~123,851 lines of TS, ~6,819 of
Svelte, 235 Handlebars templates, 34,331 pack JSON files, 120 migrations, 11 Vitest suites.

### Worth copying

**Numbered migrations.** `src/module/migration/migrations/` with files like
`852-ability-scores-to-modifiers.ts`. Each is an isolated, testable class with a version
stamp. Adopt this from the first commit — retrofitting is painful.

**Vitest for rules arithmetic.** `tests/module/degree-of-success.test.ts` and friends. Pure
functions for roll maths are exactly what unit tests are good at, and pf2e is the only one of
the ten with meaningful test coverage of its rules.

**Consolidated chat-card listener.** One `ChatCards.listen()` dispatching on `data-action`
(`src/module/chat-message/listeners/cards.ts:64-77`) rather than per-card wiring.

**Vite with `dist/` output and a link script.** `pnpm run link` symlinks into the Foundry data
directory (`build/link-foundry.ts`); `pnpm run hot` runs a dev server. Cleaner than editing
in place.

**A `_migration` field in the schema itself.** `src/module/actor/data/model.ts` tracks
migration state on the document.

### Worth avoiding

**RuleElements.** 40 builtin classes registered in `RuleElements.builtin`
(`src/module/rules/index.ts`), each a DataModel subclass of the 527-line
`rule-element/base.ts` with ~10 optional lifecycle hooks, feeding a 25-collection
`synthetics` bucket (`src/module/rules/synthetics.ts`), with predicate filtering and
grant-item chains. ~11,346 lines in `src/module/rules/` alone. This is a framework inside a
system. Kedom's equivalent need is met by a handful of pure functions that each return
`Modifier[]`.

**Roll options as string sets.** Hundreds of `self:`, `target:`, and `item:` strings drive all
filtering through a predicate engine (`src/module/system/predication.ts`). Flexible, but every
feature becomes stringly typed and nothing is checkable.

**`getContextualClone()` per damage application.** `src/module/actor/base.ts:417-429` clones
the actor with ephemeral effects and re-runs preparation, once per target per damage click,
to get immunity/weakness/resistance exactly right.

**28 item types.** `src/module/item/` has a directory each. Kedom needs about seven.

**34,331 pack JSON files.** Adventure-scale bestiaries shipped with the system.

### Visible cost

Full data preparation on every actor update: rules, then synthetics, then statistics, then
strikes, all rebuilt. `src/module/actor/npc/reset-batch.ts` exists specifically to debounce
update storms — an acknowledgement of the problem. The party sheet carries the comment
"Eventually this should cache results to compare if re-rendering"
(`src/module/actor/party/sheet.ts:473`).

## Targets for Kedom

| | dnd5e | pf2e | Kedom |
|---|---|---|---|
| Actor types | 5 | 9+ | 2 |
| Item types | 15 | 28 | ~7 |
| Rules engine | Activities + AppliedRules | 40 RuleElements | pure modifier collectors |
| Migrations | 1 monolith | 120 numbered | numbered from day one |
| Logic LOC | ~100k | ~124k | < 10k |

The sweet spot is dnd5e's document and data-model hygiene, pf2e's build tooling and migration
discipline, and roughly a tenth of either one's surface area.
