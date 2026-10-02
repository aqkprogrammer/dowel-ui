import { defineConfig, devices } from "@playwright/test";

import { port, resultsDir, snapshotDir, storybookDir } from "./paths";
import { readStories } from "./stories";

// Fails here, with a sentence, when there is no build to screenshot. Left to
// the web server below, the same mistake is a minute's wait and a timeout.
readStories();

/**
 * A screenshot of every Storybook story, compared between two builds.
 *
 * There are no baseline images in git. A run with `--update-snapshots=all`
 * captures a baseline from one build (`pnpm visual:baseline`); a run without it
 * compares another build against that baseline (`pnpm visual:compare`). CI does
 * both in one job, for the pull request's base commit and for its head, so the
 * two sets of images always come from the same machine, browser and fonts. See
 * docs/testing/visual-regression.md.
 *
 * Everything that could make two captures of the same build differ is pinned
 * here or in tests/stories.spec.ts: one browser, one viewport, one pixel per
 * CSS pixel, one locale, one timezone, light colour scheme, reduced motion.
 */
export default defineConfig({
  testDir: "./tests",
  outputDir: resultsDir,
  // One flat directory of `<story id>.png`. No platform or browser suffix: the
  // baseline never leaves the machine it was captured on.
  snapshotDir,
  snapshotPathTemplate: "{snapshotDir}/{arg}{ext}",
  // Never write a missing baseline during a compare run. A story with no
  // baseline is reported as new by the spec instead.
  updateSnapshots: "none",
  fullyParallel: true,
  // Hosted runners have few cores and nothing else to do with them.
  workers: process.env.CI ? "100%" : undefined,
  // Off locally, so that the stability check shows a story that is only
  // sometimes the same. In CI one retry separates a hiccup on a shared runner
  // from a real difference, and the summary still lists what needed it.
  retries: process.env.CI ? 1 : 0,
  forbidOnly: Boolean(process.env.CI),
  timeout: 30_000,
  // A baseline run prints "A snapshot doesn't exist, writing actual" for every
  // story, which is the point of the run and says nothing a thousand times.
  quiet: true,
  globalSetup: "./global-setup.ts",
  reporter: [
    [process.env.CI ? "dot" : "line"],
    ["html", { open: "never" }],
    ["./summary-reporter.ts"],
  ],
  expect: {
    toHaveScreenshot: {
      // CSS animations and transitions: finite ones jump to their end state,
      // infinite ones are reset to their start.
      animations: "disabled",
      caret: "hide",
      scale: "css",
      // The tolerance is per pixel, not per image. A pixel counts as different
      // once its colour has moved by about 5 of the 255 levels of lightness.
      // That is the whole allowance: enough to ignore a rounding difference
      // nobody could see, far below Playwright's default of 0.2, under which a
      // colour token can move a fifth of the way from black to white unnoticed.
      threshold: 0.02,
      // And no pixel may differ. Two captures of the same build come out
      // identical, so there is no noise to allow for, and a real change can be
      // very small: making one button's corners 2px rounder moves six pixels.
      maxDiffPixels: 0,
    },
  },
  use: {
    ...devices["Desktop Chrome"],
    baseURL: `http://localhost:${String(port)}`,
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    colorScheme: "light",
    reducedMotion: "reduce",
    locale: "en-US",
    timezoneId: "UTC",
    // When a small part of the page changes, Chromium redraws only that part
    // of the tile, and the pixels along the seam depend on what was there
    // before. Redrawing whole tiles takes the page's history out of the
    // picture: without this, the round end of a progress bar came out one of
    // two ways.
    launchOptions: { args: ["--disable-partial-raster"] },
  },
  projects: [{ name: "chromium" }],
  // The same static server the screen reader tests use, pointed at the build
  // under test. Never an existing server: it might be serving another build.
  webServer: {
    command: "node ../screen-reader-tests/serve-storybook.ts",
    env: { STORYBOOK_DIR: storybookDir, PORT: String(port) },
    url: `http://localhost:${String(port)}/iframe.html`,
    reuseExistingServer: false,
    stdout: "pipe",
    stderr: "pipe",
    timeout: 60_000,
  },
});
