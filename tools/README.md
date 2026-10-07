# tools/

Repository tasks. TypeScript run through `tsx`, per [Style.md](../Style.md): typed and portable,
where a shell script is neither. Keep the toolbox small.

## `pack.ts` — `npm run packs:build`

Compiles `packages/system/packs/_source/**/*.yml` into LevelDB packs under
`packages/system/packs/<name>/`, using `@foundryvtt/foundryvtt-cli`. In the shape of
draw-steel's `tools/pullJSONtoLDB.mjs`.

- **Cleans every LevelDB pack directory first** (anything under `packs/` that is not
  `_source` / `_extracted` / other `_…` scratch dirs), then rebuilds from YAML. Stale packs
  cannot survive a source removal.
- One source directory per pack; the directory name is the pack name.
- Reads `_id` from the document; **never generates one**. A regenerated `_id` breaks every
  reference to that document in every existing world.
- Fails on a malformed document rather than skipping it, and reports every failure at once.
- Output is gitignored.

## `unpack.ts` — `npm run packs:extract`

The reverse: LevelDB back to YAML, for seeing what Foundry actually stored.

**Diagnostic only. Its output is never an input.** Content flows one way, from SQLite outward
([ADR-011](../docs/research/05-decisions.md#adr-011--sqlite-is-the-content-source-of-truth-yaml-is-the-reviewable-artefact)).
Writes to a scratch directory, never over `packs/_source/`.

## `link-foundry.ts` — `npm run system:link`

**Implemented.** Symlinks `packages/system/dist` into `<dataPath>/Data/systems/kedom`, reading
`dataPath` from `foundry-config.json` (gitignored; copy `foundry-config.example.json`).

- Resolves relative `dataPath` against the **repo root** (not the tools directory).
- Creates `Data/systems` if missing.
- Refuses to run if the target exists and is **not** a symlink, so it can never delete a real
  system directory.
- Idempotent (replaces an existing symlink).

Equivalent to pf2e's `build/link-foundry.ts` and draw-steel's `tools/create-symlinks.mjs`.

## `prepare-system.ts` — `npm run system:prepare`

Export forge content into the Foundry system and rebuild packs + `dist/`, **without**
releasing. Same content pipeline `release` runs before it zips and publishes:

```sh
npm run system:prepare
# → forge:export:packs (YAML + lang) → packs:build (clean LevelDB) → system:build
```

Use this after authoring in Forge when you want Foundry to pick up packs and translations.

## `release.ts` — `npm run release`

Local Foundry system release (no GitHub Actions). Bumps `packages/system/system.json`,
runs `system:prepare` (forge export → clean/rebuild packs → `dist/`), zips `kedom.zip`,
commits version + lang, tags, pushes, and creates a GitHub Release with `system.json` +
`kedom.zip` via `gh`.

```sh
npm run release -- patch          # 0.0.1 → 0.0.2
npm run release -- minor          # 0.0.1 → 0.1.0
npm run release -- major          # 0.0.1 → 1.0.0
npm run release -- 0.2.0          # exact version (must be greater than current)
npm run release -- patch --dry-run
```

Prerequisites:

- Clean git working tree.
- [`gh`](https://cli.github.com/) installed and authenticated (`gh auth status`).
- `zip` on PATH (used to package `dist/`).
- Forge API deps available (`go`, content.sqlite) so `forge:export:packs` can run.

Foundry install / update manifest URL (after the first release exists):

`https://github.com/c7d5a6/foundry-kedom-rpg/releases/latest/download/system.json`

Paste that into Foundry → Install System. Each release must attach both assets; Foundry
reads `version` from the manifest for updates.

## `dump-content.ts` — `npm run forge:dump`

Dumps `packages/content/content.sqlite` to `packages/content/dump.sql` so content changes are
reviewable in a pull request.

Determinism is the entire point, so:

- schema statements first, then data
- rows ordered by primary key
- no timestamps
- UTF-8, LF endings, diacritics untouched

Same database in, same bytes out. Otherwise every dump is a diff full of noise. See
[../docs/forge/export-formats.md](../docs/forge/export-formats.md).

## Conventions

- Each tool is one file with a `main()` and a non-zero exit on failure.
- **Report every problem at once**, not the first. Fixing content one error per run is
  miserable.
- No side effects on import, so they stay testable.
- Paths resolve from the repo root, so they work from any working directory.
