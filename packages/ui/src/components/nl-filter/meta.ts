import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "nl-filter",
  title: "NL Filter",
  description:
    "Type what you want to see, get filter chips you can edit or remove. The app can supply the parser; a plain field:value one ships.",
  category: "data",
  status: "beta",
  dependencies: [],
  registryDependencies: ["button", "input", "popover", "select", "spinner"],
  files: [
    "nl-filter.tsx",
    "nl-filter-editor.tsx",
    "nl-filter-model.ts",
    "nl-filter-parse.ts",
    "nl-filter-apply.ts",
  ],
  a11y:
    "A labelled text field inside a labelled group, with the chips before it as a list named " +
    '"Applied filters". Each chip reads as a sentence — "Status is Failed" — and operators are ' +
    'words, not symbols, because most screen readers skip ">" at their default punctuation level. ' +
    'A chip is two buttons: "Edit filter: Status is Failed", which opens a named popover with a ' +
    "labelled condition select, a labelled value field and Apply and Cancel, returning focus to " +
    'the chip on close; and "Remove filter: Status is Failed", after which focus goes to the text ' +
    "field. Backspace in the empty field removes the last chip. Enter never submits a surrounding " +
    "form and does nothing mid-composition. While an async parser works the group is aria-busy, a " +
    "spinner shows and the hint says so, and Escape stops it. Additions, duplicates, removals, " +
    'edits and what was not understood all reach one polite status region — "Added 2 filters: ' +
    'Status is Failed, Branch is main." — present and empty from first paint. Text the parser ' +
    "could not read stays in the field and is named in a notice the field is described by, so " +
    "nothing is dropped in silence.",
});
