import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "pull-cord",
  title: "Pull Cord",
  description:
    "A lamp switch whose cord stretches down on a spring when pulled and turns a warm light on or off.",
  category: "form",
  status: "beta",
  dependencies: ["class-variance-authority", "radix-ui"],
  registryDependencies: [],
  files: ["pull-cord.tsx"],
  a11y:
    'Built on the Radix switch primitive: role="switch" with aria-checked, toggled by click, Space or Enter, ' +
    "with a visible focus ring and a hidden input inside forms. The lamp drawing is aria-hidden and has no " +
    'visible text, so the switch is named "Lamp" by default; pass aria-label or aria-labelledby for its real ' +
    "purpose. The state is carried by aria-checked, not by the glow alone. Under reduced motion the cord does " +
    "not stretch and the light switches at once. The drawing never mirrors in right-to-left layouts.",
  guidance: {
    useWhen: [
      "a playful on/off control for a light, focus or night mode",
      "a showpiece toggle on an empty state or landing page",
    ],
    avoidWhen: [
      "settings lists with many toggles — use switch",
      "dense forms, where a drawn lamp dominates the row",
    ],
    alternatives: ["switch", "theme-toggle", "dot-matrix-switch"],
  },
});
