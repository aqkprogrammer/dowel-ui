import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "hero-split-image",
  kind: "block",
  title: "Hero split image",
  description:
    "A two-column hero with a headline, reviewer avatars, a star rating and calls to action beside an image.",
  category: "layout",
  status: "beta",
  dependencies: [],
  registryDependencies: ["avatar-group", "button", "text-effect"],
  files: ["hero-split-image.tsx"],
  a11y:
    "One section landmark named by its headline, whose level is a prop. The star rating is one " +
    'image named in words ("Rated 4.9 out of 5"), and the visible figure beside it is hidden so ' +
    "it is not read twice. Reviewer avatars carry their names. The image is content and requires " +
    "alt text; the placeholder shown without one is aria-hidden. The entrance runs on the motion " +
    "scale and settles at rest under reduced motion.",
});
