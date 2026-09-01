import { react } from "@dowel-ui/config/eslint/react";

export default [
  ...react,
  {
    ignores: ["**/dist/**", "**/coverage/**", "**/storybook-static/**", "**/.turbo/**"],
  },
];
