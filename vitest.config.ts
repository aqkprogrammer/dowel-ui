import { defineConfig } from "vitest/config";

/**
 * Root config, for the audit scripts only.
 *
 * The packages each run their own suite through turbo; this covers the code in
 * `scripts/`, which belongs to no package.
 *
 * The colour maths it used to cover now lives in `@dowel-ui/themes` and is
 * tested there, because the theme studio in the browser and the audit in CI
 * have to agree and can only do that by sharing one implementation.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["scripts/**/*.test.ts"],
  },
});
