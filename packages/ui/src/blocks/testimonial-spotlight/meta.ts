import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "testimonial-spotlight",
  kind: "block",
  title: "Testimonial Spotlight",
  description:
    "A heading beside one testimonial at a time, stepped through with previous and next.",
  category: "layout",
  status: "beta",
  dependencies: [],
  registryDependencies: ["avatar", "reviews-carousel", "text-effect"],
  files: ["testimonial-spotlight.tsx"],
  a11y:
    "A section named by its heading, containing the reviews carousel: a named carousel whose " +
    "testimonials are labelled slides, only the front one exposed, with named previous/next " +
    "buttons and arrow keys (mirrored in RTL). The quote's word-by-word blur-in is decorative — an " +
    "sr-only copy reads it as one sentence — and settles at once under reduced motion. Avatars are " +
    "hidden, since the name is beside them.",
});
