import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "skeleton",
  title: "Skeleton",
  description: "A shaped placeholder that holds layout while content loads.",
  category: "feedback",
  status: "stable",
  dependencies: [],
  registryDependencies: [],
  files: ["skeleton.tsx"],
  a11y:
    "Hidden from assistive technology. Put aria-busy on the container that owns the loading " +
    "data so the state is announced once instead of once per placeholder. Pulse and shimmer " +
    "are decoration and stop under reduced motion.",
  guidance: {
    useWhen: ["holding the layout of content while it loads"],
    avoidWhen: [
      "a busy button or a small inline wait — use spinner",
      "a task with known progress — use progress",
      "a list that loaded with nothing in it — use empty-state",
    ],
    alternatives: ["spinner", "progress", "empty-state", "grid-reveal"],
  },
});
