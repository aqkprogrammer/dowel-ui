import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "team-grid",
  kind: "block",
  title: "Team grid",
  description:
    "A heading over a grid of team members — a large portrait, name, role, location and bio — rising in one after another.",
  category: "layout",
  status: "beta",
  dependencies: [],
  registryDependencies: ["avatar"],
  files: ["team-grid.tsx"],
  a11y:
    "One section landmark named by its heading (level set with `headingLevel`); members are a " +
    "list and each name is a heading one level below, so a screen reader can jump person to " +
    "person. Portraits have empty alt text because the name is read next — a described photo " +
    "would say the name twice — and the initials fallback is aria-hidden for the same reason. " +
    "Only a grid starting below the fold is held back to animate, never under reduced motion.",
});
