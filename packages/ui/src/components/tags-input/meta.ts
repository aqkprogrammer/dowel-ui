import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "tags-input",
  title: "Tags Input",
  description:
    "A list of short values, where invalid entries stay visible instead of vanishing.",
  category: "form",
  status: "stable",
  dependencies: [],
  registryDependencies: [],
  files: ["tags-input.tsx"],
  a11y:
    "No WAI-ARIA pattern covers a token field, and the near misses misdescribe it — these are " +
    "committed values, not options being chosen, so calling the container a listbox would promise " +
    "navigation that does not exist. It is a labelled group holding a list, with a remove button " +
    "per token carrying the tag in its accessible name. An invalid token's reason is inside the " +
    "token, so it is announced with it rather than as a detached error. Additions, removals and " +
    "refusals all reach a polite live region, because a refusal that looks like nothing happening " +
    "is the failure this component exists to prevent. Remove buttons sit in the natural tab order " +
    "rather than behind a roving tabindex: it costs a tab stop per token, and buys a pattern every " +
    "assistive technology already understands.",
});
