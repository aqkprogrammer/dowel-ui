import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "login",
  kind: "block",
  title: "Login",
  description: "A sign-in form with validation, social providers and a busy state.",
  category: "form",
  status: "stable",
  dependencies: [],
  registryDependencies: ["button", "card", "checkbox", "form", "input", "label", "separator"],
  files: ["login.tsx"],
  a11y:
    "Email and password fields carry the right type and autocomplete, so password managers and " +
    "mobile keyboards behave. Field errors are tied to their inputs through the Form wiring; a " +
    "server error is an assertive alert, because it arrived after the user acted and explains why " +
    "nothing happened. The submit button reports its own busy state rather than going quiet.",
});
