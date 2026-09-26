import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "blast-radius",
  title: "Blast Radius",
  description:
    "What an action will change before it runs — how many things, how, which can't be undone, and a sample by name.",
  category: "ai",
  status: "beta",
  dependencies: [],
  registryDependencies: [],
  files: ["blast-radius.tsx"],
  a11y:
    'A named section whose first line is a sentence that says it all — "43 records will change: 40 updated, ' +
    '3 deleted. 3 cannot be undone." — so nothing depends on the colour of a border. That line is a polite ' +
    "live region present from the start, because a dry run usually finishes after the question is already on " +
    "screen, and the section is aria-busy until it does. Permanent changes are listed first and say so in " +
    'words. When the list is a sample the counts say "at least" rather than passing a sample off as a ' +
    'total, and the rest is counted in "and N more". A failed dry run says why, and leaves the decision to ' +
    "the person.",
});
