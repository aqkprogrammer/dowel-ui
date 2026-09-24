import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "grid-reveal",
  title: "Grid Reveal",
  description:
    "A loading frame for a generated image: it opens as four shimmering cells, keeps splitting its largest cell as the wait goes on, then resolves cell by cell — busiest detail first — into the real picture.",
  category: "ai",
  status: "beta",
  dependencies: ["class-variance-authority", "motion"],
  registryDependencies: ["shimmer-text"],
  files: ["grid-reveal.tsx"],
  a11y:
    "The frame is aria-busy until the picture is complete, then exposes a single <img> carrying `alt`; the cells, " +
    "the per-cell pieces and the not-yet-shown image are aria-hidden throughout. Without `alt` the whole frame is " +
    "decorative and hidden from assistive technology. The caption is plain text, not a live region — announce " +
    "completion yourself from onRevealComplete if the page needs it. Under reduced motion the shimmer stops, splits " +
    'happen without the spring (MotionConfig reducedMotion="user") and the reveal completes almost at once.',
});
