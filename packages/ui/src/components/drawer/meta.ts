import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "drawer",
  title: "Drawer",
  description: "A bottom sheet that can be dismissed by dragging it down.",
  category: "overlay",
  status: "stable",
  dependencies: ["radix-ui"],
  registryDependencies: [],
  files: ["drawer.tsx"],
  a11y:
    "Drag is pointer-only and never the sole way out: Escape, the overlay and DrawerCancel all " +
    "dismiss. The grab handle is aria-hidden because it duplicates those affordances. Always " +
    "render a DrawerTitle. The optional section stagger stops under reduced motion.",
  guidance: {
    useWhen: [
      "a bottom sheet on touch screens, dismissed by dragging down",
      "actions or details that rise from the bottom on mobile",
    ],
    avoidWhen: [
      "a panel from the side or top — use sheet",
      "a centred modal on desktop — use dialog",
    ],
    alternatives: ["sheet", "dialog"],
  },
});
