import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/**
 * Svelte 5 with runes. No SvelteKit: Forge is a single-page tool talking to a
 * local Go API, and adding a meta-framework would buy routing we can do in a
 * hundred lines.
 *
 * @type {import('@sveltejs/vite-plugin-svelte').SvelteConfig}
 */
export default {
  preprocess: vitePreprocess(),
  compilerOptions: {
    runes: true,
  },
};
