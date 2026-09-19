import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "footer-newsletter",
  kind: "block",
  title: "Footer Newsletter",
  description:
    "A site footer with a newsletter sign-up and social links beside four columns of links.",
  category: "layout",
  status: "beta",
  dependencies: [],
  registryDependencies: ["button", "input", "label"],
  files: ["footer-newsletter.tsx"],
  a11y:
    "A footer landmark with its link columns in a named nav, each titled by a heading of " +
    "configurable level. The newsletter is a form named by its heading, with a labelled email " +
    "field (autocomplete=email); an invalid address marks the field aria-invalid and ties the " +
    "message to it, and a successful sign-up is confirmed in a status region. Social links always " +
    "carry their name as text, and external ones say they open a new tab.",
});
