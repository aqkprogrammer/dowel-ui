import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "reorder-list",
  title: "Reorder List",
  description:
    "A short list of people or things you put in order by dragging liquid pills, or with Space and the arrow keys.",
  category: "form",
  status: "beta",
  dependencies: ["class-variance-authority", "motion"],
  registryDependencies: ["avatar"],
  files: ["reorder-list.tsx"],
  a11y:
    "A real list (ol, role=list, named by aria-label) whose rows are buttons named by their label and described by " +
    "the keyboard instructions. Space or Enter picks a row up (aria-pressed), ArrowUp/ArrowDown or Home/End move " +
    "it, Space or Enter drops it and Escape (or leaving the row) cancels and restores the original order; without " +
    "a grab the arrows move focus between rows. Focus stays on the moved row. A polite, visually hidden status " +
    "region announces each grab, move, drop and cancel (messages overridable for i18n), including drops made by " +
    "pointer. The goo layer of pill backgrounds is aria-hidden and separate from the text, and avatars are " +
    "decorative. Under reduced motion nothing deforms and rows jump to their slots.",
});
