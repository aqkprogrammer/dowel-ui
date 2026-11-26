import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "magnetic-orb",
  title: "Magnetic Orb",
  description:
    "A round arrow button pulled toward the pointer on a spring, glowing in the accent colour as it is approached.",
  category: "effects",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: ["magnetic-orb.tsx"],
  a11y:
    "A native <button>, so Enter and Space activate it and it shows the shared focus ring. It is icon-only: its name " +
    'defaults to "Continue" and should be set with aria-label to say where it goes. The arrow is aria-hidden and mirrors ' +
    "in right-to-left layouts. The magnetic pull is pointer-only decoration: it is skipped for touch and pen input and " +
    "under reduced motion, and the colour change also appears on keyboard focus so it never depends on a mouse.",
  guidance: {
    useWhen: [
      "a single playful primary action, such as next or continue on a landing or onboarding screen",
    ],
    avoidWhen: [
      "toolbars and dense layouts, where a moving target is harder to hit",
      "a labelled call to action — use magnetic-button",
    ],
    alternatives: ["magnetic-button", "button", "ripple-button"],
  },
});
