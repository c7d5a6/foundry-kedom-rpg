# Kedom Forge — web UI

Svelte 5 content-authoring UI. Talks to the Go API on `:7777` via the Vite proxy.

## Run

```sh
# terminal 1 — API (migrates packages/content/content.sqlite)
npm run forge:api

# terminal 2 — UI
npm run forge:web
```

Open http://localhost:5173.

Requires **Node 22+** via nvm (see `.nvmrc`). From the repo root: `nvm use && npm install`.

Agent rule: [`.cursor/rules/kedom-forge-ui.mdc`](../../../.cursor/rules/kedom-forge-ui.mdc).

## This slice

- Attributes, skills (with nested specialisations), classes
- Regions, Cultures (`race`), Talents, Backgrounds (nav last among content)
- Side-by-side English / Russian editor; create with **auto-slug** from label
- Completeness checklist for missing Russian fields
- **Export MD** — barebones rulebook preview + download (`en` / `ru`)
- Pack YAML: `npm run forge:export:packs` from the API CLI

English fields are editable so you can refine the skeletal vocabulary as you go. Once content
is locked for play, treat English as read-only and only extend Russian overlays (see
[docs/forge/localisation.md](../../../docs/forge/localisation.md)).

## Styling approach

**Use Tailwind v4** for layout (grid columns, gaps, flex) and **shared `.forge-*` classes** in
`app.css` for anything repeated (panels, list rows, inputs, buttons). That split keeps markup
readable without scattering one-off padding on every control.

| Piece | Role |
|---|---|
| `forge-tokens.css` | Forge-only `--forge-*` colours from Kedom `palette.css` (AAA dark theme) |
| `app.css` | Tailwind `@theme` aliases + `.forge-*` component layer |
| `*.svelte` | Structure and Tailwind utilities; avoid scoped CSS unless isolated |

We do **not** pull in Foundry sheet bundles (`kedom-css.mdc` / BEM `.kedom-*`). Forge is a
separate localhost app (ADR-003).

Optional extras (not in the repo today): `@tailwindcss/forms` for native control resets, or a
small headless primitive library — only worth it if the UI grows well beyond list + editor
screens.

### Desktop only

No mobile or tablet breakpoints. Layout assumes a wide monitor (`body` `min-w-[72rem]`): fixed
sidebar, fixed list + editor columns, EN | RU always side by side.

### Colour and WCAG AAA

Forge uses a **fixed dark** authoring theme (aligned with Kedom’s in-game default: violet
surfaces, parchment text). Tier colours from Foundry sheets (e.g. apprentice gold on dark) are
not used verbatim for body copy — they are tuned in `forge-tokens.css` so normal text hits **7:1**
on both `primary-600` sheet and `primary-500` raised panels.

- Body / muted: `primary-50` / `gold-100` on dark surfaces
- Primary button: `primary-400` fill, `primary-50` label
- Borders: low-contrast parchment mix on sheet (structure only — not bright violet)
- Active nav/list: left border + sunken fill (not low-contrast violet-on-violet text alone)
- Status: `gold-100` (ok), `secondary-100` (warn / danger on panels)

`color-scheme: dark` is fixed; Forge does not import Foundry `color.css` or follow OS light mode.

## Layout

```
src/
  App.svelte              shell + pages
  main.ts
  forge-tokens.css        AAA Forge semantics (palette primitives)
  app.css                 Tailwind + shared .forge-* classes
  lib/
    api.ts                fetch wrappers
    markdown.ts           markdown-it render helpers
    RichTextField.svelte  Markdown description (CodeMirror + preview)
    SideBySideEditor.svelte
```

## Editing model

- **Page Save / Cancel** — labels, abbreviations, sort order, skill controls, comment,
  Russian label/abbr. Disabled until the form is dirty. Cancel restores the last saved
  baseline. Switching entity or nav page with dirty fields prompts to discard.
- **Description** — Markdown in SQLite (Q26 settled). `RichTextField` is view-mode by
  default (rendered preview); **Edit** on hover opens CodeMirror + live preview with
  Link / Image helpers. Field-local Save does **not** mark the page form dirty. Images
  insert as `![alt](data:…)` (max ~1.5 MiB). Foundry packs will render MD → HTML on
  export when that pipeline lands.

## UI density

Forge is a dense authoring tool. Prefer **more content per viewport** over
generous marketing-style whitespace.

### Keep

- Font sizes (`text-xs`, `text-sm`, `text-lg`, display headings).
- Tailwind `@theme` aliases (`ink`, `muted`, `accent-fill`, surfaces).
- Clear structure: nav → list → editor; English | Russian; parent → child.

### Tighten

Padding and margins only. Shared control chrome lives in `app.css` so density
stays consistent:

| Class | Role |
|---|---|
| `.forge-panel` | Raised bordered surface |
| `.forge-nav-btn` | Sidebar navigation |
| `.forge-list-btn` | Entity list row |
| `.forge-field` | Label + control stack |
| `.forge-input` | Text, textarea, select |
| `.forge-btn` / `.forge-btn-primary` | Actions |

### Spacing scale (tight → loose)

Use the next larger step only when the relationship changes (sibling fields vs
two columns vs page chrome). Do not skip levels to “air out” a screen.

| Level | When | Typical |
|---|---|---|
| **related** | Label to control, title to meta, nested children | `gap-1`, `mt-0.5`; nested list `ml-2 border-l pl-1.5` |
| **field** | Inside a control or list row | `px-2.5 py-1.5`; `.forge-field` `mb-2 gap-1` |
| **component** | Panel body, header under a divider | `p-3`, `mb-2` / `pb-2` |
| **section** | List column vs editor, EN vs RU, toolbar vs body | `gap-3`, `mb-3` |
| **page** | Main padding, sidebar width | `px-5 py-3`; sidebar `13rem`, lists `14–16rem` |

Nested structure (skill → specialisation) must keep a visible indent and left
rule even when padded tightly — hierarchy is spacing *plus* a border, not
whitespace alone.

### Anti-patterns

- Shrinking type to fit more rows.
- Responsive `sm:` / `md:` / `lg:` layout variants.
- Large empty panel padding (`p-5` / `p-6`) or wide marketing gutters.
- Cards-for-decoration, hero branding beyond the small nav wordmark.
- One-off padding on every button instead of extending `.forge-*` classes.
- Importing Foundry `color.css` semantics or sheet BEM into this package.
