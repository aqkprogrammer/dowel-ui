import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "ai-extraction-review",
  title: "AI Extraction Review",
  description:
    "Check extracted fields against the document they came from, and decide each one.",
  category: "ai",
  status: "stable",
  dependencies: [],
  registryDependencies: [],
  files: ["extraction-model.ts", "ai-extraction-review.tsx"],
  a11y:
    "Every field quotes its evidence in text under the value, so a reviewer who cannot see the " +
    "highlight in the source still has what the model read. A value with no evidence is said in " +
    "words — never left to look like a good one. The source is a focusable named region because " +
    "it scrolls, and its highlights are mark elements with nothing spliced into the text, since a " +
    "document read aloud with field names inserted is no longer the document. Focus anywhere in a " +
    "field brings its evidence into view without moving focus, so a keyboard user is shown the " +
    "source rather than sent into it. Each control's name carries the field it belongs to, so " +
    "ten Accept buttons are ten different buttons. Status is a word, outside the label so editing " +
    "never renames the control, and the running count is a polite live region present from the " +
    "start. Enter accepts, except while an IME is composing.",
});
