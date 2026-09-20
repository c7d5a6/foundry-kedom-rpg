import { resolve } from "node:path";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

const root = import.meta.dirname;

/**
 * Forge runs entirely on localhost: this dev server, plus the Go API on :7777.
 * Nothing here is served to Foundry, so Svelte carries no upgrade risk — that
 * separation is the whole point of ADR-003.
 */
export default defineConfig({
  root,

  plugins: [tailwindcss(), svelte()],

  resolve: {
    alias: {
      "@kedom/shared": resolve(root, "../../shared/src/index.ts"),
      $lib: resolve(root, "src/lib"),
    },
  },

  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      // Keeps the browser on one origin, so no CORS handling in the Go API.
      "/api": {
        target: "http://localhost:7777",
        changeOrigin: true,
      },
    },
  },

  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
    target: "es2023",
  },
});
