import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "memory-inspector",
  title: "Memory Inspector",
  description:
    "What an assistant remembers about the person, with where each memory came from, and search, edit, pin and forget with an undo window.",
  category: "ai",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: ["badge", "button", "input", "textarea"],
  files: ["memory-inspector.tsx", "memory-item.tsx", "memory-model.ts", "undo-window.ts"],
  a11y:
    'A section named by its heading, "Claude remembers 12 things", which counts only what is still ' +
    "remembered. Each memory's Edit, Pin and Forget sit in a group named by the memory's text, so a " +
    'screen reader moving into them hears which memory they act on rather than a row of bare "Edit" ' +
    'buttons. Pin is a toggle with aria-pressed and a constant label; a pinned memory also says "Pinned" ' +
    "in words, so nothing depends on its shading. Edit opens a labelled field with the cursor at the " +
    "end; Escape or Cancel closes it, Save or Ctrl+Enter keeps it, and focus returns to Edit either " +
    "way. An empty memory is refused with an error tied to the field by aria-describedby. Forgetting " +
    'puts "Forgot “…” · Undo" where the memory was and moves focus to Undo; the window pauses while ' +
    "keyboard focus or the pointer is on Undo (WCAG 2.2.1), and Undo returns focus to the control " +
    "that forgot: the memory's Forget, or Forget all. If the window closes while Undo has focus, " +
    "focus moves to the next memory's first action, else the previous one's, else the search field. " +
    "Forget all asks in place, with Cancel focused and " +
    "Escape backing out, and says how many are pinned. The search result count is spoken by a polite " +
    "status region once typing pauses, not on every keystroke. Dates are UTC by default so the server " +
    "and browser render the same text.",
});
