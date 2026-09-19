import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "bar-loader",
  title: "Bar Loader",
  description:
    "Indeterminate loading indicators made of bars — cascade, equalizer, wave physics, an indeterminate sweep and 17 more motions.",
  category: "feedback",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: ["bar-loader.tsx"],
  a11y:
    "Renders aria-hidden by default so it does not announce inside controls that already " +
    'expose a busy state. Pass `label` to announce it standalone via role="status". ' +
    "Under reduced motion it slows rather than stopping, because a frozen loader reads as a hang. " +
    "The indeterminate sweep never reports a value, so it cannot be mistaken for real progress.",
});
