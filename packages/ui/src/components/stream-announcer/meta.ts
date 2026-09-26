import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "stream-announcer",
  title: "Stream Announcer",
  description:
    "Lets a screen reader user hear a streaming response as it arrives — whole sentences only, with pause, skip and repeat.",
  category: "ai",
  status: "beta",
  dependencies: [],
  registryDependencies: [],
  files: ["stream-announcer.tsx", "speakable.ts"],
  a11y:
    "Off by default and switched on by a toggle button whose pressed state is announced: hearing a response " +
    "as it forms is the listener's choice, and ai-conversation's state-only announcements stay the default. " +
    "Once on, only complete sentences are announced — the last one is held until the next begins or the " +
    "stream ends, so a number or a word is never read half-formed. Markdown is read as prose: formatting " +
    "marks are dropped, links keep their text, and a code block is summarised as its language and line " +
    "count, since the block itself is there to navigate to. Announcements are paced against an estimated " +
    "speech rate (`wordsPerMinute`) so the backlog stays in the page, where Pause, Skip and Repeat can reach " +
    "it, instead of in the screen reader's queue, where nothing can. The region is a plain polite live region " +
    "present from first paint that only gains nodes — not role=status, which is atomic and would re-read " +
    "everything, and not role=log, which would add a second transcript to navigate. Skip states how many " +
    "sentences it will drop in its accessible name, and says how many it dropped.",
});
