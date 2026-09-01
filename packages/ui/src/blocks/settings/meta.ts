import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "settings",
  kind: "block",
  title: "Settings",
  description: "A settings page with a profile form, immediate toggles and a danger zone.",
  category: "form",
  status: "stable",
  dependencies: [],
  registryDependencies: [
    "avatar",
    "button",
    "card",
    "dialog",
    "form",
    "input",
    "label",
    "separator",
    "switch",
    "tabs",
  ],
  files: ["settings.tsx"],
  a11y:
    "Switches apply immediately and have no Save button — a switch that needs saving is a broken " +
    "promise, so staged changes live in the form instead. The delete confirmation names what will " +
    "be destroyed and requires typing the account's email, so the destructive button cannot be " +
    "reached by muscle memory.",
});
