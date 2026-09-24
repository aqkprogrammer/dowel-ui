import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "scroll-progress",
  title: "Scroll Progress",
  description:
    "A thin bar that fills from the start edge as the page, or a scroll container, is scrolled, smoothed by a spring.",
  category: "navigation",
  status: "beta",
  dependencies: ["class-variance-authority", "motion"],
  registryDependencies: [],
  files: ["scroll-progress.tsx"],
  a11y:
    "Decorative and aria-hidden, with no role. It repeats what the scrollbar already exposes, and making it a live " +
    "progressbar would make some screen readers announce or beep on every scroll step. It ignores the pointer, so it " +
    "never covers a click target at the viewport edge. Colour is never its only signal because it carries no meaning " +
    "that is not available elsewhere. Under reduced motion the spring is dropped and the bar tracks scroll directly; " +
    "the fill grows from the start edge in both reading directions.",
});
