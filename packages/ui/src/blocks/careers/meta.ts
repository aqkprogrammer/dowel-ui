import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "careers",
  kind: "block",
  title: "Careers",
  description:
    "Open roles grouped by team, with a search, a team filter and an empty state that clears them.",
  category: "layout",
  status: "beta",
  dependencies: [],
  registryDependencies: ["button", "empty-state", "input"],
  files: ["careers.tsx"],
  a11y:
    "Each team is a heading over a list named by it; each role is a single link whose text is the job " +
    'title, so a links list reads as titles rather than repeated "Apply". The search has a visible label. ' +
    "Team filters are toggle buttons (aria-pressed) in a named group, a status line says how many roles " +
    "match, and an empty state offers to clear the filters.",
  guidance: {
    useWhen: ["a careers page listing open roles"],
    avoidWhen: ["a team page of people — use team-grid"],
    alternatives: ["team-grid"],
  },
});
