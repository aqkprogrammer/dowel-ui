import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "island",
  title: "Island",
  description:
    "A pill that morphs between views — idle, a call, a timer, a player — resizing around whatever it shows.",
  category: "display",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: ["island.tsx"],
  a11y:
    "The island is a container: the controls inside a view (play, skip, answer) are ordinary buttons and must be " +
    'named by the consumer. Pass `live="polite"` to announce each new view — it is off by default, since an ' +
    "island that announces every change is noise. The resize and the incoming view's blur stop under reduced " +
    "motion; the pill takes its new size immediately.",
});
