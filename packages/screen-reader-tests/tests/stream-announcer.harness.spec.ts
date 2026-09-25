import { test, type Page } from "@playwright/test";

import {
  pauseStopsTheResponseAndResumeCarriesOn,
  readsWholeSentencesInOrder,
  type Listener,
} from "./stream-announcer.scenarios";

/**
 * The scenarios against a perfect listener — one that "hears" exactly what is
 * put in the live region. It proves the harness itself: the story's selectors,
 * the waiting, the assertions. When a real screen reader then fails a
 * scenario, the failure is about the screen reader, not the test.
 *
 * Runs anywhere, headless: `pnpm test:harness`.
 */
function perfectListener(page: Page): Listener {
  const region = page.locator("[data-slot='stream-announcer-region'] > *");
  const said: string[] = [];
  return {
    navigateToWebContent: () => Promise.resolve(),
    lastSpokenPhrase: async () => {
      const last =
        (await region
          .last()
          .textContent({ timeout: 100 })
          .catch(() => null)) ?? "";
      if (last && last !== said.at(-1)) said.push(last);
      return last;
    },
    spokenPhraseLog: () => Promise.resolve([...said]),
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
