import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "forgot-password",
  kind: "block",
  title: "Forgot password",
  description:
    "A password reset request, with a confirmation that does not leak account existence.",
  category: "form",
  status: "stable",
  dependencies: [],
  registryDependencies: ["button", "card", "empty-state", "form", "input"],
  files: ["forgot-password.tsx"],
  a11y:
    "The confirmation replaces the form, so it is a polite live region — otherwise a screen " +
    "reader user submits and hears nothing. The wording is deliberately neutral about whether " +
    "the address exists: confirming it would turn this form into an account enumeration oracle.",
});
