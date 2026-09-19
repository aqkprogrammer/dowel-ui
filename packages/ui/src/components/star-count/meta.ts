import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "star-count",
  title: "Star Count",
  description:
    "An animated star counter — plain or as a star button — with the stargazers' avatars beside it. The count is a prop; nothing is fetched.",
  category: "display",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: ["avatar-group", "number-flow"],
  files: ["star-count.tsx"],
  a11y:
    'The settled count is screen-reader text ("1,234 stars") while the rolling digits and the star icon are ' +
    "aria-hidden, so a reader never hears the count-up. With href the counter is a real link with a focus ring. " +
    "Stargazers are an AvatarGroup list named by stargazersLabel. Under reduced motion the count appears settled " +
    "and the star does not pop.",
});
