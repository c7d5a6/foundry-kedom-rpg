import { cpSync, existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import type { Plugin } from "vite";
import { defineConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";

const root = import.meta.dirname;

/** Copy compiled ClassicLevel packs into dist (gitignored paths skip static-copy globs). */
function copyCompendiumPacks(): Plugin {
  const packNames = ["origins", "talents"] as const;
  return {
    name: "kedom-copy-compendium-packs",
    closeBundle() {
      const outDir = resolve(root, "dist");
      for (const name of packNames) {
        const src = resolve(root, "packs", name);
        const dest = resolve(outDir, "packs", name);
        if (!existsSync(src) || readdirSync(src).length === 0) {
          console.warn(`[kedom-copy-compendium-packs] skip ${name}: run npm run packs:build first`);
          continue;
        }
        cpSync(src, dest, { recursive: true });
        console.log(`[kedom-copy-compendium-packs] ${name} → dist/packs/${name}`);
      }
    },
  };
}

/**
 * Builds the system into `dist/`, which is what gets symlinked into
 * `Data/systems/kedom` by `npm run system:link`. Building to a separate directory
 * rather than in place keeps the repo clean; pf2e does the same.
 *
 * The three CSS entries exist because `system.json` assigns each to a different
 * Foundry cascade layer (variables, elements, system). They must stay separate
 * files all the way through the build — see docs/system/ui-design-system.md.
 */
export default defineConfig({
  root,
  base: "/systems/kedom/",

  resolve: {
    alias: {
      "@kedom/shared": resolve(root, "../shared/src/index.ts"),
    },
  },

  css: {
    postcss: resolve(root, "postcss.config.mjs"),
    devSourcemap: true,
  },

  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
    // Each layer bundle must emit its own file rather than being merged.
    cssCodeSplit: true,
    // Foundry loads the ESM entry directly; no minification so stack traces
    // from a user's console stay readable.
    minify: false,
    target: "es2023",

    lib: {
      entry: {
        kedom: resolve(root, "src/kedom.ts"),
        "css/kedom-tokens": resolve(root, "src/styles/tokens.css"),
        "css/kedom-elements": resolve(root, "src/styles/elements.css"),
        "css/kedom-system": resolve(root, "src/styles/system.css"),
      },
      formats: ["es"],
    },

    rollupOptions: {
      output: {
        entryFileNames: "[name].mjs",
        chunkFileNames: "chunks/[name]-[hash].mjs",
        assetFileNames: "[name][extname]",
      },
    },
  },

  plugins: [
    viteStaticCopy({
      targets: [
        { src: "system.json", dest: "." },
        { src: "lang", dest: "." },
        { src: "templates", dest: "." },
        { src: "assets", dest: "." },
        { src: "README.md", dest: "." },
        { src: "../../LICENSE", dest: "." },
      ],
      silent: false,
    }),
    copyCompendiumPacks(),
  ],
});
