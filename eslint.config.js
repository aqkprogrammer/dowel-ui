import { react } from "@dowel/config/eslint/react";

export default [
  ...react,
  {
    ignores: ["**/dist/**", "**/coverage/**", "**/storybook-static/**", "**/.turbo/**"],
  },
];
