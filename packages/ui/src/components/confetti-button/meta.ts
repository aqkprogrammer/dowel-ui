import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "confetti-button",
  title: "Confetti Button",
  description:
    "A Button that bursts confetti from itself when pressed — and burstConfetti(), to celebrate from anywhere: a point, an element, a finished upload.",
  category: "effects",
  status: "beta",
  dependencies: [],
  registryDependencies: ["button"],
  files: ["confetti-button.tsx", "confetti.ts"],
  a11y:
    "The button is a Button: same role, name, focus and keyboard activation. The burst is decoration on a " +
    "temporary canvas that is aria-hidden, ignores the pointer and removes itself when the last piece falls. " +
    "Under reduced motion there is no burst at all, so never let it be the only sign that something succeeded — " +
    "say it in words too, with a toast or a message.",
  guidance: {
    useWhen: [
      "celebrating a real milestone: a first deploy, a finished onboarding, a payment",
      "a playful call to action on a launch page",
    ],
    avoidWhen: [
      "routine actions — celebration loses meaning when it happens every click",
      "reporting success — use toast, and add confetti on top if you like",
    ],
    alternatives: ["effect-button", "like-button", "fireworks-background"],
  },
  composesWith: ["toast", "button"],
});
