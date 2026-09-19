import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "testimonial-star-grid",
  kind: "block",
  title: "Testimonial Star Grid",
  description: "Reviews in a grid, each with a star rating, the quotation and its author.",
  category: "layout",
  status: "beta",
  dependencies: [],
  registryDependencies: ["avatar"],
  files: ["testimonial-star-grid.tsx"],
  a11y:
    "A section named by its heading, with the reviews as a list of figures: a blockquote and a " +
    'figcaption naming its author. A rating is one image named in words ("Rated 4 out of 5") ' +
    "rather than five unlabelled stars, and colour is not the only difference between filled and " +
    "empty stars. Avatars are hidden, since the name is beside them. The cascade collapses to " +
    "nothing under reduced motion, and the hover lift only happens when motion is allowed.",
});
