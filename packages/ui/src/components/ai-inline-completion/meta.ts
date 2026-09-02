import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "ai-inline-completion",
  title: "AI Inline Completion",
  description: "Ghost-text suggestion inside a real textarea, accepted with Tab.",
  category: "ai",
  status: "beta",
  dependencies: [],
  registryDependencies: [],
  files: ["ai-inline-completion.tsx"],
  a11y:
    "No WAI-ARIA pattern covers generative ghost text — combobox is the nearest and does not fit, " +
    "because the suggestion is not one of a known set of options and a listbox would misdescribe " +
    "it. So the suggestion is announced through a polite live description that names the keys, " +
    "since a gesture nobody knows about is not an affordance, and the grey text itself is " +
    "aria-hidden. Escape always dismisses and restores plain Tab, so the keyboard is never " +
    "trapped in the field. The ghost hides during IME composition and whenever the caret is not " +
    "at the end, rather than rendering somewhere it does not belong.",
});
