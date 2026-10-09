/**
 * Compile packs/_source YAML into LevelDB packs via @foundryvtt/foundryvtt-cli.
 * Usage: npm run packs:build
 *
 * Always wipes every LevelDB pack directory under packs/ first (anything that is
 * not `_source` / `_extracted` / other `_…` scratch dirs), then rebuilds from YAML.
 * That way removed or empty sources cannot leave a stale Foundry pack behind.
 *
 * fvtt CLI notes:
 * - `--type` is Module|System|World (not the document type).
 * - `--yaml` is a boolean flag.
 * - `--outputDirectory` is the *parent* packs folder; the CLI appends `-n` name.
 * - The CLI always touches an `.fvttrc.yml` under XDG_DATA_HOME / ~/.local/share.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const systemDir = join(root, "packages", "system");
const sourceRoot = join(systemDir, "packs", "_source");
const packsRoot = join(systemDir, "packs");
const fvttHome = join(root, ".fvtt-cli");

const SYSTEM_ID = "kedom";
const PACKS = ["origins", "talents", "arts"] as const;

function runFvtt(args: string[]): number {
  mkdirSync(fvttHome, { recursive: true });
  const result = spawnSync("npx", ["--no-install", "fvtt", ...args], {
    cwd: systemDir,
    stdio: "inherit",
    shell: true,
    env: {
      ...process.env,
      // Keep the CLI config out of the real home dir (and sandbox-writable).
      XDG_DATA_HOME: fvttHome,
    },
  });
  return result.status ?? 1;
}

/** Remove all compiled LevelDB pack dirs; leave `_source` / `_extracted` alone. */
function cleanAllPacks(): void {
  if (!existsSync(packsRoot)) return;
  for (const entry of readdirSync(packsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith("_")) continue;
    const dest = join(packsRoot, entry.name);
    rmSync(dest, { recursive: true, force: true });
    console.log(`cleaned ${entry.name}`);
  }
}

function compilePack(name: string): void {
  const src = join(sourceRoot, name);
  if (!existsSync(src)) {
    console.log(`skip ${name}: no ${src}`);
    return;
  }
  const files = readdirSync(src).filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"));
  if (files.length === 0) {
    console.log(`skip ${name}: empty source`);
    return;
  }

  // outputDirectory is the parent; fvtt joins it with -n <name>.
  const status = runFvtt([
    "package",
    "pack",
    "--id",
    SYSTEM_ID,
    "--type",
    "System",
    "-n",
    name,
    "--yaml",
    "--inputDirectory",
    src,
    "--outputDirectory",
    packsRoot,
  ]);
  if (status !== 0) {
    console.warn(
      `fvtt pack failed for ${name} (exit ${status}). YAML sources remain in packs/_source/${name}.`,
    );
    process.exitCode = 1;
  } else {
    console.log(`packed ${name} (${files.length} docs)`);
  }
}

cleanAllPacks();
for (const pack of PACKS) {
  compilePack(pack);
}
