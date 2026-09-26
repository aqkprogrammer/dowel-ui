import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * What `stream-announcer` promises a screen reader user, checked against a
 * real screen reader. The same scenarios run under VoiceOver and NVDA.
 *
 * The component's own tests prove what it puts in its live region. These
 * prove what a person actually hears: that every sentence handed over is
 * spoken, whole, once and in order; that Pause stops speech of the response
 * rather than only the queue; and that Resume carries on.
 */

/** The parts of Guidepup's VoiceOver and NVDA this needs. */
export interface Listener {
  navigateToWebContent: () => Promise<void>;
  lastSpokenPhrase: () => Promise<string>;
  spokenPhraseLog: () => Promise<string[]>;
}

const STORY = "/iframe.html?id=ai-stream-announcer--default&viewMode=story";

/** Case, punctuation and spacing differ between what is written and spoken. */
export function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * Collects what the screen reader says while nothing is being commanded.
 *
 * A screen reader's log is built from its responses to commands; a live
 * region speaks between them. So the last spoken phrase is polled as well,
 * and the two are merged, keeping order and dropping repeats of a phrase that
 * was simply read twice by the poll.
 */
async function listen(
  reader: Listener,
  done: () => Promise<boolean>,
  { graceMs = 8_000, timeoutMs = 150_000 } = {},
): Promise<string[]> {
  const heard: string[] = [];
  const started = Date.now();
  let finishedAt: number | null = null;
  while (Date.now() - started < timeoutMs) {
    const phrase = await reader.lastSpokenPhrase();
    if (phrase && phrase !== heard.at(-1)) heard.push(phrase);
    if (finishedAt === null && (await done())) finishedAt = Date.now();
    if (finishedAt !== null && Date.now() - finishedAt > graceMs) break;
    await wait(150);
  }
  for (const phrase of await reader.spokenPhraseLog()) {
    if (!heard.includes(phrase)) heard.push(phrase);
  }
  return heard;
}

async function open(page: Page, reader: Listener) {
  await page.goto(STORY, { waitUntil: "load" });
  // The button reads "Streaming…" while it streams: match both, or every check
  // made mid-stream waits for a button that has been renamed.
  const stream = page.getByRole("button", { name: /^Stream/ });
  await stream.waitFor();
  await reader.navigateToWebContent();
  return {
    stream,
    handed: page.getByRole("region", { name: "Announcements" }).getByRole("listitem"),
    screen: page.getByRole("region", { name: "Response" }),
  };
}

/** The response is finished and nothing is left in the announcer's queue. */
async function drained(stream: Locator, page: Page): Promise<boolean> {
  const streaming = !(await stream.isEnabled());
  const skip = page.getByRole("button", { name: /^Skip/ });
  return !streaming && (await skip.textContent()) === "Skip to latest";
}

function spokenFromAnswer(phrase: string, answer: string): boolean {
  const said = normalise(phrase);
  return said.length >= 12 && answer.includes(said);
}

export async function readsWholeSentencesInOrder(page: Page, reader: Listener) {
  const { stream, handed, screen } = await open(page, reader);
  await stream.click();

  const phrases = await listen(reader, () => drained(stream, page));
  const chunks = await handed.allTextContents();
  const answer = normalise((await screen.textContent()) ?? "");
  await test.info().attach("spoken", {
    body: JSON.stringify({ chunks, phrases }, null, 2),
    contentType: "application/json",
  });

  expect(chunks.length, "the story handed nothing to the screen reader").toBeGreaterThan(3);

  // Every chunk handed over is spoken, in the order it was handed over.
  let cursor = 0;
  for (const chunk of chunks) {
    const index = phrases.findIndex(
      (phrase, position) => position >= cursor && normalise(phrase).includes(normalise(chunk)),
    );
    expect(index, `handed over but never spoken: "${chunk}"`).toBeGreaterThanOrEqual(0);
    cursor = index;
  }

  // Nothing is spoken twice.
  for (const chunk of chunks) {
    const times = phrases.filter((phrase) =>
      normalise(phrase).includes(normalise(chunk)),
    ).length;
    expect(times, `spoken ${String(times)} times: "${chunk}"`).toBeLessThanOrEqual(1);
  }

  // No fragment: anything spoken from the answer is at least one whole chunk.
  for (const phrase of phrases.filter((candidate) => spokenFromAnswer(candidate, answer))) {
    const whole = chunks.some((chunk) => normalise(phrase).includes(normalise(chunk)));
    expect(whole, `spoken as a fragment: "${phrase}"`).toBe(true);
  }
}

export async function pauseStopsTheResponseAndResumeCarriesOn(page: Page, reader: Listener) {
  const { stream, handed, screen } = await open(page, reader);
  await stream.click();
  await expect(handed).toHaveCount(1, { timeout: 20_000 });

  await page.getByRole("button", { name: "Pause reading" }).click();
  const paused = await handed.allTextContents();
  const during = await listen(reader, () => Promise.resolve(true), { graceMs: 6_000 });
  const answer = normalise((await screen.textContent()) ?? "");

  const unhanded = during.filter(
    (phrase) =>
      spokenFromAnswer(phrase, answer) &&
      !paused.some((chunk) => normalise(phrase).includes(normalise(chunk))),
  );
  expect(unhanded, "response text was spoken while paused").toEqual([]);
  await expect(handed).toHaveCount(paused.length);

  await page.getByRole("button", { name: "Resume reading" }).click();
  const after = await listen(reader, async () => (await handed.count()) > paused.length, {
    graceMs: 5_000,
    timeoutMs: 30_000,
  });
  const next = (await handed.allTextContents())[paused.length] ?? "";
  await test.info().attach("spoken", {
    body: JSON.stringify({ paused, during, next, after }, null, 2),
    contentType: "application/json",
  });
  expect(
    after.some((phrase) => normalise(phrase).includes(normalise(next))),
    `not spoken after resuming: "${next}"`,
  ).toBe(true);
}
