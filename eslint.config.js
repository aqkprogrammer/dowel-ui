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
      // Scaffolder payload, not source. These files import `@/components/ui/*`,
      // which does not exist until the CLI has written it into a generated
      // project, and they carry `__PLACEHOLDER__` tokens — so they belong to no
      // tsconfig project and typed linting cannot resolve them. They are
      // checked by generating from each template and building the result, which
      // is a stronger check than linting them here would be.
      "packages/create-dowel-app/templates/**",
    ],
  },
];
