import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "pull-to-refresh",
  title: "Pull to Refresh",
  description:
    "A sheet you pull down to refresh, with rubber-band resistance, a dot ring that fills as you pull and springs that carry the pull's velocity.",
  category: "feedback",
  status: "beta",
  dependencies: ["class-variance-authority", "motion"],
  registryDependencies: ["button"],
  files: ["pull-to-refresh.tsx"],
  a11y:
    "The sheet is a named, focusable group described by a hint; Enter on it refreshes, and a visible Refresh " +
    "button (showRefreshButton, on by default) gives a pointer-free path for touch and screen reader users, so " +
    "pulling is never the only way. While refreshing the sheet is aria-busy and a polite status region " +
    'announces "Refreshing…" then "Refreshed". The dot ring is aria-hidden decoration and stops under reduced ' +
    "motion, where the springs are also instant; the refresh itself still works. A pull only starts when the " +
    "sheet is scrolled to the top, and the click a pull leaves behind is swallowed.",
});
