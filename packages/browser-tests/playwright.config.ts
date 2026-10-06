import { defineConfig, devices } from "@playwright/test";

/**
 * Every story in a real browser.
 *
 * Two suites over one static Storybook build:
 *
 * - `a11y` — axe on all ~1,350 stories, light and dark, with the two rules
 *   jsdom cannot evaluate switched on. Not pixel-sensitive, so it runs
 *   anywhere Chromium does.
 * - `visual` / `visual-mobile` — screenshot comparison for a curated subset.
 *   Pixel-sensitive, so it runs only inside the pinned Playwright container
 *   (see tests/visual.spec.ts and scripts/in-container.ts).
 *
 * Kept apart from screen-reader-tests on purpose: those drive a real screen
 * reader, need a headed browser and take the machine over, so they run on
 * demand. These are headless and run on every pull request. The server is
 * shared rather than copied — see `webServer`.
 *
 * Build first: `pnpm build-storybook` from the repository root.
 */
const PORT = 6008;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  workers: process.env.CI ? 4 : undefined,
  // No retries. A test that passes on its second attempt is a flaky test, and
  // a flaky accessibility or screenshot check is one people learn to ignore.
  retries: 0,
  forbidOnly: Boolean(process.env.CI),
  timeout: 30_000,
  reporter: process.env.CI
    ? [["list"], ["github"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://localhost:${String(PORT)}`,
    // Base.css collapses every non-indicator animation under this; the rest is
    // stopped by `--motion-scale: 0` (lib/storybook.ts).
    contextOptions: { reducedMotion: "reduce" },
    locale: "en-US",
    timezoneId: "UTC",
    trace: "retain-on-failure",
  },
  // The screen reader tests' server, run from here rather than duplicated:
  // a dependency-free static server over the same storybook-static folder.
  webServer: {
    command: "node ../screen-reader-tests/serve-storybook.ts",
    env: { PORT: String(PORT) },
    url: `http://localhost:${String(PORT)}/iframe.html`,
    reuseExistingServer: !process.env.CI,
    stdout: "pipe",
    stderr: "pipe",
    timeout: 30_000,
  },
  // One path per screenshot, with no platform suffix: there is exactly one
  // platform the baselines are valid on, the container, and a second set of
  // images for macOS would be a set nobody can verify in CI.
  snapshotPathTemplate: "{testDir}/__screenshots__/{projectName}/{arg}{ext}",
  expect: {
    toHaveScreenshot: {
      animations: "disabled",
      caret: "hide",
      scale: "css",
      // Same container, same Chromium, same fonts: the render is
      // deterministic, so no pixel tolerance. If this ever needs loosening,
      // that is a determinism bug to find, not a number to raise.
      maxDiffPixels: 0,
    },
  },
  projects: [
    {
      name: "a11y",
      testMatch: /a11y\.spec\.ts$/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
        // The failure message carries the rule, the nodes and the ratios; a
        // trace adds nothing to that, and would be recorded for each of
        // 2,700 page loads to keep a handful.
        trace: "off",
      },
      // A budget, not a retry. The heaviest story measured, uptime-matrix,
      // renders in 1.9 s and is checked by axe in 1.4 s on macOS; in the
      // container on a heavily shared Docker VM the same took 23 s and 57 s.
      // 30 s and 60 s both timed out there.
      timeout: 120_000,
    },
    // The visual projects get the same budget as the axe suite: baselines are
    // written under x86-64 emulation on Apple silicon, where one story took
    // about 23 s in a trial run and 41 of the first 79 timed out at 30 s on a
    // shared machine.
    {
      name: "visual",
      testMatch: /visual\.spec\.ts$/,
      timeout: 120_000,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
        deviceScaleFactor: 1,
      },
    },
    {
      name: "visual-mobile",
      testMatch: /visual\.spec\.ts$/,
      timeout: 120_000,
      grep: /@block/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 1,
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
});
