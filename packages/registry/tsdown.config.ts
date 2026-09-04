import { defineConfig } from "tsdown";

export default defineConfig({
  /**
   * `generate` is its own entry so it can be imported in a browser.
   *
   * The package root reaches the filesystem — building a registry means reading
   * files — and a bundler asked for the root in a client component drags
   * `node:fs` into the browser bundle, which fails the build outright. The
   * planner touches nothing but data, so it gets a door of its own.
   */
  entry: ["src/index.ts", "src/build.ts", "src/generate.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  outExtensions: () => ({ js: ".js", dts: ".d.ts" }),
});
