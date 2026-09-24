import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "emoji-reaction",
  title: "Emoji Reaction",
  description:
    "A reaction button that springs open a bar of emoji; picking one — or holding it, or dragging onto it from the button — floats copies up out of the bar.",
  category: "feedback",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: ["popover"],
  files: ["emoji-reaction.tsx"],
  a11y:
    'The trigger is a disclosure button (aria-expanded, aria-controls; no aria-haspopup, which has no "toolbar" ' +
    'value) named "React", then "React, Heart" once something is picked. The bar is role="toolbar" rather than a ' +
    "menu, because it stays open, picks repeat and holding is the point — a menu promises choose-and-close. Each " +
    "emoji is a button named by its label (default English names; pass `labels` or `{ emoji, label }`), and the " +
    "current pick has aria-current. Roving tabindex: arrow keys (mirrored in RTL), Home and End move along the bar; " +
    "Enter or ArrowUp/ArrowDown on the trigger opens it with focus on the current pick; Escape, a click outside and " +
    "Tab close it, and focus returns to the trigger unless it has already moved somewhere on purpose. A tap picks " +
    "on release, so a press that slides off does nothing. The floating copies are an aria-hidden, pointer-transparent " +
    "layer; under reduced motion none are made and nothing lifts. With asChild your element keeps its own name, so " +
    "give it one that says it can be reacted to.",
});
