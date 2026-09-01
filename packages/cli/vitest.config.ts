import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts", "test/**/*.test.ts"],
    // The end-to-end tests install into scratch projects on disk, which is
    // slower than a unit test and must not be cut short.
    testTimeout: 30_000,
  },
});
