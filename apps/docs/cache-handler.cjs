/* global require, module */
// Incremental-cache handler: Next's own FileSystemCache, minus the disk writes.
//
// WHY: Railway bills page cache as RAM. It meters a service's memory as the
// container cgroup's memory.current, and that includes the kernel's page cache
// for every file the container has written until the kernel needs the memory
// back, which on a host with headroom is never.
//
// With the default handler, every page and route rendered at runtime is written
// under .next/server/route-cache: the HTML, the RSC payload, and one
// prefetch-segment file per layout segment. Measured on dowelui.com's first
// day on Railway (2026-11-21): 1,591 files and 154 MB written in about six
// minutes of crawler traffic. The container's file cache grew to 292 MB while
// the Node process itself held 195 MB. Crawlers walk every docs page, so this
// grows toward the size of the whole rendered site.
//
// WHAT CHANGES: only where entries live. FileSystemCache already keeps an
// in-memory LRU bounded by `cacheMaxMemorySize` and checks it first; the disk
// is a second tier. Turning off `flushToDisk` drops the disk tier for writes:
//   - pages and routes prerendered by `next build` are still READ from .next on
//     an LRU miss (Next 16.3.8 skips the disk read only for the fetch/data
//     cache);
//   - revalidateTag / revalidatePath behave the same;
//   - the image optimiser has its own cache and is not affected.
//
// COST: an entry evicted from the LRU is rendered again on its next request.
//
// Deep import on purpose: Next has no public base class for cache handlers.
// cache-handler.test.ts fails if this path or the constructor contract changes
// in a Next upgrade.
const FileSystemCache =
  require("next/dist/server/lib/incremental-cache/file-system-cache").default;

class MemoryOnlyIncrementalCache extends FileSystemCache {
  constructor(ctx) {
    super({ ...ctx, flushToDisk: false });
  }
}

module.exports = MemoryOnlyIncrementalCache;
