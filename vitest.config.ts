import { defineConfig } from "vitest/config";

/**
 * Root config, for the audit scripts only.
 *
 * The packages each run their own suite through turbo; this covers the code in
 * `scripts/`, which belongs to no package but is the thing deciding whether the
 * palette passes WCAG — so it needs tests of its own.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["scripts/**/*.test.ts"],
  },
});
