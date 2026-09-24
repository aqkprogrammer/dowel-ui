import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "code-block",
  title: "Code Block",
  description:
    "A block of code with a copy control, line numbers and highlighted lines, re-shaded from a single accent colour — ready for any highlighter.",
  category: "data",
  status: "stable",
  dependencies: ["class-variance-authority"],
  registryDependencies: ["copy-button"],
  files: ["code-block.tsx"],
  a11y:
    "The pre is a focusable named region, since code overflows horizontally and an unfocusable " +
    "scroll box is unreachable by keyboard. Copying is announced through a polite live region as " +
    "well as shown, and a refused clipboard write reports failure rather than looking like " +
    "success. Line numbers are drawn by pseudo-elements in an aria-hidden, unselectable gutter, so " +
    "they are never read, selected or copied; highlighted lines are an aria-hidden wash, so a line's " +
    "emphasis must also be explained in the surrounding text when it matters. An accent is mixed into " +
    "the theme's own foreground and background to hold contrast, but a very light or very dark accent " +
    "should still be checked.",
});
