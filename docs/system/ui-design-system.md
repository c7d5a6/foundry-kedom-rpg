# UI design system

This is where "slick" lives. It is also the largest single line-count item in the project, and
that is on purpose.

## The premise

The measurement that settled the architecture
([ADR-003](../research/05-decisions.md#adr-003--applicationv2--handlebars-for-all-sheets-no-svelte-inside-foundry)):

```
Tidy 5e: scoped CSS inside all 373 .svelte components ...      6 lines
Tidy 5e: global CSS under src/less/quadrone/ ............. 16,213 lines
```

Tidy 5e is the best-looking sheet module in the Foundry ecosystem, and **none of its
appearance comes from Svelte**. Six lines. Its entire visual identity is plain global CSS:
a 411-line token file, 21 component files, and per-surface files (`header.css` 1,776,
`actors.css` 1,520, `tables.css` 1,338).

dnd5e agrees: 15,469 lines of Less against 100,709 of logic. draw-steel, clean but plainer,
spends 3,535.

So: **appearance is a CSS budget, and the budget is 10,000-15,000 lines.** Framework-free.

## Architecture

draw-steel's layering, at Tidy's level of detail.

Three bundles, each assigned to a Foundry cascade layer in `system.json`:

```json
"styles": [
  { "src": "css/kedom-tokens.css",   "layer": "variables" },
  { "src": "css/kedom-elements.css", "layer": "elements" },
  { "src": "css/kedom-system.css",   "layer": "system" }
]
```

```
src/styles/
  tokens.css      -> variables layer   barrel
  elements.css    -> elements layer    barrel
  system.css      -> system layer      barrel
  tokens/         colour, type, space, radius, elevation, motion
  elements/       input, button, table, anchor, scrollbar
  components/     the reusable vocabulary
  sheets/         per-surface composition
```

The barrels are `@import` lists resolved by `postcss-import`, so each layer ships as exactly
one file. Keeping them separate through the build is not cosmetic: the layer assignment is
what lets modules and user themes override our tokens without `!important`.

### Why cascade layers matter here

The community wiki's v13 migration notes are blunt about it: systems that relied on Foundry's
own styles broke, and systems must own their theming through variables and layers. Foundry
auto-assigns manifest stylesheets to the `system` layer and accepts an explicit `layer` key
for `variables`, `elements`, or `null`.

Getting this right means a module author can restyle Kedom by redefining custom properties,
and a user theme can too. Getting it wrong means specificity wars.

## Token taxonomy

Two tiers, which is the lesson from Tidy's 411-line `variables-quadrone.css`.

**Primitives** — raw values, no semantics:

```
--kedom-color-ink-900, --kedom-color-parchment-100, --kedom-color-blood-500
--kedom-space-1 .. --kedom-space-12
--kedom-font-display, --kedom-font-body, --kedom-font-mono
--kedom-size-text-xs .. --kedom-size-text-2xl
--kedom-radius-sm/md/lg, --kedom-shadow-1/2/3
```

**Semantic** — what a thing means, referencing primitives:

```
--kedom-surface-sheet, --kedom-surface-raised, --kedom-surface-sunken
--kedom-text-primary, --kedom-text-muted, --kedom-text-inverse
--kedom-border-subtle, --kedom-border-strong
--kedom-accent, --kedom-accent-hover
--kedom-tier-failure, --kedom-tier-cost, --kedom-tier-success, --kedom-tier-critical
```

**Components reference semantic tokens only.** A component that reaches for
`--kedom-color-blood-500` directly cannot be themed, which defeats the whole structure.

The tier colours are worth calling out: the four-outcome ladder is the system's signature
mechanic, so it gets first-class colour treatment on chat cards and sheets.

## Dark mode

Native scoping, from draw-steel, rather than a parallel class tree:

```css
@scope (.theme-dark) to (.themed) { ... }
@scope (.theme-light) to (.themed) { ... }
```

Only **semantic** tokens are redefined per theme. Primitives stay fixed, components are
untouched, and a theme is therefore a short file rather than a duplicate of the design system.

## Components

The vocabulary every sheet composes from. Tidy's component list, which is battle-tested, is
the starting point:

```
components/
  button.css      icon, text, and roll variants
  input.css       text, number, select, delta inputs
  pill.css        tags, damage types, conditions
  tab.css         tab strips
  toggle.css      switches, play/edit mode
  listbox.css     selection lists
  table.css       inventory and skill rows
  card.css        chat cards, including tier styling
  tooltip.css
  meter.css       hit points, System Strain, wounds
  section.css     collapsible groups
```

Naming is BEM-ish and prefixed: `.kedom-skill-row`, `.kedom-skill-row__level`,
`.kedom-skill-row--untrained`. Prefixing is not optional — these styles live in a shared
document with core Foundry and every active module.

## Sheets

```
sheets/
  actor-character.css
  actor-npc.css
  item-shared.css
  item-skill.css
  chat-card.css
  dialog.css
```

Sheet files **compose components and adjust spacing**. When a sheet file starts defining new
visual treatment, that treatment belongs in `components/`.

## What is not here

**No animations.** Explicitly out of scope. Transitions on hover and focus states only — they
are affordances, not decoration.

**No CSS framework.** No Tailwind, no Bootstrap. A utility framework inside Foundry's shared
document is a specificity problem, and the whole point is to own the cascade.

**No preprocessor.** Native nesting, custom properties, `@layer`, and `@scope` cover
everything Less and Sass were used for here. PostCSS runs only `postcss-import` and
`autoprefixer`. Tidy and dnd5e use Less for historical reasons; draw-steel proves plain CSS is
enough in 2026.

## Sheet implementation

ApplicationV2 with Handlebars. A base class in the shape of draw-steel's `DSDocumentSheet`,
which deliberately extends `HandlebarsApplicationMixin(DocumentSheet)` rather than
`ActorSheetV2`, on the grounds that most Foundry sheet defaults are not wanted.

```
src/applications/
  api/
    document-sheet.ts   KedomDocumentSheet base
  sheets/
    character-sheet.ts
    npc-sheet.ts
    item-sheet.ts
  dialogs/
    check-dialog.ts
```

The base provides:

- **Play/edit mode**, from Tidy. One toggle between rollable display and editable inputs. This
  single feature does more for perceived quality than anything else in the list.
- **`data-action` dispatch**, from draw-steel, instead of per-element listeners.
- **Drag-and-drop**.
- **Scroll and focus preservation across re-renders**, from Tidy. Essential once a sheet
  re-renders on every document update, and cheap in a base class. Without it, typing in a
  field while an effect ticks loses the cursor.
- **Search and filter helpers** — hand-written DOM work, since Handlebars has no reactive
  binding. This is the accepted cost of ADR-003.

Sheets declare structure rather than building it:

```
static TABS  = { primary: { tabs: [...], initial: "stats" } }
static PARTS = { header: {...}, tabs: {...}, stats: { scrollable: [""] }, ... }
```

with `_preparePartContext(partId, context)` enriching per tab, so no single context-building
function grows past the 70-line limit in [../../Style.md](../../Style.md).

Every sheet gets v14's pop-out-to-own-window for free, which a custom render bridge would have
to re-earn.

## UX inventory

Taken from the Tidy analysis, in rough order of value per line:

1. Play/edit mode toggle.
2. Sidebar plus main content, with the portrait, core stats, and meters always visible.
3. Live search with filters on inventory and skills.
4. Collapsible sections with remembered expansion state.
5. Per-tab action bars rather than one crowded header.
6. Semantic HTML — `role="tabpanel"`, `<search>` — so keyboard and screen-reader use works.
7. Rich tooltips showing modifier breakdowns on hover.
8. Middle-click to quick-edit, double-click to open.
9. Sheet pins — favourite items surfaced on the main tab.

## Development loop

`hotReload` in the manifest, no dev server:

```json
"flags": { "hotReload": {
  "extensions": ["css", "hbs", "json"],
  "paths": ["css", "templates", "lang"]
} }
```

Foundry reloads CSS and templates in place. Combined with `pnpm system:watch`, editing a
component file shows up without a browser refresh. draw-steel does exactly this, and it is
simpler than Tidy's dual-port proxy setup.

## Budget

| | Lines |
|---|---|
| tokens/ | ~600 |
| elements/ | ~500 |
| components/ | ~5,000 |
| sheets/ | ~6,000 |
| **Total** | **~12,000** |

Between draw-steel's 3,535 and Tidy's 16,213, weighted toward Tidy because that is the target
quality. Unlike the logic budget, **this one is not a ceiling to stay under** — it is an
investment to actually make.
