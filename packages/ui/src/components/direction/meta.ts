import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "direction",
  title: "Direction Provider",
  description:
    "Tells the component primitives which way the writing runs, so menus and sliders mirror with the rest of the page.",
  category: "foundation",
  status: "stable",
  dependencies: ["radix-ui"],
  registryDependencies: [],
  files: ["direction.tsx"],
  a11y:
    "Needed only for right-to-left languages, and needed in addition to `dir` on the document " +
    "rather than instead of it. The styling here is written with logical properties and follows " +
    "`dir` by itself; the primitives underneath read direction from React context and assume " +
    "left-to-right without a provider, which mirrors a page correctly except for its menus, " +
    "selects and sliders — worse than not mirroring at all, because it looks deliberate.",
});
