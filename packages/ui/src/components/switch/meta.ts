import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "switch",
  title: "Switch",
  description: "An immediate on/off toggle for settings that apply straight away.",
  category: "form",
  status: "stable",
  dependencies: ["radix-ui"],
  registryDependencies: [],
  files: ["switch.tsx"],
  a11y:
    'Exposed as role="switch" and toggled with Space or Enter. Needs a visible label tied with ' +
    "htmlFor/id. Do not rely on colour alone to show state — position and the label carry it too.",
});
