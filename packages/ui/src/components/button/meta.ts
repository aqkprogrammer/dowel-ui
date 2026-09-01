import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "button",
  title: "Button",
  description: "Triggers an action or event, with variants for every level of emphasis.",
  category: "foundation",
  status: "stable",
  dependencies: ["class-variance-authority", "radix-ui"],
  registryDependencies: ["spinner"],
  files: ["button.tsx"],
  a11y:
    "Keyboard activatable via Enter and Space. The loading state uses aria-disabled and " +
    "aria-busy rather than the disabled attribute, so focus is never stranded mid-action. " +
    'Use `size="icon"` only with an accessible name from aria-label or visually hidden text.',
});
