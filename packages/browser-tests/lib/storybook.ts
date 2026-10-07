/**
 * Opening one story in a state that can be judged.
 *
 * Both suites — axe over every story, screenshots of a few — need the same
 * thing first: the story rendered, the colour mode and direction actually
 * applied, the fonts in, and every animation finished. A check that runs a
 * frame early judges a dialog at 40% opacity, which fails contrast for a
 * reason that has nothing to do with the dialog.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import type { Page } from "@playwright/test";

/** The same folder the server serves (see serve-storybook.ts). */
export const STATIC_DIR =
  process.env.STORYBOOK_STATIC_DIR ??
  join(import.meta.dirname, "..", "..", "ui", "storybook-static");

export type Theme = "light" | "dark";
export type Direction = "ltr" | "rtl";

export const THEMES: readonly Theme[] = ["light", "dark"];
export const DIRECTIONS: readonly Direction[] = ["ltr", "rtl"];

export interface Story {
  id: string;
  title: string;
  name: string;
}

interface IndexEntry extends Story {
  type: "story" | "docs";
}

/**
 * Every story in the build, from the index Storybook writes alongside it — so
 * a new story is checked the day it is written, with nothing to register.
 */
export function readStories(): Story[] {
  const indexPath = join(STATIC_DIR, "index.json");
  if (!existsSync(indexPath)) {
    throw new Error(
      `No Storybook build at ${STATIC_DIR}. Run \`pnpm build-storybook\` from the repository root first.`,
    );
  }
  const index = JSON.parse(readFileSync(indexPath, "utf8")) as {
    entries: Record<string, IndexEntry>;
  };
  return Object.values(index.entries)
    .filter((entry) => entry.type === "story")
    .map(({ id, title, name }) => ({ id, title, name }));
}

/**
 * The story's own frame, with the toolbar's globals set from the URL — the
 * same decorator a person switching the toolbar runs, rather than a class
 * poked onto `<html>` that the decorator would take off again on its next
 * render.
 */
export function storyUrl(id: string, theme: Theme, direction: Direction): string {
  return `/iframe.html?id=${encodeURIComponent(id)}&viewMode=story&globals=colorMode:${theme};direction:${direction}`;
}

/**
 * Stops motion at the source as well as through the media query.
 *
 * `prefers-reduced-motion: reduce` (set on the browser context) already
 * collapses every non-indicator animation to 0.01 ms in base.css, and sets
 * `--motion-scale` to 0.001 rather than 0 so overlays still get the
 * `animationend` they wait on to unmount. Nothing here closes an overlay, so 0
 * is safe, and it also stops the indicators — a spinner part-way round is a
 * different picture on every run. A JavaScript animation reading the scale
 * stops too.
 */
const STILL = `:root {
  --motion-scale: 0 !important;
  --motion-scale-indicator: 0 !important;
}`;

export async function installStillness(page: Page): Promise<void> {
  await page.addInitScript((css) => {
    document.addEventListener("DOMContentLoaded", () => {
      const style = document.createElement("style");
      style.dataset.browserTests = "still";
      style.textContent = css;
      document.head.append(style);
    });
  }, STILL);
}

interface StoryRender {
  id: string;
  phase?: string;
}

type PreviewWindow = Window & {
  __STORYBOOK_PREVIEW__?: { storyRenders?: StoryRender[] };
};

/** Phases a story render ends in. Anything else is still loading or playing. */
const SETTLED_PHASES = ["finished", "errored", "aborted"];

export class StoryRenderError extends Error {}

/**
 * Opens a story and waits until it is something to judge: rendered (play
 * function included), themed, directed, fonts loaded, finite animations done.
 * A story that throws is an error here, not an empty page that passes.
 */
export async function openStory(
  page: Page,
  id: string,
  theme: Theme,
  direction: Direction,
): Promise<void> {
  await page.goto(storyUrl(id, theme, direction));

  await page.waitForFunction(
    ({ id, settled }) => {
      if (document.body.classList.contains("sb-show-errordisplay")) return true;
      const renders = (window as PreviewWindow).__STORYBOOK_PREVIEW__?.storyRenders ?? [];
      const render = renders.find((candidate) => candidate.id === id);
      return render?.phase !== undefined && settled.includes(render.phase);
    },
    { id, settled: SETTLED_PHASES },
  );

  const failure = await page.evaluate(() => {
    if (!document.body.classList.contains("sb-show-errordisplay")) return null;
    const message = document.querySelector("#error-message")?.textContent ?? "";
    const stack = document.querySelector("#error-stack")?.textContent ?? "";
    return `${message}\n${stack}`.trim();
  });
  if (failure !== null) {
    throw new StoryRenderError(`The story did not render:\n${failure}`);
  }

  // The decorator applies these in an effect, after the story's own render.
  // Waited for rather than assumed: a dark run that silently rendered light
  // would pass contrast on the wrong palette.
  await page.waitForFunction(
    ({ dark, direction }) =>
      document.documentElement.classList.contains("dark") === dark &&
      document.documentElement.getAttribute("dir") === direction,
    { dark: theme === "dark", direction },
  );

  await settle(page);
}

/**
 * Waits for fonts, then for every finite animation, then for two frames. Also
 * run after anything that changes the page, such as opening an overlay.
 */
export async function settle(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready;

    // Finite animations are done in 0.01 ms under reduced motion; waiting on
    // them rather than on a timer means a slow machine is not a different
    // result. Bounded, because a paused animation never finishes.
    const finite = document
      .getAnimations()
      .filter((animation) => animation.effect?.getComputedTiming().iterations !== Infinity);
    await Promise.race([
      Promise.allSettled(finite.map((animation) => animation.finished)),
      new Promise((resolve) => setTimeout(resolve, 2_000)),
    ]);

    // Two frames: one for any state set when the animations ended, one for it
    // to paint.
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}
