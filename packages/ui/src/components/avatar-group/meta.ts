import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "avatar-group",
  title: "Avatar Group",
  description:
    'Overlapping avatars that spread apart on hover or keyboard focus, collapsing the rest into a "+N" count.',
  category: "display",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: ["avatar"],
  files: ["avatar-group.tsx"],
  a11y:
    "A list of people: each avatar's image carries the person's name as alt text, and the initials fallback is " +
    'aria-hidden with the name beside it as screen-reader text. The "+N" overflow reads as "and N more" ' +
    "(overflowLabel). Linked avatars are real links with a focus ring, and keyboard focus spreads the group just " +
    "as hover does. Name the group with aria-label when the context does not. The spread stops under reduced motion.",
});
