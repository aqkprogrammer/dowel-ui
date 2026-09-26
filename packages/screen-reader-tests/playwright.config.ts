import { defineConfig, devices } from "@playwright/test";

/**
 * Real screen readers, not a simulation of one.
 *
 * VoiceOver runs on macOS against WebKit, the engine it is used with; NVDA
 * runs on Windows against Chromium. Both need the machine set up first
 * (`npx @guidepup/setup`, or `guidepup/setup-action` in CI) and both take over
 * the machine's speech and keyboard while they run — which is why these are
 * not part of `pnpm test`.
 *
 * The pages under test are the Storybook stories, so what is tested here is
 * the same thing the docs site previews and the unit tests render.
 *
 * Guidepup's own `screenReaderConfig` is written out below rather than
 * imported: importing Guidepup looks for a screen reader straight away and
 * throws where there is none, which would take the harness down on Linux.
 */
const STATIC = Boolean(process.env.CI ?? process.env.STORYBOOK_STATIC);

export default defineConfig({
  // One screen reader per machine, so one test at a time.
  workers: 1,
  fullyParallel: false,
  testDir: "./tests",
  // Speech takes as long as it takes. One reply, read at a screen reader's
  // default rate, is most of a minute.
  timeout: 180_000,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:6007",
    // Screen readers do not work against a headless browser.
    headless: false,
    video: "retain-on-failure",
  },
  // In CI, a built Storybook served from disk (see serve-storybook.ts); run
  // `pnpm --filter @dowel-ui/react build-storybook` first. Locally, the dev
  // server, unless STORYBOOK_STATIC is set.
  webServer: STATIC
    ? {
        command: "node serve-storybook.ts",
        url: "http://localhost:6007/iframe.html",
        reuseExistingServer: false,
        stdout: "pipe",
        stderr: "pipe",
        timeout: 60_000,
      }
    : {
        command: "pnpm --filter @dowel-ui/react exec storybook dev -p 6007 --ci --no-open",
        cwd: "../..",
        url: "http://localhost:6007",
        reuseExistingServer: true,
        stdout: "pipe",
        stderr: "pipe",
        timeout: 180_000,
      },
  projects: [
    {
      // No screen reader: proves the scenarios themselves, anywhere.
      name: "harness",
      testMatch: /\.harness\.spec\.ts$/,
      use: { ...devices["Desktop Chrome"], headless: true },
    },
    {
      name: "voiceover",
      testMatch: /\.voiceover\.spec\.ts$/,
      use: { ...devices["Desktop Safari"], headless: false },
    },
    {
      name: "nvda",
      testMatch: /\.nvda\.spec\.ts$/,
      use: { ...devices["Desktop Chrome"], headless: false },
    },
  ],
});
