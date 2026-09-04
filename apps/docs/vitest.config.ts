import { defineConfig } from "vitest/config";

/**
 * The site's own tests.
 *
 * Narrow on purpose: the pages are generated from the registry and covered by
 * the registry's suite, so what needs testing here is the logic the site adds —
 * chiefly licensing, where a mistake gives the product away rather than
 * rendering something crooked.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
