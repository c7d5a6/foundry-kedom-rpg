/**
 * Extract LevelDB packs back to YAML for inspection only (not an authoring input).
 * Usage: npm run packs:extract
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const systemDir = join(root, "packages", "system");
const packsRoot = join(systemDir, "packs");
const outRoot = join(systemDir, "packs", "_extracted");
const fvttHome = join(root, ".fvtt-cli");

const SYSTEM_ID = "kedom";
const PACKS = ["origins", "talents"] as const;

function runFvtt(args: string[]): number {
  mkdirSync(fvttHome, { recursive: true });
  const result = spawnSync("npx", ["--no-install", "fvtt", ...args], {
    cwd: systemDir,
    stdio: "inherit",
    shell: true,
    env: {
      ...process.env,
      XDG_DATA_HOME: fvttHome,
    },
  });
  return result.status ?? 1;
}

for (const name of PACKS) {
  const src = join(packsRoot, name);
  if (!existsSync(src) || readdirSync(src).length === 0) {
    console.log(`skip ${name}: no LevelDB pack`);
    continue;
  }
  const dest = join(outRoot, name);
  mkdirSync(outRoot, { recursive: true });
  // unpack: inputDirectory is parent of pack; outputDirectory is destination folder.
  // determinePaths: pack = join(inputDirectory, name); source = outputDirectory as-is.
  const status = runFvtt([
    "package",
    "unpack",
    "--id",
    SYSTEM_ID,
    "--type",
    "System",
    "-n",
    name,
    "--yaml",
    "-c",
    "--inputDirectory",
    packsRoot,
    "--outputDirectory",
    dest,
  ]);
  if (status !== 0) {
    console.warn(`fvtt unpack failed for ${name} (exit ${status})`);
    process.exitCode = 1;
  } else {
    console.log(`unpacked ${name} → ${dest}`);
  }
}
