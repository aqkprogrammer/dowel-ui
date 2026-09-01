import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import globals from "globals";
import tseslint from "typescript-eslint";

/**
 * Base flat config: JS + type-aware TypeScript rules.
 * Consumers set `parserOptions.tsconfigRootDir` to their own package root.
 */
export const base = tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/coverage/**",
      "**/node_modules/**",
      "**/storybook-static/**",
      "**/.turbo/**",
      "**/.next/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      globals: { ...globals.node, ...globals.es2022 },
      parserOptions: { projectService: true },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    // Config and script files sit outside the tsconfig projects.
    files: ["**/*.config.{js,ts,mjs}", "**/.storybook/**", "**/eslint/*.js"],
    extends: [tseslint.configs.disableTypeChecked],
  },
  prettier,
);

export default base;
