import { react } from "@dowel-ui/config/eslint/react";

export default [
  ...react,
  {
    ignores: [
      "**/dist/**",
      "**/coverage/**",
      "**/storybook-static/**",
      "**/.turbo/**",
      // A published shim with no build step, so it belongs to no tsconfig
      // project and typed linting cannot parse it. There is nothing to lint:
      // the file is a single re-export of the real CLI.
      "packages/cli-alias/bin.js",
    ],
  },
];
