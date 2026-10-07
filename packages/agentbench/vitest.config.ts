import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts", "test/**/*.test.ts"],
    // The end-to-end test scaffolds real projects with the local builds and
    // lints them, which is slower than a unit test and must not be cut short.
    testTimeout: 60_000,
  },
});
