import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts", "src/components/*/index.ts", "src/registry/components.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  external: ["react", "react-dom"],
  // One output file per source module.
  //
  // Bundling merges modules into shared chunks, and a chunk that mixes a client
  // component with anything else loses the "use client" directive — which makes
  // the published package unusable in a React Server Components app. Preserving
  // the module structure keeps each directive on the file it belongs to.
  unbundle: true,
  alias: { "@": new URL("src", import.meta.url).pathname },
  // The package is `"type": "module"`, so plain .js is unambiguous and keeps the
  // exports map readable.
  outExtensions: () => ({ js: ".js", dts: ".d.ts" }),
});
