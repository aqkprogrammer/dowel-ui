import { nvdaTest as test } from "@guidepup/playwright";

import {
  pauseStopsTheResponseAndResumeCarriesOn,
  readsWholeSentencesInOrder,
} from "./stream-announcer.scenarios";

test.describe("stream-announcer with NVDA", () => {
  test("speaks each sentence whole, once, in order", async ({ page, nvda }) => {
    await readsWholeSentencesInOrder(page, nvda);
  });

  test("Pause stops the response, Resume carries on", async ({ page, nvda }) => {
    await pauseStopsTheResponseAndResumeCarriesOn(page, nvda);
  });
});
