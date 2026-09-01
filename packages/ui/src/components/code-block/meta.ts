import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "code-block",
  title: "Code Block",
  description: "A block of code with a copy control, ready for any highlighter.",
  category: "data",
  status: "stable",
  dependencies: [],
  registryDependencies: [],
  files: ["code-block.tsx"],
  a11y:
    "The pre is a focusable named region, since code overflows horizontally and an unfocusable " +
    "scroll box is unreachable by keyboard. Copying is announced through a polite live region as " +
    "well as shown, and a refused clipboard write reports failure rather than looking like " +
    "success.",
});
