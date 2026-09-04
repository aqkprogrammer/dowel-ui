import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "textarea",
  title: "Textarea",
  description:
    "A multi-line text field, with optional auto-resize and a character count that knows when to stay quiet.",
  category: "form",
  status: "stable",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: ["textarea.tsx"],
  a11y:
    "Pair with a Label via htmlFor/id. The error state is driven by aria-invalid, so assistive " +
    "technology and styling stay in sync. The character count is described by the field rather " +
    "than announced on every keystroke — a permanently live counter reads the remaining number " +
    "between every letter typed, which is unusable — so it goes live only once the limit is " +
    "close, and states the remainder in words rather than as a bare ratio that is read aloud as " +
    "two unlabelled numbers. Horizontal resizing is off by default, because a field dragged " +
    "wider than its container is a broken layout.",
});
