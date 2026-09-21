import { resolve } from "node:path";
import { defineConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";

const root = import.meta.dirname;

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
  ],
});
