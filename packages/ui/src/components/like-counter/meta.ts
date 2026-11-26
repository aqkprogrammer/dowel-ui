import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "like-counter",
  title: "Like Counter",
  description:
    "A round heart button beside a bold count: liking ripples a ring, bursts sparkles, fills the heart and rolls the number up.",
  category: "form",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: ["like-counter.tsx"],
  a11y:
    'One native button with aria-pressed, named "Like, 128" so the count is heard; the count only changes when ' +
    "the person presses the button, so there is no separate live region to chatter. The heart, the burst and the " +
    "rolling digits are aria-hidden. Click, Space and Enter toggle it, with a visible focus ring. Under reduced " +
    "motion every keyframe collapses to its resting frame and the count simply changes. The filled state is " +
    "shown by fill as well as colour.",
  guidance: {
    useWhen: [
      "a social like with a visible total, where the moment of liking deserves a flourish",
      "a showcase card on a dark surface",
    ],
    avoidWhen: [
      "a compact inline like in a dense feed — use like-button",
      "several reactions to choose from — use emoji-reaction",
    ],
    alternatives: ["like-button", "emoji-reaction", "number-flow"],
  },
});
