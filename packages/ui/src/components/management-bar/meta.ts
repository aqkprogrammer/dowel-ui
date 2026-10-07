import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "management-bar",
  title: "Management Bar",
  description:
    "A floating bulk-actions toolbar that springs up with a selection: a rolling count, icon actions whose labels spring open on hover or focus, and a rolling pager.",
  category: "data",
  status: "beta",
  dependencies: ["class-variance-authority", "motion"],
  registryDependencies: ["number-flow"],
  files: ["management-bar.tsx"],
  a11y:
    'A role="toolbar" named "Bulk actions" (aria-label) with a single Tab stop and a roving tabindex: ArrowLeft and ' +
    "ArrowRight move between controls in the reading direction, wrapping, and Home and End jump to the ends. The " +
    'count and page are read from visually hidden text ("3 selected", "Page 2 of 5"); the rolling digits are ' +
    "aria-hidden. Each action is named by its label, which stays in the accessible name while visually collapsed. " +
    "Pager buttons at a bound and disabled actions are aria-disabled rather than disabled, so focus is never " +
    "stranded, and they ignore activation. If the bar closes with focus inside it, focus returns to where it came " +
    "from. Nothing animates on first paint, and the springs run through motion inside MotionConfig " +
    'reducedMotion="user", so under reduced motion the bar and labels appear without travel.',
  guidance: { useWhen: ["bulk actions on selected rows, shown while something is selected"] },
  composesWith: ["data-table"],
});
