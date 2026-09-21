import { readdir, readFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { collectLangRefs, configDrivenLangKeys } from "./collect-lang-refs.ts";
import { flattenLang } from "./flatten-lang.ts";

const here = dirname(fileURLToPath(import.meta.url));
const systemRoot = join(here, "../..");
const langDir = join(systemRoot, "lang");
const scanRoots = [join(systemRoot, "src"), join(systemRoot, "templates")];

async function listSourceFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "dist") continue;
      files.push(...(await listSourceFiles(path)));
      continue;
    }
    if (entry.name.endsWith(".test.ts")) continue;
    if (entry.name.endsWith(".ts") || entry.name.endsWith(".hbs")) {
      files.push(path);
    }
  }
  return files;
}

async function loadFlattened(locale: "en" | "ru"): Promise<Map<string, string>> {
  const raw = await readFile(join(langDir, `${locale}.json`), "utf8");
  return flattenLang(JSON.parse(raw) as unknown);
}

function missingKeys(required: Iterable<string>, available: Map<string, string>): string[] {
  return [...required].filter((key) => {
    const value = available.get(key);
    return value === undefined || value.trim() === "";
  });
}

describe("system lang keys", () => {
  it("every referenced KEDOM/TYPES key exists in en and ru", async () => {
    const files = (await Promise.all(scanRoots.map(listSourceFiles))).flat();
    const required = new Set(configDrivenLangKeys());
    const expandErrors: string[] = [];

    for (const file of files) {
      const source = await readFile(file, "utf8");
      const { keys, errors } = collectLangRefs(source);
      expandErrors.push(...errors.map((e) => `${relative(systemRoot, file)}: ${e}`));
      for (const key of keys) required.add(key);
    }

    expect(expandErrors, expandErrors.join("\n")).toEqual([]);

    const en = await loadFlattened("en");
    const ru = await loadFlattened("ru");
    const missingEn = missingKeys(required, en);
    const missingRu = missingKeys(required, ru);

    expect(missingEn, `missing in en.json:\n${missingEn.join("\n")}`).toEqual([]);
    expect(missingRu, `missing in ru.json:\n${missingRu.join("\n")}`).toEqual([]);
  });

  it("en and ru expose the same key set", async () => {
    const en = await loadFlattened("en");
    const ru = await loadFlattened("ru");
    const enOnly = [...en.keys()].filter((k) => !ru.has(k)).sort();
    const ruOnly = [...ru.keys()].filter((k) => !en.has(k)).sort();

    expect(enOnly, `in en.json only:\n${enOnly.join("\n")}`).toEqual([]);
    expect(ruOnly, `in ru.json only:\n${ruOnly.join("\n")}`).toEqual([]);
  });
});
