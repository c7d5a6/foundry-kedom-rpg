package main

import (
	"context"
	"database/sql"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"strings"

	"github.com/c7d5a6/foundry-kedom-rpg/packages/forge/api/internal/db"
	"github.com/c7d5a6/foundry-kedom-rpg/packages/forge/api/internal/handler"
	"github.com/c7d5a6/foundry-kedom-rpg/packages/forge/api/internal/model"
	"github.com/c7d5a6/foundry-kedom-rpg/packages/forge/api/internal/service"
)

func main() {
	log.SetFlags(0)

	if len(os.Args) > 1 {
		switch os.Args[1] {
		case "export":
			if err := runExport(os.Args[2:]); err != nil {
				log.Fatal(err)
			}
			return
		case "serve":
			if err := runServe(os.Args[2:]); err != nil {
				log.Fatal(err)
			}
			return
		case "help", "-h", "--help":
			printUsage()
			return
		}
	}

	// Default: serve (keeps `go run ./cmd/forge` / `npm run forge:api` unchanged).
	if err := runServe(os.Args[1:]); err != nil {
		log.Fatal(err)
	}
}

func printUsage() {
	fmt.Fprintf(os.Stderr, `Kedom Forge

Usage:
  forge serve  [options]          start the authoring API (default)
  forge export md [options]       write barebones markdown rulebook
  forge export lang [options]     regenerate closed-vocab sections in lang/{en,ru}.json

serve options:
  -addr string         listen address (default ":7777")
  -db string           path to content.sqlite
  -migrations string   path to migrations dir

export md options:
  -locale string       en|ru (default "en")
  -out string          output directory (default "exports/markdown")
  -db string           path to content.sqlite
  -migrations string   path to migrations dir

export lang options:
  -out string          lang directory (default "packages/system/lang")
  -db string           path to content.sqlite
  -migrations string   path to migrations dir
`)
}

func runServe(args []string) error {
	fs := flag.NewFlagSet("serve", flag.ContinueOnError)
	addr := fs.String("addr", ":7777", "listen address")
	dbPath := fs.String("db", "", "path to content.sqlite")
	migrations := fs.String("migrations", "", "path to migrations dir")
	if err := fs.Parse(args); err != nil {
		return err
	}

	repoRoot, database, _, err := openDB(*dbPath, *migrations)
	if err != nil {
		return err
	}
	defer database.Close()

	content := service.New(database)
	api := handler.New(content, log.Default())

	mux := http.NewServeMux()
	api.Mount(mux)

	resolvedDB := *dbPath
	if resolvedDB == "" {
		resolvedDB = filepath.Join(repoRoot, "packages", "content", "content.sqlite")
	}
	log.Printf("Kedom Forge API listening on %s (db=%s)", *addr, resolvedDB)
	return http.ListenAndServe(*addr, withRecover(mux))
}

func runExport(args []string) error {
	if len(args) == 0 {
		return fmt.Errorf("usage: forge export md|lang …")
	}
	switch args[0] {
	case "md":
		return runExportMarkdown(args[1:])
	case "lang":
		return runExportLang(args[1:])
	default:
		return fmt.Errorf("usage: forge export md|lang …")
	}
}

func runExportMarkdown(args []string) error {
	fs := flag.NewFlagSet("export md", flag.ContinueOnError)
	locale := fs.String("locale", "en", "locale (en or ru)")
	out := fs.String("out", "", "output directory")
	dbPath := fs.String("db", "", "path to content.sqlite")
	migrations := fs.String("migrations", "", "path to migrations dir")
	if err := fs.Parse(args); err != nil {
		return err
	}

	repoRoot, database, _, err := openDB(*dbPath, *migrations)
	if err != nil {
		return err
	}
	defer database.Close()

	outDir := *out
	if outDir == "" {
		outDir = filepath.Join(repoRoot, "exports", "markdown")
	}
	if !filepath.IsAbs(outDir) {
		outDir = filepath.Join(repoRoot, outDir)
	}

	loc := model.Locale(strings.TrimSpace(*locale))
	if loc != "en" && loc != model.LocaleRU {
		return fmt.Errorf("unsupported locale %q (use en or ru)", *locale)
	}

	content := service.New(database)
	if err := content.ExportMarkdownDir(context.Background(), loc, outDir); err != nil {
		return err
	}
	fmt.Printf("wrote markdown to %s (locale=%s)\n", outDir, loc)
	return nil
}

func runExportLang(args []string) error {
	fs := flag.NewFlagSet("export lang", flag.ContinueOnError)
	out := fs.String("out", "", "lang directory")
	dbPath := fs.String("db", "", "path to content.sqlite")
	migrations := fs.String("migrations", "", "path to migrations dir")
	if err := fs.Parse(args); err != nil {
		return err
	}

	repoRoot, database, _, err := openDB(*dbPath, *migrations)
	if err != nil {
		return err
	}
	defer database.Close()

	langDir := *out
	if langDir == "" {
		langDir = filepath.Join(repoRoot, "packages", "system", "lang")
	}
	if !filepath.IsAbs(langDir) {
		langDir = filepath.Join(repoRoot, langDir)
	}

	content := service.New(database)
	if err := content.ExportLang(context.Background(), langDir); err != nil {
		return err
	}
	fmt.Printf("wrote closed vocab into %s/{en,ru}.json\n", langDir)
	return nil
}

func openDB(dbPath, migrations string) (repoRoot string, database *sql.DB, migDir string, err error) {
	repoRoot, err = findRepoRoot()
	if err != nil {
		return "", nil, "", fmt.Errorf("repo root: %w", err)
	}
	if dbPath == "" {
		dbPath = filepath.Join(repoRoot, "packages", "content", "content.sqlite")
	}
	migDir = migrations
	if migDir == "" {
		migDir = filepath.Join(repoRoot, "packages", "forge", "api", "migrations")
	}
	database, err = db.Open(dbPath)
	if err != nil {
		return "", nil, "", fmt.Errorf("open db: %w", err)
	}
	if err := db.Migrate(database, migDir); err != nil {
		database.Close()
		return "", nil, "", fmt.Errorf("migrate: %w", err)
	}
	return repoRoot, database, migDir, nil
}

func withRecover(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if rec := recover(); rec != nil {
				log.Printf("panic: %v", rec)
				http.Error(w, "internal error", http.StatusInternalServerError)
			}
		}()
		next.ServeHTTP(w, r)
	})
}

func findRepoRoot() (string, error) {
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		return "", fmt.Errorf("runtime.Caller failed")
	}
	dir := filepath.Dir(file)
	for i := 0; i < 6; i++ {
		if _, err := os.Stat(filepath.Join(dir, ".nvmrc")); err == nil {
			return dir, nil
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			break
		}
		dir = parent
	}
	wd, err := os.Getwd()
	if err != nil {
		return "", err
	}
	dir = wd
	for i := 0; i < 6; i++ {
		if _, err := os.Stat(filepath.Join(dir, ".nvmrc")); err == nil {
			return dir, nil
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			break
		}
		dir = parent
	}
	return "", fmt.Errorf(".nvmrc not found from %s", wd)
}
