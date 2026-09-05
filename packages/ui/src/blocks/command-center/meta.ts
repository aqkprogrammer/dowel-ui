import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "command-center",
  kind: "block",
  title: "Command center",
  description:
    "Operations at a glance: service health worst-first, open incidents by severity, capacity meters, a filterable log stream, and a command palette for every action an operator reaches for.",
  category: "data",
  status: "stable",
  access: "pro",
  dependencies: [],
  registryDependencies: [
    "alert",
    "badge",
    "button",
    "card",
    "command",
    "empty-state",
    "log-viewer",
    "meter",
  ],
  files: ["command-center.tsx"],
  a11y:
    "The overall status is one sentence computed from the worst service, and it comes first — " +
    "'one service is down' rather than a wall of tiles to scan. It is not a live region: the " +
    "page is refreshed by the application, and a status that re-announces on every poll is one " +
    "nobody can work beside. Health and severity are words on every row, sorted on, with colour " +
    "agreeing rather than replacing. ⌘K opens the palette but the Actions button is always " +
    "visible, so the shortcut is an accelerator and not the only way in. New log lines are not " +
    "read aloud unless asked.",
});
