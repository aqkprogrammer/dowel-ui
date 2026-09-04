import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "breadcrumb",
  title: "Breadcrumb",
  description: "Where the current page sits in the hierarchy, and how to get back up it.",
  category: "navigation",
  status: "stable",
  dependencies: ["radix-ui"],
  registryDependencies: [],
  files: ["breadcrumb.tsx"],
  a11y:
    'The current page is a span carrying aria-current="page", not a link: a link to the page ' +
    "you are already on does nothing, and in a list of links it is indistinguishable from the " +
    "ones that go somewhere. Separators are hidden from assistive technology, because the list " +
    'already conveys the sequence and reading "slash" between every item is the design\'s ' +
    "punctuation leaking into the content. The ellipsis is the exception and is named, because " +
    "it is content: it says levels have been left out.",
});
