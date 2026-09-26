import { test, type Page } from "@playwright/test";

import {
  pauseStopsTheResponseAndResumeCarriesOn,
  readsWholeSentencesInOrder,
  type Listener,
} from "./stream-announcer.scenarios";

/**
 * The scenarios against a perfect listener — one that "hears" exactly what is
 * put in the live region, the moment it is put there. It proves the harness
 * itself: the story's selectors, the waiting, the assertions. When a real
 * screen reader then fails a scenario, the failure is about the screen reader,
 * not the test.
 *
 * Runs anywhere, headless: `pnpm test:harness`.
 */
type Ear = Window & { heard?: string[]; ear?: MutationObserver };

function perfectListener(page: Page): Listener {
  return {
    navigateToWebContent: () => Promise.resolve(),
    overhear: async () => {
      await page.evaluate(() => {
        const self = window as Ear;
        const region = document.querySelector("[data-slot='stream-announcer-region']");
        if (!region) throw new Error("The story has no live region.");
        const heard: string[] = [];
        self.heard = heard;
        self.ear?.disconnect();
        self.ear = new MutationObserver((records) => {
          for (const record of records) {
            for (const node of record.addedNodes) {
              const text = node.textContent?.trim();
              if (text) heard.push(text);
            }
          }
        });
        self.ear.observe(region, { childList: true });
      });
      return {
        heard: () => page.evaluate(() => [...((window as Ear).heard ?? [])]),
        stop: () =>
          page.evaluate(() => {
            (window as Ear).ear?.disconnect();
          }),
      };
    },
  };
}

test.describe("stream-announcer harness", () => {
  test("speaks each sentence whole, once, in order", async ({ page }) => {
    await readsWholeSentencesInOrder(page, perfectListener(page));
  });

  test("Pause stops the response, Resume carries on", async ({ page }) => {
    await pauseStopsTheResponseAndResumeCarriesOn(page, perfectListener(page));
  });
});
