import { expect, test, type Page } from "@playwright/test";

import {
  DIRECTIONS,
  installStillness,
  openStory,
  readStories,
  settle,
  THEMES,
} from "../lib/storybook";

/**
 * Screenshot comparison for a curated subset of stories.
 *
 * Not all ~1,350: most of the catalogue is motion, canvas and effects whose
 * picture is a frame of something moving, and a baseline per story per mode
 * per direction would be thousands of images nobody reviews. These are the
 * surfaces a regression would hurt most — the controls every form uses, the
 * overlays (open, because a closed overlay is a button), tables, feedback,
 * the AI primitives, and five blocks at both widths — in light and dark, left
 * to right and right to left.
 *
 * Deterministic by construction rather than by tolerance:
 * - one pinned browser and font set: the official Playwright image for the
 *   installed version (scripts/in-container.ts; the CI job uses the same tag);
 * - reduced motion, `--motion-scale: 0`, and Playwright's own animation and
 *   caret freezing;
 * - a fixed clock, so a calendar shows the same month every day;
 * - a seeded `Math.random`;
 * - no network beyond the local Storybook — a story that reaches out fails
 *   here, rather than producing a picture of whatever the internet returned.
 * Nothing on the list draws to a canvas, so nothing needs masking.
 */

interface VisualStory {
  id: string;
  /** How to reach the state worth comparing, and what proves it is reached. */
  open?: { by: "click" | "hover"; reveals: string };
  /** Blocks are full pages: captured whole, and at the mobile width too. */
  block?: boolean;
}

const click = (reveals: string) => ({ by: "click" as const, reveals });

export const VISUAL_STORIES: VisualStory[] = [
  // Foundations
  { id: "foundation-button--variants" },
  { id: "foundation-button--with-icons" },
  { id: "display-badge--variants" },
  { id: "display-card--default" },
  // Forms
  { id: "forms-input--invalid" },
  { id: "forms-input--floating-label-states" },
  { id: "forms-checkbox--states" },
  { id: "forms-radio-group--with-descriptions" },
  { id: "forms-switch--states" },
  { id: "forms-textarea--with-count" },
  { id: "forms-slider--range" },
  { id: "forms-form--with-error" },
  { id: "forms-calendar--default" },
  // Overlays, open
  { id: "overlays-dialog--default", open: click("[role=dialog]") },
  { id: "overlays-alert-dialog--default", open: click("[role=alertdialog]") },
  { id: "overlays-sheet--default", open: click("[role=dialog]") },
  { id: "overlays-dropdown-menu--default", open: click("[role=menu]") },
  { id: "overlays-popover--default", open: click("[role=dialog]") },
  { id: "overlays-tooltip--default", open: { by: "hover", reveals: "[role=tooltip]" } },
  { id: "forms-select--default", open: click("[role=listbox]") },
  // Data
  { id: "data-table--default" },
  { id: "data-data-table--default" },
  { id: "data-accordion--default" },
  { id: "data-code-block--line-numbers" },
  { id: "data-diff-viewer--split" },
  // Feedback
  { id: "feedback-alert--variants" },
  { id: "feedback-progress--tones" },
  { id: "feedback-meter--with-threshold" },
  { id: "feedback-empty-state--no-results" },
  { id: "feedback-skeleton--loading-card" },
  // AI
  { id: "ai-message--roles" },
  { id: "ai-prompt-input--with-model-and-counter" },
  { id: "ai-tool-call--statuses" },
  { id: "ai-approval-request--default" },
  { id: "ai-token-usage--thresholds" },
  { id: "ai-agent-plan--default" },
  // Navigation
  { id: "navigation-tabs--default" },
  // Blocks
  { id: "blocks-login--default", block: true },
  { id: "blocks-pricing-three-tier--default", block: true },
  { id: "blocks-settings--default", block: true },
  { id: "blocks-faq-accordion--default", block: true },
  { id: "blocks-stats-grid--default", block: true },
];

/** Any fixed instant will do; this one is a weekday mid-month. */
const NOW = new Date("2026-03-11T10:00:00Z");

const IN_CONTAINER =
  process.platform === "linux" && process.env.PLAYWRIGHT_BROWSERS_PATH === "/ms-playwright";

test.describe.configure({ mode: "parallel" });

test.beforeAll(() => {
  // Font rendering differs between operating systems, and between a Mac's
  // Chromium and Linux's. A baseline written anywhere else would fail in CI
  // for reasons that are not regressions, so this refuses to run at all.
  if (!IN_CONTAINER) {
    throw new Error(
      "Screenshots are only compared inside the Playwright container. Run `pnpm --filter @dowel-ui/browser-tests test:visual:docker` (or `test:visual:update` to write baselines).",
    );
  }
});

test("every story on the list exists", () => {
  const ids = new Set(readStories().map((story) => story.id));
  const missing = VISUAL_STORIES.filter((story) => !ids.has(story.id)).map((story) => story.id);
  expect(missing, "Renamed or removed — update VISUAL_STORIES").toEqual([]);
});

async function prepare(page: Page): Promise<string[]> {
  await installStillness(page);
  await page.clock.setFixedTime(NOW);
  await page.addInitScript(() => {
    // mulberry32: small, fast, and the same sequence on every run.
    let seed = 0x2f6b_7a3d;
    Math.random = () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = seed;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
    };
  });

  const external: string[] = [];
  await page.route("**/*", async (route) => {
    const { hostname } = new URL(route.request().url());
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      await route.continue();
    } else {
      external.push(route.request().url());
      await route.abort();
    }
  });
  return external;
}

for (const story of VISUAL_STORIES) {
  for (const theme of THEMES) {
    for (const direction of DIRECTIONS) {
      const name = `${story.id}--${theme}-${direction}`;
      const tags = story.block ? ["@block"] : [];

      // Every story on the desktop project; blocks again on the mobile one,
      // which selects them by the @block tag.
      test(name, { tag: tags }, async ({ page }) => {
        const external = await prepare(page);
        await openStory(page, story.id, theme, direction);

        if (story.open) {
          const trigger = page.locator("#storybook-root button").first();
          if (story.open.by === "click") await trigger.click();
          else await trigger.hover();
          await page.locator(story.open.reveals).first().waitFor({ state: "visible" });
          // Moves the pointer off the trigger, so a hover style is not part of
          // the picture — except for the tooltip, which needs it.
          if (story.open.by === "click") await page.mouse.move(0, 0);
          await settle(page);
        }

        expect(external, "The story fetched from outside Storybook; bundle the asset").toEqual(
          [],
        );
        await expect(page).toHaveScreenshot(`${name}.png`, { fullPage: story.block === true });
      });
    }
  }
}
