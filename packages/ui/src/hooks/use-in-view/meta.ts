import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "use-in-view",
  kind: "hook",
  title: "useInView",
  description:
    "Whether an element is on screen, through one IntersectionObserver — for pausing autoplay, loops and anything else nobody can see.",
  category: "foundation",
  status: "beta",
  dependencies: [],
  registryDependencies: [],
  files: ["use-in-view.ts"],
  a11y:
    "Use it to stop work, never to hide content: without an IntersectionObserver it reports the element as " +
    "visible, so anything gated on it keeps showing and working.",
});
