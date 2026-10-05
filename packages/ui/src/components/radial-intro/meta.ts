import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "radial-intro",
  title: "Radial Intro",
  description:
    "An intro that spins a stack of avatars out along a spiral into a ring on staggered springs, then lets the ring orbit slowly with every face upright.",
  category: "display",
  status: "beta",
  dependencies: ["class-variance-authority", "motion"],
  registryDependencies: [],
  files: ["radial-intro.tsx"],
  a11y:
    'A list (role="list") of images, each with its alt text; the names that float above an avatar on hover are ' +
    "aria-hidden duplicates of the alt. The track and the motion are decoration. Because the orbit runs " +
    'indefinitely, an orbiting ring has a toggle button ("Pause rotation", aria-pressed) to stop it (WCAG 2.2.2), ' +
    "and the orbit also pauses while an avatar is hovered or the ring is off screen. The intro plays on mount or " +
    'when first scrolled into view. Springs run through motion inside MotionConfig reducedMotion="user"; under ' +
    "reduced motion the finished ring renders at once and never orbits, and the pause toggle is not shown.",
});
