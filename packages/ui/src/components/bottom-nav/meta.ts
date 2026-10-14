import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "bottom-nav",
  title: "Bottom Nav",
  description:
    "A tab bar for phones: the app's top destinations along the bottom of the screen, icon over label, the current one lit, with badges.",
  category: "navigation",
  status: "beta",
  dependencies: ["class-variance-authority", "radix-ui"],
  registryDependencies: [],
  files: ["bottom-nav.tsx"],
  a11y:
    "A labelled nav landmark of links. Every item has a visible text label — icons alone are guesswork — and the " +
    'icon is decorative. The current page is marked aria-current="page", not by colour alone. A badge\'s count ' +
    'is spoken after the label ("Inbox, 3 new"). Targets fill the bar\'s height, well over the 24px minimum. ' +
    "It clears the home indicator with safe-area padding; give the page bottom padding so it hides nothing.",
  guidance: {
    useWhen: [
      "the primary navigation of a mobile web app with three to five destinations",
      "a PWA that should feel at home on a phone",
    ],
    avoidWhen: [
      "more than five destinations — use sidebar or a menu",
      "desktop layouts — it hides from md up by default; use sidebar or navbar",
    ],
    alternatives: ["sidebar", "rail-nav", "navbar"],
  },
  composesWith: ["notification-badge"],
});
