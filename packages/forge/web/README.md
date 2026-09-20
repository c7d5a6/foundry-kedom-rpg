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

Styling uses **Tailwind v4** with Kedom design tokens imported from
`packages/system/src/styles/tokens/color.css` (ink / parchment / blood).

## This slice

- Attributes, skills (with nested specialisations), classes
- Side-by-side English / Russian editor
- Completeness checklist for missing Russian fields
- **Export MD** — barebones rulebook preview + download (`en` / `ru`)

English fields are editable so you can refine the skeletal vocabulary as you go. Once content
is locked for play, treat English as read-only and only extend Russian overlays (see
[docs/forge/localisation.md](../../../docs/forge/localisation.md)).

## Layout

```
src/
  App.svelte              shell + pages
  main.ts
  app.css
  lib/
    api.ts                fetch wrappers
    SideBySideEditor.svelte
```
