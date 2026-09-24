import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "number-flow",
  title: "Number Flow",
  description:
    "A number whose digits roll to each new value, fading at the window's edges and spinning through rapid updates while its width follows the digits — counters, prices, percentages and compact figures, formatted by Intl.NumberFormat.",
  category: "display",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: ["number-flow.tsx"],
  a11y:
    "The formatted value is rendered once as screen-reader text; the rolling reels are aria-hidden, " +
    'so a reader hears "$1,234.56" rather than thirty digits per place. Nothing is announced when ' +
    "the value changes unless the consumer passes aria-live, and then only the settled value is " +
    "announced (aria-atomic is set with it), never each digit. `prefix` and `suffix` are ordinary " +
    "text either side of it and are read with the number; an icon passed there should be aria-hidden " +
    "or labelled. A place that is fading out exists only in the hidden display. Under reduced motion " +
    "every change snaps.",
});
