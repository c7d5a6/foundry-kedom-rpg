module github.com/c7d5a6/foundry-kedom-rpg/packages/forge/api

go 1.26.5

// HTTP comes from net/http with the 1.22+ ServeMux pattern syntax. No router
// framework: Forge has a few dozen routes and method-and-path patterns cover it.
//
// SQLite is modernc.org/sqlite (pure Go) rather than mattn/go-sqlite3 so
// CGO_ENABLED=0 builds and cross-compilation work with no C toolchain. It is
// slower on writes, which does not matter for a single-user authoring tool.
require modernc.org/sqlite v1.56.0

require (
	github.com/dustin/go-humanize v1.0.1 // indirect
	github.com/google/uuid v1.6.0 // indirect
	github.com/mattn/go-isatty v0.0.24 // indirect
	github.com/ncruces/go-strftime v1.0.0 // indirect
	github.com/remyoudompheng/bigfft v0.0.0-20230129092748-24d4a6f8daec // indirect
	golang.org/x/sys v0.47.0 // indirect
	modernc.org/libc v1.74.4 // indirect
	modernc.org/mathutil v1.7.1 // indirect
	modernc.org/memory v1.11.0 // indirect
)
