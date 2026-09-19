import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "features-alternating",
  kind: "block",
  title: "Features alternating",
  description:
    "Feature rows that alternate copy and media from side to side, each sliding in from its own side as it scrolls into view.",
  category: "layout",
  status: "beta",
  dependencies: [],
  registryDependencies: [],
  files: ["features-alternating.tsx"],
  a11y:
    "One section landmark named by its heading (level set with `headingLevel`, row titles one " +
    "below); the rows are a list. Sides swap with grid order rather than `direction: rtl`, so " +
    "reading order always follows the source order and the layout mirrors correctly on a " +
    "right-to-left page, as does the slide. Media is a prop — pass an image with real alt text; " +
    "the fallback panel is decorative. Rows starting below the fold are hidden until they " +
    "scroll in, never under reduced motion.",
});
