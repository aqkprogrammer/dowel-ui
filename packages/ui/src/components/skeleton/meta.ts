import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "skeleton",
  title: "Skeleton",
  description: "A shaped placeholder that holds layout while content loads.",
  category: "feedback",
  status: "stable",
  dependencies: [],
  registryDependencies: [],
  files: ["skeleton.tsx"],
  a11y:
    "Hidden from assistive technology. Put aria-busy on the container that owns the loading " +
    "data so the state is announced once instead of once per placeholder.",
});
