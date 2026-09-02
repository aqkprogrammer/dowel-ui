import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "log-viewer",
  title: "Log Viewer",
  description: "A streaming console with filtering, level facets and follow mode.",
  category: "data",
  status: "stable",
  dependencies: ["@tanstack/react-virtual"],
  registryDependencies: [],
  files: ["log-stream.ts", "log-viewer.tsx"],
  a11y:
    'role="log" implies aria-live="polite", which is right for a few events and unusable for a ' +
    "console — a screen reader would read every line of a build and nothing else would be " +
    "audible. Announcing is off by default and opt-in. Virtualization is the harder trade: most " +
    "rows are not in the DOM, so assistive technology cannot reach them, which is why the " +
    "component takes an onDownload escape rather than pretending the virtual window is the whole " +
    "log. Levels are written in text as well as coloured, matches use mark elements rather than " +
    "a background colour, and an invalid pattern is announced instead of silently showing an " +
    'empty log that reads as "nothing matched".',
});
