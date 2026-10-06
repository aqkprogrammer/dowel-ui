import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "popover",
  title: "Popover",
  description: "Rich floating content anchored to a trigger.",
  category: "overlay",
  status: "stable",
  dependencies: ["radix-ui"],
  registryDependencies: [],
  files: ["popover.tsx"],
  a11y:
    'The content has role="dialog" and therefore REQUIRES an accessible name — pass aria-label, ' +
    "or aria-labelledby pointing at a heading inside it. A development-only warning fires if " +
    "neither is present. The trigger exposes aria-expanded and aria-controls; Escape closes and " +
    "returns focus to it. Non-modal by default, so the rest of the page stays reachable; pass " +
    "`modal` only when the content is a task the user must finish or abandon.",
  guidance: {
    useWhen: [
      "interactive content anchored to a trigger, such as a small form or a picker",
      "extra detail or controls opened on click and dismissed by clicking away",
    ],
    avoidWhen: [
      "a short label on hover — use tooltip",
      "a list of actions — use dropdown-menu",
      "a preview on hover with nothing to click — use hover-card",
    ],
    alternatives: ["tooltip", "dropdown-menu", "hover-card", "rich-popover", "dialog"],
  },
});
