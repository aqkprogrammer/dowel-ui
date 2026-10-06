import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "rich-popover",
  title: "Rich Popover",
  description:
    "A popover card for an inline reference — heading or link, description, a meta chip and one call to action.",
  category: "overlay",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: ["popover"],
  files: ["rich-popover.tsx"],
  a11y:
    'Built on Dowel\'s Popover: the content is a role="dialog" labelled by its heading, opens from pointer or ' +
    "keyboard, closes on Escape or an outside press and returns focus to the trigger. The trigger must be a " +
    "focusable element with an accessible name (an icon-only trigger needs aria-label). Links open in a new tab " +
    "with rel=noopener; the leading icon, chip icon and arrow are decorative. The blur-in stops under reduced motion.",
  guidance: {
    useWhen: [
      "an inline reference that opens a card with a heading, description, meta chip and one call to action",
    ],
    avoidWhen: [
      "arbitrary content or a form in a floating panel — use popover",
      "a preview that opens on hover — use preview-link-card",
    ],
    alternatives: ["popover", "preview-link-card", "hover-card"],
  },
});
