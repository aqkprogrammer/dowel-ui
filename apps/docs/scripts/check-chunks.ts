import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

/**
 * Fails the build if any client chunk is larger than the budget.
 *
 * Written after the previews shipped every story in the library as one 2.1 MB
 * chunk, which 296 of the site's 312 pages downloaded — the button page
 * carried the data table, the charts and every block. Nothing failed: the site
 * looked right and was simply slow. A size nobody checks is a size that only
 * grows, so it is checked here, on every build.
 *
 * Raw bytes rather than gzipped, because what a chunk costs after it arrives —
 * parsing and compiling it on the main thread — scales with the raw size, and
 * that is the cost a slow phone feels. The gzipped size is printed alongside
 * for anyone comparing with the network panel.
 */

/**
 * 256 KB, for any chunk not named below.
 *
 * Measured, not picked: the largest chunks every page loads are React DOM
 * (about 224 KB) and the half of three.js the root layout's star field pulls in
 * (about 220 KB). Both fit with room for a minor version; a component's own
 * story chunk is tens of kilobytes. A shared bundle of stories, the failure this exists for, would
 * be over by a wide margin long before it reached the size it once did.
 */
const BUDGET = 256 * 1024;

/**
 * Chunks allowed past the budget, each with a ceiling of its own.
 *
 * Found by a string the chunk's code contains rather than by file name, since
 * the names are content hashes. An allowance that matches nothing fails the
 * build too: left in place, it would wait for some unrelated chunk to grow
 * into it.
 */
const ALLOWANCES: { label: string; marker: string; ceiling: number; reason: string }[] = [
  {
    label: "the star field's renderer",
    // A texture name `postprocessing` sets as a string, so it survives
    // minification and appears in no other library.
    marker: "EffectComposer.InputDepth",
    // About 455 KB today: three.js's WebGL renderer, `postprocessing`, and the
    // scene. 512 KB is that with room for a three.js minor.
    ceiling: 512 * 1024,
    reason:
      "fetched only once a page has a hero to draw the field behind, after first paint, " +
      "and only on a device the renderer profile says can run it. Splitting it would not " +
      "make it smaller, only later: the scene cannot start until all of it has arrived.",
  },
];

const here = dirname(fileURLToPath(import.meta.url));
const appRoot = join(here, "..");

/**
 * Where this build put its client chunks.
 *
 * `.next/static/chunks` locally and in CI. A host can move Next's output — the
 * first deploy after this check was added failed on Vercel, whose build
 * rewrites the config, because the chunks were not there — so the output
 * directory is found by the `BUILD_ID` file Next writes at its root rather
 * than assumed.
 */
function findChunksDir(): string | undefined {
  const candidates = [join(appRoot, ".next")];
  const search = (directory: string, depth: number): void => {
    if (depth > 3) return;
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name === "node_modules" || entry.name === ".git")
        continue;
      const path = join(directory, entry.name);
      if (existsSync(join(path, "BUILD_ID"))) candidates.push(path);
      search(path, depth + 1);
    }
  };
  search(appRoot, 0);
  return candidates
    .map((distDir) => join(distDir, "static", "chunks"))
    .find((directory) => existsSync(directory));
}

const chunksDir = findChunksDir();

function walk(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

function kb(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

if (chunksDir === undefined) {
  // On the host the build still succeeds: every pull request runs this check
  // in CI against the same commit, so a deploy is not the gate. Anywhere else,
  // no chunks means `next build` did not run, which is an error.
  if (process.env.VERCEL === "1") {
    console.warn("Chunk budget: no client chunks found in this build's output; checked in CI.");
    process.exit(0);
  }
  throw new Error(`No client chunks under ${appRoot}. Run \`next build\` first.`);
}

const chunks = walk(chunksDir)
  .filter((path) => path.endsWith(".js"))
  .map((path) => {
    const source = readFileSync(path);
    return {
      name: relative(chunksDir, path),
      raw: source.length,
      gzip: gzipSync(source).length,
      allowance: ALLOWANCES.find((allowance) => source.includes(allowance.marker)),
    };
  })
  .sort((a, b) => b.raw - a.raw);

if (chunks.length === 0) {
  throw new Error(`No chunks under ${chunksDir}. The build produced no client code?`);
}

const failures: string[] = [];

for (const chunk of chunks) {
  const limit = chunk.allowance?.ceiling ?? BUDGET;
  if (chunk.raw > limit) {
    failures.push(
      `${chunk.name} is ${kb(chunk.raw)} (${kb(chunk.gzip)} gzipped), over its ${kb(limit)} ` +
        (chunk.allowance ? `ceiling as ${chunk.allowance.label}.` : "budget."),
    );
  }
}

for (const allowance of ALLOWANCES) {
  if (!chunks.some((chunk) => chunk.allowance === allowance)) {
    failures.push(
      `The allowance for ${allowance.label} matched no chunk (marker "${allowance.marker}"). ` +
        "Remove it, or update the marker if the chunk is still there.",
    );
  }
}

console.log(`Chunks in ${relative(appRoot, chunksDir)}.`);
console.log(`Chunk budget: ${kb(BUDGET)} raw per chunk, ${String(chunks.length)} chunks.`);
for (const chunk of chunks.slice(0, 5)) {
  const note = chunk.allowance
    ? ` — allowed to ${kb(chunk.allowance.ceiling)} as ${chunk.allowance.label}: ${chunk.allowance.reason}`
    : "";
  console.log(
    `  ${kb(chunk.raw).padStart(10)}  ${kb(chunk.gzip).padStart(9)} gz  ${chunk.name}${note}`,
  );
}

if (failures.length > 0) {
  throw new Error(
    `Client chunks over budget:\n${failures.map((failure) => `  - ${failure}`).join("\n")}\n` +
      "A chunk this size usually means something that should load on demand is " +
      "imported statically — see scripts/check-chunks.ts for why the budget is what it is.",
  );
}
