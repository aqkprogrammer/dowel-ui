/**
 * The stories in a built Storybook, and the baseline a compare run reads.
 *
 * Storybook writes `index.json` next to the build: one entry per story and one
 * per docs page. Only stories are screenshots; a docs page is the same stories
 * again, laid out by Storybook rather than by us.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { manifestPath, storybookDir } from "./paths";

export interface Story {
  id: string;
  title: string;
  name: string;
}

interface StorybookIndex {
  entries: Record<string, { type: string; id: string; title: string; name: string }>;
}

export function readStories(directory: string = storybookDir): Story[] {
  const file = join(directory, "index.json");
  if (!existsSync(file)) {
    throw new Error(
      `No Storybook build at ${directory}. Run \`pnpm build-storybook\` first, or point STORYBOOK_DIR at a build.`,
    );
  }
  const index = JSON.parse(readFileSync(file, "utf8")) as StorybookIndex;
  return Object.values(index.entries)
    .filter((entry) => entry.type === "story")
    .map(({ id, title, name }) => ({ id, title, name }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Written at the end of a baseline run, read by a compare run. It is how a
 * compare run tells a story that is new (not in the baseline build at all)
 * from one the baseline run could not capture, and how it knows which stories
 * have been removed.
 */
export interface Manifest {
  /** Every story id in the build the baseline was captured from. */
  stories: string[];
}

export function readManifest(): Manifest | undefined {
  if (!existsSync(manifestPath)) return undefined;
  return JSON.parse(readFileSync(manifestPath, "utf8")) as Manifest;
}
