/**
 * Kept deliberately minimal. Native CSS nesting, custom properties, `@layer`,
 * and `@scope` are all used directly rather than through a preprocessor —
 * see docs/system/ui-design-system.md for why.
 */
export default {
  plugins: {
    // Resolves the `@import` barrels in src/styles/ so each layer ships as one file.
    "postcss-import": {},
    autoprefixer: {},
  },
};
