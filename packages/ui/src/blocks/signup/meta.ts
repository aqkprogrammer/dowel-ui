import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "signup",
  kind: "block",
  title: "Sign up",
  description: "An account creation form with a password strength hint and terms acceptance.",
  category: "form",
  status: "stable",
  dependencies: [],
  registryDependencies: ["button", "card", "checkbox", "form", "input", "progress"],
  files: ["signup.tsx"],
  a11y:
    "The strength label is text and the bar beside it is aria-hidden, so the estimate is not " +
    'announced twice. autoComplete="new-password" tells password managers to offer a generated ' +
    "password rather than an existing one. Strength is a hint, never a gate: the form is validated " +
    "on length alone.",
});
