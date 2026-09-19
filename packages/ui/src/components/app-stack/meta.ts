import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "app-stack",
  title: "App Stack",
  description:
    "A pile of app icons that fans out on hover and opens into a multi-select picker whose icons fly to their tiles.",
  category: "form",
  status: "beta",
  dependencies: ["class-variance-authority", "motion"],
  registryDependencies: ["button"],
  files: ["app-stack.tsx"],
  a11y:
    'The collapsed stack is a button (aria-expanded="false", named "Choose from {title}" or triggerLabel); opening ' +
    'moves focus to the picker\'s header button (aria-expanded="true"), which closes it and returns focus. Each app ' +
    "is a toggle button (aria-pressed) named by the app; icons and check marks are decorative. The download " +
    "button is disabled until something is selected. Progress, completion and failure are announced through a " +
    "polite status region, and the stack is aria-disabled while busy. Under reduced motion the icons move without " +
    "animating (MotionConfig) and the fan, float and shine stop.",
});
