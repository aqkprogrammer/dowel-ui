import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "horizontal-scroll",
  title: "Horizontal Scroll",
  description:
    "A section that pins to the screen while its row of items slides sideways as the page scrolls down — driven by the page's own scroll, never taking it over.",
  category: "effects",
  status: "beta",
  dependencies: [],
  registryDependencies: ["use-reduced-motion"],
  files: ["horizontal-scroll.tsx"],
  a11y:
    "A labelled region. Nothing listens to the wheel or takes over scrolling: the page scrolls vertically as " +
    "always, and the row's offset is read from it. On the server, without JavaScript, under reduced motion or " +
    "with pin={false} it is a plain horizontal scroller, focusable so the keyboard can scroll it. Pinned, " +
    "focusing an item that is off to the side scrolls the page to the point where it is in view, so tabbing " +
    "through the items always shows the one in focus.",
  guidance: {
    useWhen: [
      "a showcase of projects, case studies or product shots on a marketing page",
      "a timeline told left to right as the reader scrolls",
    ],
    avoidWhen: [
      "a row the reader steps through on demand — use carousel",
      "application screens, where pinning gets in the way",
    ],
    alternatives: ["carousel", "marquee", "stacking-cards"],
  },
  composesWith: ["card", "scroll-reveal"],
  controls: {
    gap: { min: 0, max: 96, step: 4 },
  },
});
