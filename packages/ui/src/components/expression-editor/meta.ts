import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "expression-editor",
  title: "Expression Editor",
  description:
    "A formula field with highlighting, autocomplete for variables and functions, the error where it is, and a live result. Evaluated without eval.",
  category: "form",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: ["popover"],
  files: [
    "expression-editor.tsx",
    "expression.ts",
    "expression-eval.ts",
    "expression-functions.ts",
    "expression-complete.ts",
    "expression-highlight.tsx",
  ],
  a11y:
    "The field is a real input, so the caret, selection, undo and screen reader editing are the " +
    "browser's own; the highlighted copy behind it is aria-hidden. In one line the input is the " +
    'role="combobox", with aria-expanded, aria-controls, aria-autocomplete="list" and ' +
    "aria-activedescendant pointing into the suggestion listbox, so focus never leaves the field: " +
    "ArrowUp and ArrowDown move (and wrap), Enter or Tab inserts, Escape closes, Shift+Tab leaves " +
    "without choosing, and Ctrl+Space or Alt+ArrowDown opens the list on demand. ARIA in HTML allows " +
    "no role on a textarea, so the multiline field stays a textbox with the same attributes minus " +
    "aria-expanded, and a status says how many suggestions there are instead. Each option's name " +
    'says what it is — "price, 12" or "round, function: Rounds half away from zero" — and the active ' +
    "one has a bar at its start as well as a fill. An error sets aria-invalid, is underlined with a " +
    "wavy line so it does not depend on colour, and its message is the field's description. The " +
    "result and the error share one polite live region that only speaks while the field has focus " +
    "and the list is closed, after a pause in typing, so a page of formulas recalculating does not " +
    "talk over itself. Formulas are laid out left to right in every locale, because the bidi " +
    "algorithm would otherwise move parentheses in a right-to-left page.",
});
