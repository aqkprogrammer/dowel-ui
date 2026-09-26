import { voiceOverTest as test } from "@guidepup/playwright";

import { overhearVoiceOver } from "./overhear";
import {
  pauseStopsTheResponseAndResumeCarriesOn,
  readsWholeSentencesInOrder,
  type Listener,
} from "./stream-announcer.scenarios";

function listener(reader: Pick<Listener, "navigateToWebContent">): Listener {
  return {
    navigateToWebContent: () => reader.navigateToWebContent(),
    overhear: () => overhearVoiceOver(),
  };
}

test.describe("stream-announcer with VoiceOver", () => {
  test("speaks each sentence whole, once, in order", async ({ page, voiceOver }) => {
    await readsWholeSentencesInOrder(page, listener(voiceOver));
  });

  test("Pause stops the response, Resume carries on", async ({ page, voiceOver }) => {
    await pauseStopsTheResponseAndResumeCarriesOn(page, listener(voiceOver));
  });
});
