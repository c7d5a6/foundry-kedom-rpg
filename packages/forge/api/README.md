# Kedom Forge — API

The content-authoring backend. Go 1.26, SQLite, no cgo. Single user, runs on localhost.

Schema reference: [../../../docs/forge/schema.md](../../../docs/forge/schema.md).
Export behaviour: [../../../docs/forge/export-formats.md](../../../docs/forge/export-formats.md).

## Layering

Strictly one direction, `handler → service → repository`. Conventions carried over from
`/home/c7d5a6/projects/rts/c7d5a6l/.cursor/rules/backend-go.mdc` so both projects read the
same way.

| Package | Responsibility | May not |
|---|---|---|
| `internal/handler` | HTTP: decode, validate shape, call one service, encode | contain business rules or touch SQL |
| `internal/service` | Business rules, transactions, invariants | know about `http` |
| `internal/repository` | SQL only, via sqlc-generated code | contain business rules |
| `internal/model` | Domain types. No behaviour, no imports from the layers above | import anything from this module |
| `internal/db` | Connection setup, pragmas, migration runner | know about domain types |
| `internal/export` | YAML, JSON, and Markdown emitters | write to the database |

`internal/model` is the only package the others all import, and it is also the tygo input —
which is why it must stay dependency-free.

## Running

```sh
go run ./cmd/forge              # serves on :7777
go build -o bin/forge ./cmd/forge
```

`CGO_ENABLED=0` works, which is the whole reason for `modernc.org/sqlite`.

## Generated code

```sh
sqlc generate     # query/*.sql -> internal/repository/generated/
tygo generate     # internal/model -> packages/shared/src/generated/content.ts
```

Both outputs are gitignored and must never be hand-edited. `sqlc` type-checks queries against
`migrations/`, so a query referencing a dropped column fails at generate time rather than at
runtime.

Neither tool is a module dependency, to keep `go.mod` to what the binary actually needs:

```sh
go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest
go install github.com/gzuidhof/tygo@latest
```

## Migrations

`migrations/NNNN_description.sql`, applied in filename order. Rules:

- **Append only.** Never edit a migration that has been applied. Fix forward with a new one.
- One transaction per migration, with `PRAGMA foreign_keys = ON`.
- The applied version is recorded in a `schema_migrations` table.
- Additive changes are safe. Renames and drops need a data-moving migration, because SQLite's
  `ALTER TABLE` is limited.
- `id` and `slug` values are **identity** and never change in a migration. See
  [ADR-007](../../../docs/research/05-decisions.md#adr-007--slug-identity-for-skills-and-specialisations).

## Error handling

Per [Style.md](../../../Style.md): handle every error, wrap with `%w` and context, never
discard with `_ =`. HTTP handlers are a **boundary** — they log and return a status, they do
not panic. `cmd/forge` installs recover middleware so a panic in one request cannot take the
server down mid-authoring-session.
