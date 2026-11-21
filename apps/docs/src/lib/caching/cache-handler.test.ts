import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/** The part of Next's FileSystemCache these tests touch. */
interface IncrementalCache {
  flushToDisk: boolean;
}
type IncrementalCacheClass = new (ctx: Record<string, unknown>) => IncrementalCache;

// The handler is CommonJS because next-server loads it by path at runtime,
// outside the bundler.
const require = createRequire(import.meta.url);
const handlerPath = fileURLToPath(new URL("../../../cache-handler.cjs", import.meta.url));
const MemoryOnlyIncrementalCache = require(handlerPath) as IncrementalCacheClass;
const { default: FileSystemCache } =
  require("next/dist/server/lib/incremental-cache/file-system-cache") as {
    default: IncrementalCacheClass;
  };

describe("cache-handler.cjs", () => {
  it("is Next's own FileSystemCache (fails if a Next upgrade moves the class)", () => {
    expect(typeof FileSystemCache).toBe("function");
    expect(Object.getPrototypeOf(MemoryOnlyIncrementalCache)).toBe(FileSystemCache);
  });

  it("never writes runtime renders to disk, whatever Next asks for", () => {
    const cache = new MemoryOnlyIncrementalCache({
      fs: {},
      dev: false,
      flushToDisk: true,
      serverDistDir: "/tmp/does-not-matter",
      maxMemoryCacheSize: 1024 * 1024,
      revalidatedTags: [],
    });
    expect(cache.flushToDisk).toBe(false);
  });

  it("is the cacheHandler next.config.ts hands to Next", async () => {
    const { default: config } = await import("../../../next.config");
    expect(config.cacheHandler).toBe(handlerPath);
  });
});
