import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "assignee-picker",
  title: "Assignee Picker",
  description:
    "A pill of overlapping faces that opens a multi-select list of people; new faces fly into the stack.",
  category: "form",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: ["avatar", "popover"],
  files: ["assignee-picker.tsx", "assignee-picker-spring.ts"],
  a11y:
    'The trigger exposes aria-haspopup="listbox" and aria-expanded, and is named by `label` plus who is ' +
    'assigned ("Assignees: Adam Marsh, Priya Raman", or the placeholder when nobody is). The popup is a ' +
    'role="listbox" aria-multiselectable="true" named by `label`, with role="option" rows carrying aria-selected. ' +
    "Opening moves focus onto the first assigned person (or the first row); ArrowUp/ArrowDown rove with wrap-around, " +
    "Home/End jump, Space/Enter toggle, and Escape or Tab close it and return focus to the trigger. Faces, avatars " +
    "and the check marks are aria-hidden: the option text and aria-selected carry the meaning. Under reduced " +
    "motion the card, rows and faces appear in place.",
});
