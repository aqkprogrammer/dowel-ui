import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "shortcut-recorder",
  title: "Shortcut Recorder",
  description:
    "Press the keys you want: records a chord, platform-aware, and says when it clashes.",
  category: "form",
  status: "stable",
  dependencies: [],
  registryDependencies: [],
  files: ["shortcut-model.ts", "shortcut-recorder.tsx"],
  a11y:
    "The recorder is a button named by what the shortcut does and described by its value in " +
    "words — Command Shift K — while the key caps on it are hidden from assistive technology, " +
    "since ⌘⇧K read aloud is noise. While recording it is aria-pressed and its description " +
    "says what to do; Tab always leaves and Escape always cancels, so it is never a keyboard " +
    "trap. Every outcome is announced through a status region present from the start: recorded, " +
    "refused with the reason, clashing with which command, cancelled, cleared. Symbols are shown " +
    "on a Mac and words elsewhere, and the description uses the platform's own names for its " +
    "keys.",
});
