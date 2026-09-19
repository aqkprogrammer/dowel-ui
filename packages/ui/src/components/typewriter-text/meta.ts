import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "typewriter-text",
  title: "Typewriter Text",
  description:
    "Types text a character at a time behind a blinking caret — once, on a loop, or cycling through a list.",
  category: "effects",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: ["typewriter-text.tsx"],
  a11y:
    "The typed characters are aria-hidden and an sr-only copy holds the full text (every item, for a list), so a " +
    "screen reader reads it once and never per character. The server renders the finished text, and the untyped " +
    "remainder reserves its space so nothing reflows. Under reduced motion the full text shows immediately.",
});
