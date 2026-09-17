# Kedom Style

Design goals, in order: **safety**, **performance**, **developer experience**, **Zen**.

Adapted from the author's Zig style guide. The `## Shared` section applies to both languages;
`## TypeScript` and `## Go` cover what differs. Where a rule had to change, the reason is
stated — a rule you cannot argue with is a rule you cannot apply.

## Zen

- Communicate intent precisely.
- Edge cases matter.
- Favor reading code over writing code.
- There is an idiomatic way to do it.
- Runtime crashes are better than bugs.
- Compile errors are better than runtime crashes.
- Incremental improvements.
- Avoid local maximums.
- Reduce the amount one must remember.
- Focus on logic, not style.
- Together, we serve the users.

---

## Shared

### Formatting

- **Run the formatter.** Prettier for TypeScript, Svelte, CSS, Markdown, JSON, and YAML.
  `gofumpt` for Go. Never hand-format what a formatter owns.
- Source is UTF-8, LF line endings, no BOM, no other control characters. Kedom content carries
  diacritics — `Kedôm`, `Nitól` — and they must survive intact.
- Braces on the same line as the header unless the header wraps.
- If a list has more than two items, one item per line with a trailing comma.

### Comments

Comments explain **why**, and how only when the how is genuinely not obvious. Code is not
documentation; documentation is documentation.

Comments are sentences: a space after the marker, a capital letter, a full stop. End-of-line
comments may be phrases.

Do not write a comment that restates the next line. Do not write a comment explaining why your
change is correct — that is a pull request description, and it becomes noise the moment the
change merges.

Do not repeat in a doc comment what the name already says.

### Control flow

- Simple, explicit control flow.
- **Recursion only with a hard depth or size limit.** Unbounded recursion over user content is
  a crash waiting for the right input.
- **Soft limit: 70 lines per function.** The parent owns control flow and state; helpers
  compute and stay branch-light and pure. **Push `if`s up, `for`s down.**
- Bound everything — loops, queues, retries. Fail fast when a bound is hit.
- Treat warnings as errors at the strictest setting the language offers.

### Conditions

Split compound booleans into nested `if`/`else`. Prefer a nested `else { if { } }` over a long
`else if` chain. If there is a positive branch, handle or assert the negative.

State invariants in the **positive** form:

```
if (index < count) {
  // holds
} else {
  // does not
}
```

Avoid `index >= count` as the happy-path test.

### Locals and copies

- **Do not alias or duplicate variables.** State will drift. This is also why derived values
  are derived and never stored — see `docs/system/data-model.md`.
- Introduce a variable at the point of use. Drop it when it is done. Check close to use.
- Smallest scope per variable, and few variables in scope at once.
- Prefer longer names in outer scopes, shorter in inner scopes.

### Off-by-one

`index` is 0-based, `count` is 1-based, `size` is `count` times the unit. **Put the unit in the
name**: `sizeBytes`, `durationRounds`, `movementFeet`.

Show division intent. Integer division that truncates deserves a name or a comment saying so.
This matters directly in the rules: "add `level / 2` without a specialisation" must say whether
it floors.

### Names

Do not use `Value`, `Data`, `Manager`, `State`, `utils`, `misc`, or bare initials as names.
They name nothing. A file called `utils.ts` is a file nobody can predict the contents of.

`Context` is banned as a name **with exactly two exceptions**, both mandatory idiom we do not
control: Go's `context.Context`, and Foundry's ApplicationV2 `_prepareContext` and its render
context. Everywhere else, name what it actually holds — `RollContext` is fine because it is
qualified and specific.

**Name from the fully-qualified path, and do not repeat a segment.** `json.Value`, not
`json.JsonValue`; `rolls.Modifier`, not `rolls.RollModifier`. The package or file already said
it.

Established names stay as they are: `ENOENT`, `_id`, `WWN`.

### Dependencies

Minimize dependencies. Each one needs a concrete reason, written down. Prefer the language
toolchain and the standard library.

This is not an abstract preference. The research behind this project measured dnd5e at ~100k
lines and pf2e at ~124k, against a Kedom budget of under 10k — see
`docs/research/00-summary.md`. Every dependency and every abstraction is spent against that
budget.

### Tooling

`tools/*.ts` run through `tsx` for repository tasks; Go programs for Forge tasks. Prefer these
over shell scripts, which are untyped and quietly non-portable. Keep the toolbox small.

### Assertions, in three tiers

The single largest divergence from the original guide, and worth reading in full.

The original says: assertions catch programmer errors, operating errors are handled, and a
failed assertion is a crash, because corrupt code has no recovery. That is right for pure
logic. It is **wrong at a UI boundary** — an exception thrown during a sheet render leaves a
player looking at a broken character sheet with no way forward, and the bug it was meant to
surface goes unreported.

So the rule has three tiers.

**Tier 1 — make invalid states unrepresentable.** Do this first; it replaces most of the
assertion budget the original spends at runtime. Discriminated unions and branded slug types in
TypeScript, typed IDs in Go. A function that takes a `SkillSlug` cannot be handed an arbitrary
string, and the compiler says so. *Compile errors are better than runtime crashes.*

**Tier 2 — pure logic asserts.** `src/derivations/`, `src/rolls/`, and the Forge service layer
assert arguments, returns, pre- and postconditions, and invariants. A thin `invariant()` helper
in TypeScript; `panic` in Go for genuine programmer error.

- Aim for **two assertions per function** in this tier.
- **Pair them**: check the same property on two paths, such as before a write and after a read.
- **Split them**: `assert(a); assert(b);` not `assert(a && b)`. You want to know which one
  failed.
- Use implication: `if (a) assert(b)`.
- Assert the valid space **and** the invalid space. Tests cover both, and the boundary.
- Build the mental model first, encode it in assertions, then write tests. Tests show that bugs
  exist; they never prove absence.

**Tier 3 — boundaries never crash the host.** Sheet renders, Foundry hooks, click handlers, and
HTTP handlers catch, log, and surface a notification. The Forge server runs recover middleware.
The "two assertions per function" target does **not** apply here: boundaries validate and
degrade, they do not assert.

The boundaries are exactly: ApplicationV2 render and event handlers, Foundry hook callbacks,
and Go HTTP handlers. Everything else is tier 2.

### Performance

Choose the design for performance first; measurement comes after, because the large wins are in
the sketch. Optimise the slowest resource first, weighted by how often it is used. Land near
the global maximum, not a local one.

For this project the research found two bottlenecks that matter, and they replace the original's
network/disk/CPU sketching:

**`prepareDerivedData` runs on every actor update.** So derivations stay **pure and cheap**: no
I/O, no document reads, no `game` access, no compendium lookups. pf2e needed
`src/module/actor/npc/reset-batch.ts` to debounce its own preparation cost, and its party sheet
carries the comment "Eventually this should cache results to compare if re-rendering". Staying
pure avoids needing either.

**Update storms get batched, not handled per event.** This is the original's "do not run logic
directly off external events" applied to Foundry hooks: the program advances at its own pace so
work can be batched and bounded per period.

Keep control plane and data plane separate, so assertions on the data plane stay cheap.

---

## TypeScript

`strict: true`, plus `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`. See
`tsconfig.base.json`. **These are not negotiable to make one call site compile.** Widen a type
locally or fix the design.

### Formatting

- Prettier, `printWidth: 100`, **2-space indent**. Not the original's 4 — 2 is the ecosystem
  norm for TypeScript, and fighting it means fighting every tool and every snippet.

### Names

- Types, interfaces, classes, enums: `TitleCase`.
- Functions, methods, variables, parameters: `camelCase`.
- Module-level constants that are genuinely constant: `SCREAMING_SNAKE_CASE`.
- Files: `kebab-case.ts`. Directories: `kebab-case`.
- **Acronyms are upper-case: `XMLParser`, `HTTPClient`, `ID` — never `Id`.** This **inverts**
  the original, which mandates `XmlParser` and `readU32Be`. TypeScript and Go both go the other
  way, and the Zig habit leaking in is a real risk, so it is stated explicitly.

### Privacy is real, so use it

The original bans underscore prefixes because Zig has no private fields and faking them is a
lie. TypeScript has `#private`, so **the rule inverts**: use the real mechanism, never an
underscore convention.

The exception is Foundry's own API, where `_prepareContext`, `_onRender`, and `_renderHTML` are
the documented names of methods you override. Match the framework.

### Errors

- **No floating promises.** Every promise is awaited, returned, or explicitly `void`-ed with a
  comment saying why.
- **No bare `catch {}`.** Catch, then log or handle. A swallowed error is a bug you will debug
  twice.
- **No `any`.** Use `unknown` and narrow.
- `unknown` in catch clauses (`useUnknownInCatchVariables`), narrowed before use.
- Prefer a discriminated result over throwing across a module boundary. Throw for programmer
  error; return for expected failure.

### Simplest return that works

`void` > `boolean` > `number` > `T | null` > throws.

Dimensionality at the call site spreads. A function returning `T | null` forces every caller to
handle null, so only return it when null is genuinely meaningful.

Prefer `T | null` to `T | undefined`. One absent value, not two.

### Options objects

A function with two `number` parameters, or any optional parameter whose absent meaning is
unclear at the call site, takes an **options object**. This is the original's options-struct
rule, and it happens to match Foundry's own API shape.

```ts
// No.
function resolveTier(total: number, difficulty: number, critical?: boolean) {}

// Yes.
function resolveTier(input: { total: number; difficulty: ProficiencyTier }) {}
```

### Purity

`src/derivations/` and `src/rolls/` are pure: data in, data out. No `game`, no `CONFIG` reads at
call time, no document mutation, no `await`. This is what makes them unit-testable without
Foundry running, and it is why `prepareDerivedData` stays cheap.

---

## Go

Layering is `handler → service → repository`, one direction only. See
`packages/forge/api/README.md`.

### Formatting

- **`gofumpt`. Tabs. No column limit at all.**

`gofmt` deliberately does not wrap lines, so the shared hard-100 rule is **dropped for Go**
rather than fought. `.editorconfig` sets `max_line_length = off` for `*.go` to match. Long lines
in Go are a signal to extract a variable, not to wrap.

### Names

- Exported: `TitleCase`. Unexported: `camelCase`.
- Packages: short, lower-case, single word, no underscores, no plurals. `model`, not `models`.
- Files: `snake_case.go`.
- **Acronyms are upper-case: `ID`, `URL`, `HTTPHandler`, `UUID`.** Same inversion as TypeScript;
  `revive` enforces it.
- Receivers are one or two letters, consistent across a type's methods.
- **No stuttering.** `model.Skill`, not `model.ModelSkill`. `revive` catches this too, and it is
  the same rule as the shared "do not repeat a path segment".

### Privacy is real, so use it

Package-level case privacy is the mechanism. Unexported means unexported; do not add an
underscore prefix on top of it, and do not export a field just to test it — test through the
package.

### Errors

- **Handle every error.** No exceptions.
- **Never discard with `_ =`.** If an error genuinely cannot matter, write a comment saying why.
  `errcheck` enforces the mechanical half.
- **Wrap with `%w`** and add context the caller does not already have:
  `fmt.Errorf("export skill %s: %w", slug, err)`.
- Sentinel errors for conditions callers branch on; `errors.Is` and `errors.As` to inspect.
- **`panic` only for genuine programmer error in pure logic** (tier 2). HTTP handlers are a
  boundary (tier 3): they log and return a status. `cmd/forge` installs recover middleware so a
  panic in one request cannot end an authoring session.

### Simplest return that works

`void` > `bool` > `T` > `(T, bool)` > `(T, error)`.

Use `(T, bool)` for a lookup that can legitimately miss; `(T, error)` only when the caller needs
to know *why*.

### Options structs

Same rule as TypeScript: two `int` parameters, or an unclear optional, takes an options struct.
Go has no default arguments, which makes this the idiom anyway.

### Context

`context.Context` is the first parameter of anything that does I/O, named `ctx`. It is the one
un-banned use of that word, along with Foundry's.

### SQL

Queries live in `query/*.sql` and go through `sqlc`. No hand-written SQL strings in Go, no query
builders. `sqlc` type-checks against `migrations/`, so a query referencing a dropped column
fails at generate time rather than at runtime — *compile errors are better than runtime
crashes*.

`PRAGMA foreign_keys = ON` on every connection. Without it SQLite silently ignores foreign keys,
which would defeat the entire point of the relational schema.

---

## Machine enforcement

`Style.md` that a linter ignores is prose nobody reads. What can be checked, is:

| Rule | Enforced by |
|---|---|
| Formatting, 100 columns | `prettier` (`printWidth: 100`) |
| Go formatting | `gofumpt` via `golangci-lint` |
| Naming conventions | `@typescript-eslint/naming-convention`, `revive` |
| 70-line functions | `max-lines-per-function` (warn) |
| No floating promises | `@typescript-eslint/no-floating-promises` |
| No `any` | `@typescript-eslint/no-explicit-any` |
| Every error handled | `errcheck` |
| No name stuttering | `revive` |
| Strict types | `tsconfig.base.json` |

```sh
pnpm check     # format, lint, typecheck, test
```

The rest stays documented prose, which means it is enforced in review.

---

## On disagreement

**If `Style.md` and existing code disagree, keep the existing name and shape** unless the change
in hand already has to rename that symbol.

Consistency within a file beats conformance to this document. Do not restyle unrelated code;
a diff that mixes a fix with a restyling is a diff nobody can review.
