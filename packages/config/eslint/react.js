import jsxA11y from "eslint-plugin-jsx-a11y";
import reactHooks from "eslint-plugin-react-hooks";
import storybook from "eslint-plugin-storybook";
import globals from "globals";
import tseslint from "typescript-eslint";

import { base } from "./base.js";

/**
 * React flat config: base rules plus hooks correctness and JSX accessibility.
 *
 * Accessibility linting is the reason this repo is on ESLint rather than a
 * faster all-in-one linter — see docs/architecture/0001-toolchain.md.
 */
export const react = tseslint.config(
  ...base,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      globals: { ...globals.browser },
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [reactHooks.configs.flat["recommended-latest"], jsxA11y.flatConfigs.recommended],
  },
  ...storybook.configs["flat/recommended"],
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      // The rule targets the DOM autofocus attribute, which disorients users on
      // page load. It also fires on any component prop spelled `autoFocus`,
      // including react-day-picker's — which asks the calendar grid to focus its
      // selected day when it mounts inside an already-opened popover. That is
      // correct focus management, not page-load autofocus. DOM `autoFocus`
      // remains an error.
      "jsx-a11y/no-autofocus": ["error", { ignoreNonDOM: true }],

      // A scrollable container must be focusable, or its overflowing content is
      // unreachable by keyboard — that is the documented pattern for a named
      // scrollable region, not an exception to it. Everything else
      // non-interactive still may not take a tabindex.
      "jsx-a11y/no-noninteractive-tabindex": [
        "error",
        { tags: [], roles: ["tabpanel", "region"], allowExpressionValues: true },
      ],
    },
  },
  {
    files: ["**/*.test.{ts,tsx}", "**/*.stories.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
);

export default react;
