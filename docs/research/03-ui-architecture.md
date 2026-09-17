# UI architecture: Tidy 5e, Lancer, draw-steel

The question: does a sheet as good-looking as Tidy 5e require Svelte?

**Answer: no.** Tidy's appearance is 16,213 lines of plain global CSS. Svelte gives it
reactive behaviour, not looks.

Checkouts: `../foundry-vtt-tidy-5e-sheets`, `../foundryvtt-lancer`, `../draw-steel`.

## The measurement

Run over `foundry-vtt-tidy-5e-sheets/src`:

```
scoped CSS inside all 373 .svelte components ...      6 lines
global CSS under src/less/quadrone/ ............. 16,213 lines  (58 files)
.less files (three, all ports/vendor) ...........    445 lines
```

Tidy's visual identity, file by file:

```
variables-quadrone.css ...   411   design tokens
quadrone/header.css ...... 1,776
quadrone/actors.css ...... 1,520
quadrone/tables.css ...... 1,338
quadrone/apps.css ........   830
quadrone/abilities.css ...   748
quadrone/group.css .......   677
quadrone/components/inputs.css    672
quadrone/items.css .......   632
quadrone/dialogs.css .....   613
quadrone/editors.css .....   587
quadrone/components/buttons.css   555
quadrone/character.css ...   408
quadrone/forms.css .......   402
quadrone/components/pills.css     271
quadrone/tooltips.css ....   266
quadrone/components/tabs.css      230
quadrone/components/toggles.css   220
quadrone/components/listboxes.css 219
quadrone/typography.css ..   212
quadrone/components/pins.css      207
... 21 files total under components/, 12 under sheet-tabs/
```

None of this is framework-coupled. Corroboration from the other two: dnd5e has 15,469 lines
of Less against 100,709 of logic; draw-steel, clean but plainer, has 3,535 lines of CSS.

**Conclusion: "pretty" costs roughly a 15,000-line CSS design system, independent of
framework.** That is the budget to plan for, and it is portable to Handlebars.

## Tidy 5e Sheets (module)

`compatibility: { minimum: "14", verified: "14" }`, requires dnd5e 6.0.x. Svelte 5.56.4, Vite
8, TypeScript 6. ~57,484 lines of TS across 271 files plus ~38,129 of Svelte across 373 files.

### What the Svelte bridge costs

A three-layer mixin stack:

```
ActorSheetV2
  → getSvelteApplicationMixin()          mount/teardown
  → getTidyExtensibleDocumentSheetMixin() tabs, drag-drop, form, extensibility
  → getTidy5eActorSheetQuadroneBase()     context map
  → Tidy5eCharacterSheetQuadrone
```

- `src/mixins/SvelteApplicationMixin.svelte.ts` — ~580 lines. `_renderHTML()` mounts on first
  render; **`_replaceHTML()` is deliberately empty** to stop Foundry injecting Handlebars
  output; `_tearDown()` unmounts.
- `src/mixins/TidyDocumentSheetMixin.svelte.ts` — ~2,027 lines of form handling, scroll and
  focus preservation, drag-and-drop, sheet modes, and third-party content injection.
- The character sheet class alone is 1,500+ lines.

Reactivity is deliberately coarse:

```ts
// src/features/reactivity/CoarseReactivityProvider.svelte.ts
export class CoarseReactivityProvider<T> {
  #data;
  #version = $state(0);
  get data() { this.#version; return this.#data; }
  set data(_data) { this.#version++; this.#data = _data; }
}
```

Reassigning `_context.data` on each ApplicationV2 render invalidates the whole component
tree. A `{ tidy: { soft: true } }` render option exists to reuse cached context and avoid it.
This is a performance risk on large inventories and a known fragility across Foundry and
dnd5e updates.

### What is worth copying regardless of framework

- **Feature-folder organisation.** `src/features/{filtering,search,expand-collapse,sections,drag-and-drop,sheet-pins,conditions-and-effects,...}` — each a self-contained concern.
- **`src/registry/`** as the extension-point surface, and a documented public API in
  `src/api/Tidy5eSheetsApi.ts` supporting `SvelteTab`, `HandlebarsTab`, and `HtmlTab`.
- **Play/edit sheet mode.** A single toggle switching between rollable display and editable
  inputs.
- **Scroll and focus preservation across re-renders.** Essential once a sheet re-renders on
  every document update, and cheap to implement in a base sheet class.
- **Theming via CSS custom properties** injected into a replaceable `<style>` element, with a
  `community-themes/` directory of `.tidy5e-theme` files.
- **CSS wrapped in `@layer modules`** by a Vite plugin for cascade isolation.
- UX inventory: sidebar plus main content, sheet pins, per-tab action bars, live search with
  a filter service, expansion tracking, semantic `role="tabpanel"` and `<search>`, rarity
  colours, middle-click quick edit, double-click open.

### Build and dev loop

`vite.config.ts` with `root: 'src/'`, `base: '/modules/tidy5e-sheet/'`, library build to
`dist/tidy5e-sheet.js`, dev server on **30001** proxying Foundry on **30000** including
socket.io. `prepare-dist-for-dev.js` stubs the dist, `symlink-module-build-dir.js` links it
into the Foundry data directory using `foundry-data-path-config.json`.

## Lancer 3.1.3 — the cautionary tale

`compatibility: { minimum: 13, verified: 13, maximum: 13 }`. TypeScript, Vite 8, Svelte
5.55.7, `vite-plugin-foundryvtt`. ~36,949 lines of TS, only ~3,627 of Svelte across 19 files.

Lancer put Svelte **only** in sliding HUDs (accuracy, damage, structure/stress), mounted
straight to `document.body` with a promise-based `openSlidingHud()` API. Sheets stayed on
**ApplicationV1** with jQuery `activateListeners`.

The result: it is **stuck on Foundry v13** with no v14 path, because the sheets never
migrated. Its LCP Manager — an ApplicationV2 shell with a Svelte component mounted into a
Handlebars placeholder — is awkward hybrid code.

The lesson is not "don't use Svelte". It is **don't leave sheets on V1**, and **don't mix
Handlebars and Svelte inside one sheet**.

Its DataModel work is good (`src/module/models/actors/pilot.ts`, custom fields in
`models/shared.ts`), and `vite-plugin-foundryvtt` does remove build boilerplate.

## draw-steel 1.2 — the model to follow

`compatibility: { minimum: "14.367", verified: "14", maximum: "14" }`. Vanilla `.mjs` with
JSDoc, ApplicationV2 + Handlebars `PARTS`, PostCSS, Rollup. **No Svelte, no TypeScript.**
~33,831 lines of MJS, 4,376 of Handlebars across 149 files, 3,535 of CSS across 41 files.

### Sheet structure

A base class that deliberately does **not** extend `ActorSheetV2`:

```js
// src/module/applications/api/document-sheet.mjs
export default class DSDocumentSheet extends api.HandlebarsApplicationMixin(api.DocumentSheet)
```

The comment explains why: "we ultimately don't want to inherit most of the framework Foundry
defaults". It provides play/edit mode, drag-and-drop, `data-action` handlers, and
pseudo-document support.

Sheets then declare `TABS` and `PARTS` declaratively:

```js
static TABS = {
  primary: { tabs: [{ id: "stats" }, ...], initial: "stats", labelPrefix: "..." }
};
static PARTS = {
  header: { template: systemPath("templates/.../header.hbs"), templates: [...] },
  tabs:   { template: "templates/generic/tab-navigation.hbs" },
  stats:  { template: ..., scrollable: [""] },
};
```

with `_configureRenderParts()` including parts conditionally and
`_preparePartContext(partId, context)` enriching per tab.

### The CSS architecture to adopt

Three separate PostCSS bundles mapped onto Foundry's own cascade layers, declared in
`system.json`:

```json
"styles": [
  { "src": "css/draw-steel-system.css",    "layer": "system" },
  { "src": "css/draw-steel-variables.css", "layer": "variables" },
  { "src": "css/draw-steel-elements.css",  "layer": "elements" }
]
```

- `variables` ← `src/styles/variables/` — design tokens as custom properties
- `elements` ← `src/styles/elements/` — base element styling
- `system` ← `src/styles/system/` — 41 files, 3,535 lines of component and sheet styles

Dark mode uses native scoping rather than class soup:

```css
@scope (.theme-dark) to (.themed) { ... }
@scope (.theme-light) to (.themed) { ... }
```

A custom PostCSS plugin `adjustCSSUrls` rewrites absolute `/systems/draw-steel/` paths to
relative ones for route-prefix compatibility.

### Other things worth taking

- **`PseudoDocuments`** — embedded sub-documents with their own sheets and drag-and-drop, used
  for advancements and power-roll effects. Relevant if character options ever need nesting.
- **Pack tooling** — `tools/pushLDBtoJSON.mjs` and `tools/pullJSONtoLDB.mjs` wrapping
  `@foundryvtt/foundryvtt-cli`, plus `tools/create-symlinks.mjs` linking Foundry's own client
  sources in for JSDoc.
- **Hot reload with no dev server**, declared in the manifest:

```json
"hotReload": { "extensions": ["css","html","hbs","json"], "paths": ["css","src/styles","lang","templates"] }
```

- **DataModel layout** — `src/module/data/{actor,item,pseudo-documents,fields,settings}/`.

### Its weaknesses

Handlebars has no reactive binding, so live filtering and sorting need hand-written DOM work.
There is no component encapsulation, so shared UI depends on partial discipline. `.mjs` plus
JSDoc is less ergonomic than TypeScript. The Rollup setup is manual.

## Decision matrix

| | Svelte sheets (Tidy) | AppV2 + Handlebars (draw-steel) | Hybrid (Lancer) |
|---|---|---|---|
| Bundle size | framework + tree per sheet | none | medium |
| v14 → v15 risk | **high** — custom render bridge | **low** — public API | medium |
| Module compatibility | Tidy-specific API | standard hooks + `data-action` | mixed |
| Initial dev speed | slow (bridge, context, types) | **fast** (PARTS scaffold) | medium |
| Rich interaction speed | **fast** once scaffolded | slow (manual DOM) | fast in islands |
| Appearance ceiling | high | **equally high** (it is CSS) | medium |
| Solo maintainability | hard at Tidy scale | **best** | medium |
| Free v14 pop-out windows | via mixin, needs care | **yes, automatic** | partial |

## Conclusion for Kedom

**ApplicationV2 + Handlebars, no Svelte inside Foundry.** Specifically:

1. A `KedomDocumentSheet` base in the shape of `DSDocumentSheet`, with play/edit mode,
   `data-action` handlers, drag-and-drop, and Tidy's scroll/focus preservation.
2. `PARTS` + `TABS` per actor and item subtype.
3. Three CSS bundles on the `variables` / `elements` / `system` layers, with `@scope` dark
   mode — draw-steel's architecture, at Tidy's level of detail and token depth. This is where
   the appearance budget is spent.
4. `hotReload` declared in the manifest for CSS and templates.
5. Svelte 5 used **only** in the Forge content tool, which runs outside Foundry and carries no
   upgrade risk.

If a future surface genuinely outgrows Handlebars — a character-creation wizard, say — the
escape hatch is a standalone ApplicationV2 with a single mounted component, never a hybrid
sheet. Lancer shows how that goes wrong.
