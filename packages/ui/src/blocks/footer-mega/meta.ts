import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "footer-mega",
  kind: "block",
  title: "Footer Mega",
  description:
    "A mega footer: logo, four link columns and a newsletter sign-up, over a copyright and social bar.",
  category: "layout",
  status: "beta",
  dependencies: [],
  registryDependencies: ["button", "input", "label"],
  files: ["footer-mega.tsx"],
  a11y:
    "A footer landmark with its link columns in a named nav, each titled by a heading of " +
    "configurable level. The newsletter is a form named by its heading, with a labelled email " +
    "field (autocomplete=email); an invalid address marks the field aria-invalid and ties the " +
    "message to it, and a successful sign-up is confirmed in a status region. Social links always " +
    "carry their name as text, and external ones say they open a new tab.",
});
