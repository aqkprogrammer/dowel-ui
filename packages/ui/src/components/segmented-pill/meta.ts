import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "segmented-pill",
  title: "Segmented Pill",
  description:
    "A segmented control whose bright thumb slides to the chosen option and stretches elastically in transit.",
  category: "form",
  status: "beta",
  dependencies: ["class-variance-authority", "radix-ui"],
  registryDependencies: [],
  files: ["segmented-pill.tsx"],
  a11y:
    'Built on the Radix radio group: role="radiogroup" with one role="radio" per segment, roving focus, and arrow ' +
    "keys that move and select (mirrored in right-to-left layouts), with a visible focus ring on the focused segment. " +
    "Name the group with aria-label or aria-labelledby. The sliding thumb is aria-hidden; the selected segment is " +
    "also marked by its text colour against the thumb. Under reduced motion the thumb jumps without stretching.",
  guidance: {
    useWhen: [
      "switching between two to five views of the same data, such as Day, Week and Month",
    ],
    avoidWhen: [
      "the options swap whole panels of content — use tabs",
      "more than five options or long labels — use select",
    ],
    alternatives: ["toggle-group", "tabs", "radio-group", "goo-tabs"],
  },
});
