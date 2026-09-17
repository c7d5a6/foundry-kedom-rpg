# Skill systems: CoC7, WFRP4e, StarWarsFFG

The three systems most comparable to Kedom's design: skill-based, with specialisations, and
with tiered rather than binary results. This is the most directly actionable research
document, because all three share a mistake Kedom must not repeat.

Checkouts: `../CoC7-FoundryVTT`, `../WFRP4e-FoundryVTT`, `../StarWarsFFG`.

## The shared mistake: identity encoded in display names

**All three encode skill specialisation identity in the item's display name and parse it back
out with string operations.**

**CoC7** (`coc7/models/item/skill-system.js`) stores a skill as `"Locksmith (Craft)"` and has
a `guessNameParts()` method that regex-parses the specialisation and base skill back out.
There are redundant `system.skillName` and `system.specialization` fields, but name parsing
remains the fallback, and skill uniqueness is tied to the display string. `(Any)` skills need
extra `properties.requiresname` / `picknameonly` flags to handle player-chosen names.

**WFRP4e** (`src/model/item/skill.js`, `career.js`) is worse: a skill is
`"Sailing (Navigation)"` with a `grouped.value === "isSpec"` flag, and **careers reference
their skills as an array of display-name strings**:

```js
skills[]  // string array of skill NAMES, not UUIDs
talents[] // string array of talent names
```

Renaming a specialised skill therefore requires a `changeSkillName()` routine to walk and
rewrite every career's string array. Any missed path silently breaks the reference.

**StarWarsFFG** avoids it for skills — they are plain actor data, not items — but does the
same thing for career skill slots (`careerSkill0`..`careerSkill7` holding `"(none)"` or a
name string), while using proper UUID references for specialisations and talent trees. It is
half-migrated.

### The fix Kedom uses

Stable slug identity, separate from the human label, and references by slug:

```
skill: { slug, attribute, level, specializations: [{ slug, label, level }] }
```

`slug` is immutable and assigned at authoring time in Forge. `label` is display-only and
localisable. Backgrounds, races, and classes reference `skill.slug` and
`specialization.slug`. Renaming a label touches exactly one row and breaks nothing.

## Success-tier models

Kedom's ladder is four tiers: failure, success with a cost, success, critical.

**CoC7** (`coc7/apps/dice-pool.js`) uses **threshold fractions of the skill value**, not
margin:

| Level | Value | Condition |
|---|---|---|
| fumble | -99 | 96+ (rules-dependent) |
| failure | 0 | over target |
| regular | 1 | <= skill |
| hard | 2 | <= skill / 2 |
| extreme | 3 | <= skill / 5 |
| critical | 4 | unit die shows 1 |

Difficulty acts as a **floor**: you need `successLevel >= difficulty`. This does not map onto
Kedom, which compares a dice total to fixed thresholds.

**WFRP4e** (`src/system/rolls/test-wfrp4e.js`) uses **Success Level**, a margin in tens:

```
SL = floor(target / 10) - floor(roll / 10)
```

Then bands it: |SL| 0-1 marginal, 2-3 plain, 4-5 impressive, 6+ astounding, on both the
success and failure side. Criticals and fumbles are a **separate boolean** (`isCriticalFumble`
— roll divisible by 11 while under target, or 99/100).

This is the closest analogue to Kedom's ladder, and the "marginal success" band is exactly
what "success with a cost" means. **Two lessons:** band the margin, and keep critical as an
orthogonal flag rather than a fifth tier.

The **anti**-lesson: WFRP's `computeResult()` is roughly 200 lines with setting-dependent
branching between SL and DoS variants, interleaved with sign handling and description lookup.
Kedom's equivalent must be a single pure function:

```
resolveTier({ total, thresholds, proficiency }) -> { tier, margin, label }
```

**StarWarsFFG** (`modules/dice/roll.js`) has no single tier at all — it returns simultaneous
narrative currencies (`success`, `failure`, `advantage`, `threat`, `triumph`, `despair`,
`light`, `dark`) and nets them. Only relevant as a display lesson: multi-axis results need
symbol lists, whereas a single-tier ladder should show one prominent badge plus optional cost
text, in the shape of WFRP's SL box.

## Per-system notes

### CoC7 8.15

`min 12, verified 14`. Webpack 7, plain ES modules, Less. ~54,000 lines in `coc7/`. Full
DataModels, ApplicationV2 sheets. No tests.

Actor types: `character`, `container`, `creature`, `npc`, `vehicle`. Thirteen item types.

**Worth copying:** the `CoC7Check` class (`coc7/apps/check.js`) persists complete roll state
into message flags, which is what makes push-rolls, difficulty changes, and luck spending
work from the chat card after the fact. Kedom's typed chat-message DataModels serve the same
purpose with a schema.

**Worth avoiding:** `document-class.js` is ~4,500 lines; `check.js` ~1,200. Skill values are
computed by summing five `adjustments` buckets (base, personal, occupation, archetype,
experience) rather than stored, with Active Effects overriding through a private getter — more
indirection than it earns. The build requires binary compendiums to be built first.

### WFRP4e 9.6.4

`min 13, verified 14, max 14`. Rollup 4. **Hybrid `template.json` (1,219 lines) plus
DataModels** — a migration burden worth avoiding by starting with DataModels only. ~36,000
lines in `src/`. No tests. Requires the external `warhammer-lib` module.

Careers are items with `level` 1-4, a `characteristics` boolean map, `skills[]` and
`talents[]` name-string arrays, `status`, and a `previousCareer` reference. Skills merge
advances on duplicate create; specialisation choice prompts a dialog when the name contains
`(any)`.

**The effect scripts system, and why not to copy it.** About **2,100 hashed `.js` files** in
`scripts/` (e.g. `scripts/190PHSHKGaJ74wsR.js`), packed by `scriptPacker.js` into a generated
`loadScripts.js`, merged into `game.wfrp4e.config.effectScripts` at init, and invoked through
`warhammer-lib`'s `actor.runScripts(hook, args)` at named lifecycle points (`preRollTest`,
`rollTest`, `preApplyCondition`, and so on). Each script is arbitrary JavaScript attached to
an Active Effect.

It does scale to per-talent automation across a huge compendium. But the files are unsearchable
and undebuggable, there is no type safety and no tests, failures are silent, it is arbitrary
code execution in shared worlds, and it requires a build step before every dev session.

Kedom's alternative: **declarative effect definitions** validated by a schema, plus a small
registry of named handlers. If scripting is ever genuinely needed, expose a narrow sandboxed
API — never raw JS strings.

### StarWarsFFG 2.0.3

`min 13, verified 13, max 13` — stranded on v13. Gulp for Sass only, **no JS bundler** at all
(raw ES modules, vendored libs in `lib/`), **`template.json` only**. ~31,000 lines in
`modules/`.

Its split model is instructive: **generic skills as actor data** (fast to roll, no item
overhead) and **progression packages as items** (career, specialisation with a 20-node talent
tree, talent). A `modules/helpers/modifiers.js` layer decouples what changes from where it
lives. For Kedom, whose skills need descriptions and specialisation sub-levels, embedded
items are the better fit — but the principle of separating cheap frequently-rolled data from
rich progression content is sound.

**The e2e harness is the thing to take.** Two frameworks coexist; **Playwright is the one to
copy** and Cypress is legacy.

`playwright/setup.ts` as `globalSetup`:

1. Assumes Foundry is already running at `FOUNDRY_URL` (default `http://localhost:30000`).
2. Navigates to `/join`, selects the user labelled `"Gamemaster"` from
   `#join-game-form select[name="userid"]`, clicks join.
3. Waits for `#destinyDark` — a **system-specific ready signal**.
4. Saves `storageState` to `state.json` so tests skip auth.

`playwright/fixtures.ts` is ~450 lines of v13-aware `Actors` and `Items` helpers with
DialogV2 and ApplicationV2 selectors, sidebar context menus, and a `setField()` that retries
through re-render races. `e2e/activeEffects.spec.js` has 16 tests that create documents, set
stats, drag-drop, assert computed values, and clean up.

Caveats: `fullyParallel: false` because tests mutate one shared world, and **CI never runs
the tests** — the GitHub workflow only builds releases.

For Kedom: copy the Playwright shape, add an explicit ready signal on the `ready` hook rather
than borrowing a UI element, start with a handful of tests (create actor → roll a skill →
assert the tier text on the chat card), and actually wire it into CI.

## Summary of decisions taken from this document

- Specialisations are **slug-identified sub-objects** on a skill item; never name-parsed.
- Cross-references (background → skill, race → skill) use **slugs**, never display names.
- Tier resolution is **one pure function** returning `{ tier, margin, label }`.
- **Critical is an orthogonal flag**, not a fifth tier.
- Roll state persists in a **typed chat-message DataModel** so cards stay interactive.
- Effects are **declarative plus a named handler registry**; no user-authored JavaScript.
- **DataModels only** from the first commit; never a `template.json` hybrid.
- **Playwright** e2e from early on, with an explicit ready signal, wired into CI.
