import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "pin-list",
  title: "Pin List",
  description:
    "A list split into Pinned and the rest, where pressing a row's pin glides it across to the other section while everything else reflows, and an emptied section folds away.",
  category: "data",
  status: "beta",
  dependencies: ["class-variance-authority", "motion"],
  registryDependencies: [],
  files: ["pin-list.tsx"],
  a11y:
    "Two real lists (ul, role=list), each named by its visible section label through aria-labelledby. Every row " +
    'has one control, a pin toggle exposed with aria-pressed and named "Pin <title>" (overridable through ' +
    "pinLabel), so its state is announced as pressed rather than by a changing name. A moved row is re-created " +
    "in its new section and focus is put back on its pin button there, so pressing again undoes it. A polite, " +
    'visually hidden status region announces each change ("Pinned Inbox" / "Unpinned Inbox", overridable ' +
    "through announce) and is empty on first paint. Row glyphs are aria-hidden. The pin's tilt and fill are a " +
    "second signal alongside the section it sits in, never the only one. Under reduced motion rows jump to their " +
    "new place and sections appear and disappear without animating.",
});
