import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "goo-ball",
  title: "Goo Ball",
  description:
    "A decorative jelly ball you drag around a well: it stretches along its velocity and squashes against the walls.",
  category: "effects",
  status: "beta",
  dependencies: ["class-variance-authority", "motion", "radix-ui"],
  registryDependencies: [],
  files: ["goo-ball.tsx"],
  a11y:
    'The handle is a 2D slider (role="slider", aria-roledescription "draggable ball") labelled as decorative by ' +
    'default ("Goo ball (decorative)"), with aria-valuetext "<x>% across, <y>% down". Arrow keys nudge it 2% ' +
    "(Shift: 10%), mirrored in right-to-left layouts; Home centres it; it has the shared focus ring. The gooey " +
    "blob is an aria-hidden SVG drawn behind the handle. Under reduced motion the spring is skipped: the ball " +
    "sits exactly at the handle with no stretch or wobble.",
});
