import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import globals from "globals";
import tseslint from "typescript-eslint";

/**
 * Encodes what Style.md can be machine-checked. Everything here maps to a
 * stated rule; if a rule is not in Style.md, it does not belong here.
 */
export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "packages/shared/src/generated/**",
      "packages/forge/api/**",
      "packages/system/packs/**",
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.browser,
        // Foundry's ambient globals. fvtt-types declares the types; ESLint needs
        // to know the names exist.
        game: "readonly",
        CONFIG: "readonly",
        CONST: "readonly",
        Hooks: "readonly",
        foundry: "readonly",
        ui: "readonly",
        canvas: "readonly",
        Roll: "readonly",
      },
    },

    rules: {
      // Style.md: handle every error, no floating promises, no `any`.
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unsafe-assignment": "error",
      "@typescript-eslint/use-unknown-in-catch-callback-variable": "error",
      "no-empty": ["error", { allowEmptyCatch: false }],

      // Style.md: soft 70-line limit. A warning, because it is a soft limit --
      // but a warning that should be acted on, not silenced.
      "max-lines-per-function": [
        "warn",
        { max: 70, skipBlankLines: true, skipComments: true },
      ],

      // Style.md: prefer `null` over `undefined` for a single absent value,
      // and the simplest return that works.
      "@typescript-eslint/no-unnecessary-condition": "error",
      "@typescript-eslint/strict-boolean-expressions": [
        "error",
        { allowNullableObject: true, allowNullableBoolean: false },
      ],

      // Style.md: no aliasing or duplicated state; introduce at point of use.
      "prefer-const": "error",
      "no-var": "error",
      "no-param-reassign": ["error", { props: true }],

      // Style.md: recursion only with a hard bound -- not checkable, but
      // unreachable and unused code usually means a bound was lost.
      "no-unreachable": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],

      // Style.md naming. The `_`-prefixed method exemption is for Foundry's own
      // API (`_prepareContext`, `_onRender`), which we override rather than name.
      "@typescript-eslint/naming-convention": [
        "error",
        { selector: "default", format: ["camelCase"] },
        {
          selector: "variable",
          format: ["camelCase", "UPPER_CASE"],
          leadingUnderscore: "allow",
        },
        { selector: "parameter", format: ["camelCase"], leadingUnderscore: "allow" },
        { selector: "typeLike", format: ["PascalCase"] },
        { selector: "enumMember", format: ["PascalCase"] },
        {
          selector: "classProperty",
          modifiers: ["static", "readonly"],
          format: ["UPPER_CASE", "camelCase"],
        },
        { selector: "classMethod", format: ["camelCase"], leadingUnderscore: "allow" },
        // Object literal keys are data -- localisation keys, Foundry schemas,
        // and slugs are not identifiers.
        { selector: "objectLiteralProperty", format: null },
        { selector: "typeProperty", format: null },
      ],
    },
  },

  // Derivations and rolls are pure. This is what keeps prepareDerivedData cheap,
  // so the purity is enforced rather than merely documented.
  {
    files: ["packages/system/src/derivations/**/*.ts", "packages/system/src/rolls/**/*.ts"],
    rules: {
      "no-restricted-globals": [
        "error",
        { name: "game", message: "Derivations and rolls are pure. Pass the data in." },
        { name: "ui", message: "Derivations and rolls are pure. Return data; let the caller notify." },
        { name: "canvas", message: "Derivations and rolls are pure. Pass the data in." },
      ],
    },
  },

  // Repo tasks run under Node, not the browser.
  {
    files: ["tools/**/*.ts", "*.config.ts", "*.config.mjs", "**/vite.config.ts"],
    languageOptions: { globals: globals.node },
    rules: {
      "@typescript-eslint/naming-convention": "off",
      "no-console": "off",
    },
  },

  // Must stay last: turns off everything Prettier owns.
  prettier,
);
