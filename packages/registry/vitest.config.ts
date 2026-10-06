import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Building the registry reads every component through the TypeScript
    // compiler to extract its props, so a test that builds it is measured in
    // seconds, and more on a busy machine. Five was a budget for unit tests.
    testTimeout: 30_000,
  },
});
