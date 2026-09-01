import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "alert",
  title: "Alert",
  description: "A callout that draws attention to an important message.",
  category: "feedback",
  status: "stable",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: ["alert.tsx"],
  a11y:
    'Not a live region by default. Pass live="polite" for alerts that appear in response to ' +
    'a user action, or live="assertive" for errors that must interrupt. Variant colour is ' +
    "never the only signal — the title carries the meaning.",
});
