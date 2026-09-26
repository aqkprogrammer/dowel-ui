import { nvdaTest as test } from "@guidepup/playwright";

import { overhearNVDA } from "./overhear";
import {
  pauseStopsTheResponseAndResumeCarriesOn,
  readsWholeSentencesInOrder,
  type Listener,
} from "./stream-announcer.scenarios";

function listener(reader: Pick<Listener, "navigateToWebContent">): Listener {
  return {
    navigateToWebContent: () => reader.navigateToWebContent(),
    overhear: () => overhearNVDA(),
  };
}

test.describe("stream-announcer with NVDA", () => {
  test("speaks each sentence whole, once, in order", async ({ page, nvda }) => {
    await readsWholeSentencesInOrder(page, listener(nvda));
  });

  test("Pause stops the response, Resume carries on", async ({ page, nvda }) => {
    await pauseStopsTheResponseAndResumeCarriesOn(page, listener(nvda));
  });
});
