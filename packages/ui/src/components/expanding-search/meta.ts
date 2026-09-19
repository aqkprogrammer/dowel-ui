import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "expanding-search",
  title: "Expanding Search",
  description:
    "A search button that opens into a field, clears, and collapses back with Escape — ready for a combobox.",
  category: "form",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: ["expanding-search.tsx"],
  a11y:
    "A labelled search landmark. The trigger is a button with aria-expanded and aria-controls; opening moves " +
    "focus into the field. Escape clears the text first, then collapses and returns focus to the trigger; " +
    "leaving an empty field collapses it without moving focus. The collapsed field is visibility-hidden, so " +
    "it is out of the tab order. `inputProps` reaches the input for combobox wiring, and its onKeyDown can " +
    "preventDefault to keep Escape for its own listbox.",
});
