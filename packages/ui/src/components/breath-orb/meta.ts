import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "breath-orb",
  title: "Breath Orb",
  description:
    "A soft orb that breathes big and small inside a faint ring that answers it, on a two-second loop.",
  category: "effects",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: ["breath-orb.tsx"],
  a11y:
    "Decorative and aria-hidden by default. When the breath carries meaning, such as a guided breathing exercise, pass `label` " +
    'and it becomes role="img" with that name; describe the rhythm in text nearby if the user is meant to follow it. ' +
    "It is not a progress indicator, so under reduced motion the loop stops and the orb settles at full size. `paused` holds it still.",
  guidance: {
    useWhen: [
      "a calm idle, listening or breathing-exercise visual",
      "an ambient focal point on an empty or waiting screen",
    ],
    avoidWhen: [
      "signalling that work is in progress — use spinner or ring-dots",
      "dense interfaces, where a constant pulse distracts",
    ],
    alternatives: ["breath-rings", "morph-blob", "dots-loader"],
  },
});
