# tools/

Repository tasks. TypeScript run through `tsx`, per [Style.md](../Style.md): typed and portable,
where a shell script is neither. Keep the toolbox small.

**None of these are implemented yet.** This file is the contract each one has to meet; the
`package.json` scripts already point at them.

## `pack.ts` — `pnpm packs:build`

Compiles `packages/system/packs/_source/**/*.yml` into LevelDB packs under
`packages/system/packs/<name>/`, using `@foundryvtt/foundryvtt-cli`. In the shape of
draw-steel's `tools/pullJSONtoLDB.mjs`.

- One source directory per pack; the directory name is the pack name.
- Reads `_id` from the document; **never generates one**. A regenerated `_id` breaks every
  reference to that document in every existing world.
- Fails on a malformed document rather than skipping it, and reports every failure at once.
- Output is gitignored.

## `unpack.ts` — `pnpm packs:extract`

The reverse: LevelDB back to YAML, for seeing what Foundry actually stored.

**Diagnostic only. Its output is never an input.** Content flows one way, from SQLite outward
([ADR-011](../docs/research/05-decisions.md#adr-011--sqlite-is-the-content-source-of-truth-yaml-is-the-reviewable-artefact)).
Writes to a scratch directory, never over `packs/_source/`.

## `link-foundry.ts` — `pnpm system:link`

Symlinks `packages/system/dist` into `<dataPath>/Data/systems/kedom`, reading `dataPath` from
`foundry-config.json` (gitignored; copy `foundry-config.example.json`).

- Refuses to run if the target exists and is **not** a symlink, so it can never delete a real
  system directory.
- Idempotent.

Equivalent to pf2e's `build/link-foundry.ts` and draw-steel's `tools/create-symlinks.mjs`.

## `dump-content.ts` — `pnpm forge:dump`

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
