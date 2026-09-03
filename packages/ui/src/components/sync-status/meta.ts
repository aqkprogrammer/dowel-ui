import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "sync-status",
  title: "Sync Status",
  description: "Offline, saving, saved or failed — with the count of changes being held.",
  category: "feedback",
  status: "stable",
  dependencies: [],
  registryDependencies: ["button"],
  files: ["sync-status.tsx"],
  a11y:
    "The word is the status and the coloured dot is decoration, hidden from assistive " +
    "technology. The visible text is not a live region: every save flips it and a region on it " +
    "would narrate the whole session. A separate region, present from the first render, " +
    "announces transitions only — went offline with what will happen to the changes, came back " +
    "with what is being saved, could not save, saved after a failure — and never the churn of " +
    "saving itself. Announcing is on by default because going offline is the one thing a reader " +
    "who is typing has to be told, and it can be turned off. The server render assumes online, " +
    "since a page with no interface to report has no business saying offline.",
});
