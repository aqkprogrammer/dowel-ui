import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "quantity-stepper",
  title: "Quantity Stepper",
  description:
    "A − count + pill whose number rolls like an odometer, whose pressed button flashes, and whose running total updates from a unit price.",
  category: "form",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: ["quantity-stepper.tsx"],
  a11y:
    'A role="group" named "Quantity" (or aria-label) holding two native buttons, "Decrease quantity" and "Increase quantity", ' +
    "each disabled at its bound and with a visible focus ring. The count lives in an <output> polite, atomic live region whose " +
    "hidden text is the plain number, so each change is announced once; the rolling digits are aria-hidden. The total is plain " +
    "text, read in place. Under reduced motion the number and total change without rolling or flashing.",
  guidance: {
    useWhen: ["choosing a small item count in a cart or order summary, with its price shown"],
    avoidWhen: [
      "typed or large numbers, or units — use quantity-input",
      "values without a natural step of one",
    ],
    alternatives: ["quantity-input", "drag-stepper"],
  },
});
