import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "duration-picker",
  title: "Duration Picker",
  description:
    "A duration pill that springs apart into hours, minutes and a tick with a gooey melt, clamps and shakes past its ceiling, and merges back on confirm.",
  category: "form",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: ["duration-picker.tsx"],
  a11y:
    'A role="group" named "Duration" unless given aria-label or aria-labelledby. Shut, it is text ("2 hr 30 min") ' +
    'and one button, "Edit duration". Pressing it opens two text fields with inputMode="numeric", named "Hours" ' +
    'and "Minutes", moves focus to the hours, and the button becomes "Confirm duration". Enter in a field or the ' +
    "tick confirms; Escape anywhere inside restores the value from before editing; both hand focus back to the " +
    'button. A clamped entry is announced politely ("Maximum 24") as well as shaken, so the correction is not ' +
    "visual only. Names and the announcement are translatable through `labels`. The blobs, goo filter and " +
    "icons are aria-hidden; under reduced motion the goo is dropped and the pill parts and merges instantly.",
});
