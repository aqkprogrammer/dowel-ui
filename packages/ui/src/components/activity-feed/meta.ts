import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "activity-feed",
  title: "Activity Feed",
  description: "A chronological list of events, with a connecting timeline rail.",
  category: "data",
  status: "stable",
  dependencies: ["radix-ui"],
  registryDependencies: [],
  files: ["activity-feed.tsx"],
  a11y:
    "An ordered list, so position and count are announced — the order is the meaning here. The " +
    "rail and the indicators are decorative; the item text has to say what happened. " +
    'ActivityTime requires a machine-readable dateTime, because a relative label like "2 hours ' +
    'ago" is ambiguous outside the moment it was rendered.',
  guidance: {
    useWhen: [
      "a chronological list of events, such as recent activity on an account or record",
    ],
    avoidWhen: [
      "what an agent did, with undo — use ai-action-ledger",
      "raw log output — use log-viewer",
      "a notifications inbox — use notification-list",
    ],
    alternatives: ["ai-action-ledger", "log-viewer", "notification-list"],
  },
});
