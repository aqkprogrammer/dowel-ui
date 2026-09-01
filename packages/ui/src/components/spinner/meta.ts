import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "spinner",
  title: "Spinner",
  description: "An indeterminate loading indicator for buttons, panels and inline content.",
  category: "feedback",
  status: "stable",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: ["spinner.tsx"],
  a11y:
    "Renders aria-hidden by default so it does not announce inside controls that already " +
    'expose a busy state. Pass `label` to announce it standalone via role="status".',
});
