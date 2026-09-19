import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "card-stack",
  title: "Card Stack",
  description:
    "A pile of cards you step through as a receding deck, or that fans out into an arc on hover and focus.",
  category: "display",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: ["card-stack.tsx", "card-stack-layout.ts"],
  a11y:
    'The deck is a carousel region (aria-roledescription="carousel") of labelled slides; only the top card is ' +
    "exposed — the others are aria-hidden and inert. Indicator dots are buttons with a roving tabindex and " +
    "aria-current; arrow keys (mirrored in right-to-left layouts), Home and End step the deck and move focus " +
    "with it, and a polite status region announces the new card. Wheel and swipe are conveniences on top of " +
    "that, and the wheel releases the page at either end. The fan is a labelled list that opens on focus as " +
    "well as hover; its motion is decoration and settles instantly under reduced motion.",
});
