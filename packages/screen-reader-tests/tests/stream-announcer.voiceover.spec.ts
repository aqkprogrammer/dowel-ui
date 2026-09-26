import { voiceOverTest as test } from "@guidepup/playwright";

import {
  pauseStopsTheResponseAndResumeCarriesOn,
  readsWholeSentencesInOrder,
} from "./stream-announcer.scenarios";

test.describe("stream-announcer with VoiceOver", () => {
  test("speaks each sentence whole, once, in order", async ({ page, voiceOver }) => {
    await readsWholeSentencesInOrder(page, voiceOver);
  });

  test("Pause stops the response, Resume carries on", async ({ page, voiceOver }) => {
    await pauseStopsTheResponseAndResumeCarriesOn(page, voiceOver);
  });
});
