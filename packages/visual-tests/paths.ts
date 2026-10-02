/**
 * Where the build under test, the baseline and the results live.
 *
 * Two environment variables point a run at a build and a baseline:
 *
 *   STORYBOOK_DIR        the built Storybook to screenshot
 *                        (default: packages/ui/storybook-static)
 *   VISUAL_SNAPSHOT_DIR  where the baseline images are written and read
 *                        (default: packages/visual-tests/baseline)
 *
 * A relative path is taken from the directory pnpm was started in, which for
 * the root `visual:*` scripts is the repository root, and not from this
 * package: pnpm runs a package script inside the package, and
 * `STORYBOOK_DIR=../other/build pnpm visual:compare` from the repository root
 * should mean what it says.
 */
import { join, resolve } from "node:path";

const here = import.meta.dirname;
const invokedFrom = process.env.INIT_CWD ?? process.cwd();

function fromEnv(value: string | undefined, fallback: string): string {
  return value ? resolve(invokedFrom, value) : fallback;
}

export const storybookDir = fromEnv(
  process.env.STORYBOOK_DIR,
  join(here, "..", "ui", "storybook-static"),
);

export const snapshotDir = fromEnv(process.env.VISUAL_SNAPSHOT_DIR, join(here, "baseline"));

/** What the baseline run saw: every story id in that build, and which failed. */
export const manifestPath = join(snapshotDir, "baseline.json");

/** Playwright's output directory. The summary files are written here too. */
export const resultsDir = join(here, "test-results");

export const port = Number(process.env.VISUAL_PORT ?? 6008);

export function snapshotPath(id: string): string {
  return join(snapshotDir, `${id}.png`);
}
