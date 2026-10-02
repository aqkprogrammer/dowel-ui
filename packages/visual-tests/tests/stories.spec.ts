import { existsSync } from "node:fs";

import { expect, test, type Page } from "@playwright/test";

import { exclusionFor } from "../exclusions";
import { snapshotPath } from "../paths";
import { readManifest, readStories } from "../stories";

/**
 * One test per story in the build: open it alone, pin down everything that
 * moves, screenshot the viewport.
 *
 * The viewport and not the story root, because dialogs, popovers, menus and
 * toasts render in portals outside it.
 */

/** The moment every story is rendered at. A weekday, mid-morning, mid-month. */
const NOW = new Date("2026-01-14T10:30:00Z");

/**
 * How long before NOW the clock starts. It is stopped by moving it forward to
 * NOW, so this is also what `performance.now()` reads when the story mounts.
 */
const LEAD_MS = 60_000;

/**
 * How much of the page's own time passes between the story mounting and the
 * screenshot. The clock is stopped for the whole test and moved by exactly
 * this much, so a timer either has fired or has not, the same way every run:
 * enough for a debounce, an entrance or a simulated load to finish, not so
 * much that a toast has already dismissed itself.
 */
const SETTLE_MS = 2_000;

/**
 * The clock moves in steps of this size, and after each one the page gets to
 * finish what the step started. Moved in one go, every timer in the range
 * fires with barely a pause between them, and whether React has rendered and
 * re-armed a timer in that pause is down to the machine: a streamed reply
 * came out three characters longer on one run than the next. In steps shorter
 * than any timer the stories chain, each one fires, the page settles, and
 * only then does the next come due.
 */
const STEP_MS = 10;

/**
 * How often, in the page's time, the browser is also given real frames. What
 * the clock cannot hold back (a ResizeObserver, an IntersectionObserver, an
 * image decode) answers with a frame, and often by asking for an animation
 * frame of its own, which only a later step delivers. Without this, a canvas
 * that was resized just after the clock had stopped stayed blank about half
 * the time.
 */
const FRAMES_EVERY_MS = 500;

/**
 * After the settle time, two more rounds of real frames and this much time, to
 * deliver the animation frames that the last renders and observers asked for.
 * Short, and off the round numbers on purpose, so that no interval fires in
 * them and starts something new.
 */
const FLUSH_MS = 20;

/**
 * A play function that types or waits is waiting on timers too. While one is
 * running, the clock is moved on in steps of this size until it finishes.
 */
const PLAY_STEP_MS = 100;

/** Storybook's render phases from the point where the story is on the page. */
const RENDERED = ["completing", "completed", "afterEach", "finished"];

const manifest = readManifest();
const inBaselineBuild = new Set(manifest?.stories);

for (const story of readStories()) {
  const title = `${story.title} / ${story.name}`;
  const excluded = exclusionFor(story);

  if (excluded) {
    test.skip(
      title,
      {
        annotation: [
          { type: "story", description: story.id },
          { type: "excluded", description: excluded.reason },
        ],
      },
      () => {},
    );
    continue;
  }

  test(
    title,
    { annotation: { type: "story", description: story.id } },
    async ({ page }, info) => {
      const capturing = info.config.updateSnapshots !== "none";
      const hasBaseline = existsSync(snapshotPath(story.id));

      // In the baseline build, but with no image: it was excluded or failed to
      // capture when the baseline was taken. There is nothing to compare
      // against, and if it is broken, it was broken before this change.
      if (!capturing && !hasBaseline && inBaselineBuild.has(story.id)) {
        info.annotations.push({
          type: "not compared",
          description: "The baseline has no image for this story.",
        });
        return;
      }

      await pinDown(page);
      // The accessibility addon checks every story it renders, and its contrast
      // check scrolls elements into view while it works. `manual` turns it off.
      await page.goto(`/iframe.html?id=${story.id}&viewMode=story&globals=a11y.manual:!true`);
      await rendered(page);
      await loaded(page);
      await settle(page);
      await loaded(page);
      await still(page);

      // Not in the baseline build: a story this change adds. A broken one has
      // failed by now; one that renders is recorded, with its screenshot in the
      // report, and passes.
      if (!capturing && !hasBaseline) {
        info.annotations.push({ type: "new", description: "Not in the baseline build." });
        await info.attach(`${story.id}.png`, {
          body: await page.screenshot({ animations: "disabled", caret: "hide", scale: "css" }),
          contentType: "image/png",
        });
        return;
      }

      await expect(page).toHaveScreenshot(`${story.id}.png`);
    },
  );
}

/**
 * Takes away what a story can read that differs between two runs: the time,
 * randomness, the network, and how far a CSS animation has got.
 */
async function pinDown(page: Page): Promise<void> {
  // Stopped before any of the page's scripts run, so `Date`,
  // `performance.now()`, timers and `requestAnimationFrame` all start from the
  // same instant and only advance when the test says so.
  //
  // `page.clock.pauseAt` before the navigation would be the obvious way, and
  // it does pin `Date`. It does not pin `performance.now()`: in a new document
  // Playwright replays its clock calls, and what that leaves depends on how
  // many milliseconds passed between them and on how long the page took to
  // first look at the time. Animation frames are aligned to that number, so a
  // progress bar driven by them ended a fraction of a pixel differently from
  // run to run. Stopping the clock from inside the document, before anything
  // else runs, moves both readings together: `performance.now()` is LEAD_MS,
  // exactly. This reaches the same object as in `settle`, and is not public
  // API either.
  await page.clock.install({ time: new Date(NOW.getTime() - LEAD_MS) });
  await page.addInitScript((now) => {
    const clock = (
      globalThis as { __pwClock?: { controller?: { pauseAt(time: number): Promise<number> } } }
    ).__pwClock?.controller;
    void clock?.pauseAt(now);
  }, NOW.getTime());

  // The same sequence of "random" numbers on every load (mulberry32).
  await page.addInitScript(() => {
    let state = 0x2f6e2b1;
    Math.random = () => {
      state = (state + 0x6d2b79f5) | 0;
      let t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  });

  // Every CSS animation is over before it is first drawn. With reduced motion
  // the library already cuts its durations to almost nothing, but it keeps
  // the delays, and those run in real time: a staggered loader was caught
  // with a different dot mid-flash on every load. A negative delay starts an
  // animation past its end, so the first frame shows its last keyframe if it
  // fills forwards and the element's own style if it does not, and the
  // browser never draws the element part-way, which it would otherwise keep
  // re-using. `animationstart` and `animationend` still fire. Transitions keep
  // a duration, because code that waits for `transitionend` needs one to run.
  await page.addInitScript(() => {
    const style = document.createElement("style");
    style.textContent =
      "*,*::before,*::after{animation-delay:-1s!important;animation-duration:.01ms!important;" +
      "animation-iteration-count:1!important;transition-delay:0s!important;transition-duration:.01ms!important}";
    const add = () => document.documentElement.append(style);
    if (document.documentElement) add();
    else {
      const observer = new MutationObserver(() => {
        if (!document.documentElement) return;
        observer.disconnect();
        add();
      });
      observer.observe(document, { childList: true });
    }
  });

  // Nothing leaves the machine. An image from another host (the stories use
  // picsum.photos for photographs) becomes a flat placeholder of the size the
  // URL asks for; anything else is refused.
  await page.route(
    (url) => url.hostname !== "localhost",
    (route) => {
      const request = route.request();
      if (request.resourceType() !== "image") return route.abort();
      return route.fulfill({
        contentType: "image/svg+xml",
        headers: { "access-control-allow-origin": "*" },
        body: placeholder(request.url()),
      });
    },
  );
}

/** A grey rectangle with a diagonal, sized from the last two numbers in the URL. */
function placeholder(url: string): string {
  const numbers = new URL(url).pathname.split("/").filter((part) => /^\d+$/.test(part));
  const width = numbers.at(-2) ?? numbers.at(-1) ?? "400";
  const height = numbers.at(-1) ?? "300";
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">` +
    `<rect width="100%" height="100%" fill="#9ca3af"/>` +
    `<path d="M0 0L${width} ${height}" stroke="#4b5563" stroke-width="2"/>` +
    `</svg>`
  );
}

type StoryState = "loading" | "playing" | "rendered" | "failed";

/**
 * Where Storybook has got to, once that is something other than `unless`.
 * Given a `timeout`, gives up after that long and answers `unless`.
 */
async function storyState(
  page: Page,
  unless: StoryState,
  timeout?: number,
): Promise<StoryState> {
  try {
    const state = await page.waitForFunction(
      ([phases, skip]) => {
        const body = document.body.classList;
        let state = "loading";
        if (body.contains("sb-show-errordisplay") || body.contains("sb-show-nopreview")) {
          state = "failed";
        } else if (body.contains("sb-show-main")) {
          const preview = (
            window as { __STORYBOOK_PREVIEW__?: { currentRender?: { phase?: string } } }
          ).__STORYBOOK_PREVIEW__;
          const phase = preview?.currentRender?.phase;
          if (phase === "playing") state = "playing";
          else if (phase === undefined || phases.includes(phase)) state = "rendered";
        }
        return state === skip ? false : state;
      },
      [RENDERED, unless] as const,
      timeout === undefined ? undefined : { timeout },
    );
    return (await state.jsonValue()) as StoryState;
  } catch (error) {
    if (timeout === undefined) throw error;
    return unless;
  }
}

/** Waits for Storybook to put the story on the page, and fails if it could not. */
async function rendered(page: Page): Promise<void> {
  let state = await storyState(page, "loading");

  // After rendering, Storybook runs the play function. One that needs no
  // timers finishes on its own, so it gets a moment before the clock moves.
  for (let patience = 250; state === "playing"; patience = 25) {
    state = await storyState(page, "playing", patience);
    if (state === "playing") await page.clock.runFor(PLAY_STEP_MS);
  }

  if (state === "failed") {
    const message = await page.evaluate(() =>
      document.body.classList.contains("sb-show-nopreview")
        ? "Storybook has no story with this id."
        : (document.querySelector(".sb-errordisplay")?.textContent.trim() ??
          "The story threw."),
    );
    throw new Error(`The story did not render: ${message}`);
  }
}

/**
 * Moves the stopped clock on by SETTLE_MS, a step at a time, letting the page
 * come to rest after each.
 *
 * This runs inside the page and drives Playwright's clock from there, through
 * the same object `page.clock.runFor` talks to. That object is not public API.
 * The public call makes two trips to the browser each time: twenty of them
 * took a few hundred milliseconds per story, and this needs two hundred.
 * `@playwright/test` is pinned; if an upgrade moves the clock, this fails on
 * the first story and says so.
 */
async function settle(page: Page): Promise<void> {
  await page.evaluate(
    async ({ settleMs, stepMs, framesEveryMs, flushMs }) => {
      const clock = (
        globalThis as { __pwClock?: { controller?: { runFor(ms: number): Promise<void> } } }
      ).__pwClock?.controller;
      if (!clock) {
        throw new Error(
          "Playwright's page clock is not at __pwClock.controller. It is not public API: see settle() in packages/visual-tests/tests/stories.spec.ts.",
        );
      }

      let changed = false;
      const observer = new MutationObserver(() => {
        changed = true;
      });
      observer.observe(document, {
        subtree: true,
        childList: true,
        attributes: true,
        characterData: true,
      });

      // A message posted now is handled after the tasks already queued.
      const turn = () =>
        new Promise<void>((resolve) => {
          const channel = new MessageChannel();
          channel.port1.onmessage = () => {
            channel.port1.close();
            resolve();
          };
          channel.port2.postMessage(null);
        });

      // React renders a state change in one task and runs the effects in a
      // later one, which may set state again. The page is at rest once the
      // document has gone three turns without changing.
      const rest = async () => {
        for (let turns = 0, unchanged = 0; turns < 100 && unchanged < 3; turns += 1) {
          await turn();
          unchanged = changed ? 0 : unchanged + 1;
          changed = false;
        }
      };

      // `requestAnimationFrame` belongs to the stopped clock. A ResizeObserver
      // does not: its first callback comes with the next frame really drawn.
      const frame = () =>
        new Promise<void>((resolve) => {
          const resized = new ResizeObserver(() => {
            resized.disconnect();
            resolve();
          });
          resized.observe(document.documentElement);
        });
      const frames = async () => {
        await frame();
        await frame();
        await rest();
      };

      for (let elapsed = 0; elapsed < settleMs; elapsed += stepMs) {
        if (elapsed % framesEveryMs === 0) await frames();
        await clock.runFor(stepMs);
        await rest();
      }
      for (let round = 0; round < 2; round += 1) {
        await frames();
        await clock.runFor(flushMs);
        await rest();
      }
      await frames();
      observer.disconnect();
    },
    {
      settleMs: SETTLE_MS,
      stepMs: STEP_MS,
      framesEveryMs: FRAMES_EVERY_MS,
      flushMs: FLUSH_MS,
    },
  );
}

/** Waits for fonts and images, which load in real time whatever the clock says. */
async function loaded(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      [...document.images]
        .filter((image) => image.loading !== "lazy" || image.complete)
        .map((image) => image.decode().catch(() => undefined)),
    );
  });
}

/**
 * Ends what is left of any animation for good, then waits two frames.
 *
 * CSS animations are over already (see `pinDown`). What is left is a
 * transition a late state change started, or an animation a script began
 * through the Web Animations API, which runs in real time. A finite one jumps
 * to its last frame and an endless one goes back to its first, which is what
 * Playwright's `animations: "disabled"` does around each screenshot. The
 * difference is that this does not start them again afterwards, and writes a
 * held last frame into the element's own style: an element that is still
 * animated keeps the pixels it was drawn with part-way, and came out slightly
 * different from one run to the next.
 */
async function still(page: Page): Promise<void> {
  await page.evaluate(async () => {
    for (const animation of document.getAnimations()) {
      const end = animation.effect?.getComputedTiming().endTime;
      if (typeof end !== "number" || !Number.isFinite(end)) {
        animation.cancel();
        continue;
      }
      animation.finish();
      try {
        animation.commitStyles();
        animation.cancel();
      } catch {
        // A pseudo-element has no style attribute to write to. Left finished.
      }
    }
    for (let frame = 0; frame < 2; frame += 1) {
      await new Promise<void>((resolve) => {
        const resized = new ResizeObserver(() => {
          resized.disconnect();
          resolve();
        });
        resized.observe(document.documentElement);
      });
    }
  });
}
