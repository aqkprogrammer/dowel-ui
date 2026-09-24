import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "gravity-field",
  title: "Gravity Field",
  description:
    "A box where a click drops a glyph and holding pours a stream: letters, digits or your own nodes fall, tumble and pile up.",
  category: "effects",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: ["gravity-field.tsx", "gravity-field-physics.ts"],
  a11y:
    'The field is one focusable element with role="button" and an accessible name (`label`, default "Drop a ' +
    'glyph"): Enter or Space drops a glyph at the centre, and holding the key pours through key repeat. Every ' +
    "glyph is decorative and aria-hidden, and nothing is announced. It has the shared focus ring. Under " +
    "reduced motion the world is settled synchronously, so a glyph appears where it would have come to rest, " +
    "glyphs past the cap are removed rather than faded, and device tilt is ignored. The animation loop stops " +
    "when every glyph is asleep and pauses off-screen. `touch-action: pan-y` keeps vertical swipes scrolling " +
    "the page. With `deviceTilt`, the motion-sensor permission is only requested from a tap or key press.",
});
