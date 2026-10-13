import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "integrations",
  kind: "block",
  title: "Integrations",
  description:
    "A directory of services to connect — searchable, filterable by category or connected, each with a labelled switch.",
  category: "layout",
  status: "beta",
  dependencies: [],
  registryDependencies: ["input", "switch"],
  files: ["integrations.tsx"],
  a11y:
    "Each integration is a list item whose switch is named by the service, with its state also in words " +
    '("Connected" / "Not connected"), never colour or knob position alone. The search has a visible label; ' +
    "category filters are toggle buttons (aria-pressed) in a named group; a status line counts what is shown " +
    "and connected. A switch whose change is rejected goes back, and settings links carry the service name.",
  guidance: {
    useWhen: ["a settings page or marketplace of integrations to turn on"],
    avoidWhen: ["a marketing logo wall — use logo-grid-tooltips or logo-cloud-simple"],
    alternatives: ["logo-grid-tooltips", "settings"],
  },
});
