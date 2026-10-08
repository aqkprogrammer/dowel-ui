import type { FullConfig } from "@playwright/test";

import { manifestPath, snapshotDir, storybookDir } from "./paths";
import { readManifest, readStories } from "./stories";

/**
 * Fails early, with a sentence, on the two mistakes that would otherwise look
 * like a pass: no build to screenshot, and a compare run with no baseline (in
 * which every story would be "new", and new stories do not fail).
 */
export default function globalSetup(config: FullConfig): void {
  const stories = readStories();
  const capturing = config.updateSnapshots !== "none";

  if (!capturing && !readManifest()) {
    throw new Error(
      `No baseline at ${manifestPath}. Capture one first with \`pnpm visual:baseline\`, from the build you want to compare against.`,
    );
  }

  console.log(
    `${capturing ? "Capturing a baseline from" : "Comparing"} ${String(stories.length)} stories in ${storybookDir}\n` +
      `${capturing ? "Writing it to" : "Against the baseline in"} ${snapshotDir}`,
  );
}
