/**
 * Symlinks packages/system/dist into Foundry's Data/systems/kedom.
 *
 * Reads foundry-config.json (copy from foundry-config.example.json).
 * `dataPath` is the Foundry user-data root (the folder that contains `Data/`),
 * resolved relative to the repo root when not absolute.
 *
 * Usage: npm run system:link
 */
import { existsSync, lstatSync, mkdirSync, readFileSync, symlinkSync, unlinkSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const configPath = join(root, "foundry-config.json");
const distPath = join(root, "packages/system/dist");
const systemId = "kedom";

function fail(msg: string): never {
  console.error(msg);
  process.exit(1);
}

if (!existsSync(configPath)) {
  fail(
    `missing ${configPath}\nCopy foundry-config.example.json → foundry-config.json and set dataPath (relative to repo root, e.g. ../foundrydata).`,
  );
}

if (!existsSync(distPath)) {
  fail(`missing ${distPath}\nRun npm run system:build first.`);
}

const config = JSON.parse(readFileSync(configPath, "utf8")) as { dataPath?: string };
if (!config.dataPath || typeof config.dataPath !== "string") {
  fail("foundry-config.json: dataPath must be a string (Foundry user-data root containing Data/).");
}

const dataRoot = isAbsolute(config.dataPath)
  ? config.dataPath
  : resolve(root, config.dataPath);
const systemsDir = join(dataRoot, "Data", "systems");
const target = join(systemsDir, systemId);

mkdirSync(systemsDir, { recursive: true });

if (existsSync(target)) {
  const st = lstatSync(target);
  if (!st.isSymbolicLink()) {
    fail(
      `${target} exists and is not a symlink.\nRefusing to replace a real directory. Remove it manually if you intend to use the link tool.`,
    );
  }
  unlinkSync(target);
}

symlinkSync(distPath, target, "dir");
console.log(`linked ${target} → ${distPath}`);
