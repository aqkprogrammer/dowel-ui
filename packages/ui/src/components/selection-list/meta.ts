import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "selection-list",
  title: "Selection List",
  description:
    "A multi-select list of people with a liquid tick and an action that springs out from under it once someone is picked.",
  category: "form",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: ["avatar", "button"],
  files: ["selection-list.tsx", "selection-list-spring.ts"],
  a11y:
    'The list is a role="listbox" aria-multiselectable="true" with a single tab stop; name it with aria-label ' +
    '(default "Select people") or aria-labelledby. Rows are role="option" with aria-selected. ArrowUp/ArrowDown ' +
    "rove with wrap-around, Home/End jump, Space/Enter toggle and Ctrl/Cmd+A selects or clears everything. The " +
    "hover highlight follows keyboard focus as well as the pointer. The action button is disabled, inert and " +
    "aria-hidden while tucked away (nothing selected); a pending action shows aria-busy, and the done label is " +
    "announced through a polite live region. When the action tucks away again focus returns to the list. The " +
    "tick, avatars and highlight are aria-hidden; under reduced motion the goo fill becomes a plain fill.",
});
