import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "changelog",
  kind: "block",
  title: "Changelog",
  description:
    "Releases newest first — date, version, headline and each change marked New, Improved or Fixed — filterable by kind.",
  category: "layout",
  status: "beta",
  dependencies: [],
  registryDependencies: ["badge"],
  files: ["changelog.tsx"],
  a11y:
    "An ordered list of articles, each named by its release headline one level below the section's, with a " +
    "real <time>. The kind of each change is a word in a contrast-audited badge, never colour alone. Filters " +
    "are toggle buttons (aria-pressed) in a named group, and a status line says how many releases remain. " +
    '"Read the full notes" links carry the version for screen readers so they are not all alike.',
  guidance: {
    useWhen: ["a public changelog or release notes page"],
    avoidWhen: ["an activity log of user actions — use activity-feed"],
    alternatives: ["activity-feed"],
  },
});
