import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "card-spread",
  title: "Card Spread",
  description:
    "A stack of cards that fans into an arc, row, corner fan, stamp arc, cascade, dealt hand or wheel on hover, focus or click.",
  category: "display",
  status: "beta",
  dependencies: ["class-variance-authority", "radix-ui"],
  registryDependencies: [],
  files: ["card-spread.tsx", "card-spread-layouts.ts"],
  a11y:
    'The deck is a role="group"; name it with aria-label or aria-labelledby. A deck of non-interactive cards ' +
    'gets a real toggle button (aria-pressed, named by `toggleLabel`, default "Spread cards") laid over the ' +
    "stack: it is the tab stop, Enter/Space/click/tap pin the spread open, and Escape closes it. It is a sibling " +
    "of the cards, so every card's own content stays in the accessibility tree. A deck whose cards are links or " +
    "buttons (via `asChild`) has no toggle and is reached through them. Keyboard focus anywhere inside opens the " +
    "spread. Under reduced motion the layout still applies, instantly. In RTL the spread mirrors toward the " +
    "inline start.",
});
