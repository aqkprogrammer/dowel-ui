import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "logo-cloud-simple",
  kind: "block",
  title: "Logo cloud simple",
  description:
    "A heading, a line of copy and a still grid of customer logos, dimmed until hovered or focused.",
  category: "layout",
  status: "beta",
  dependencies: [],
  registryDependencies: [],
  files: ["logo-cloud-simple.tsx"],
  a11y:
    "One section landmark named by its heading (level set with `headingLevel`). The logos are a " +
    "list; each is named by its organisation's `name`, announced once — the logo graphic itself " +
    "is aria-hidden so an SVG with no title or an image with a stray alt cannot double or " +
    "garble it. Linked entries are real links with the shared focus ring, and focus brightens " +
    "an entry exactly as hover does.",
});
