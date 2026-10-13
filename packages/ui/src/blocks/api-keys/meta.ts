import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "api-keys",
  kind: "block",
  title: "API keys",
  description:
    "List, create and revoke API keys — each new key shown once with copy, then only its masked form; revoking asks first.",
  category: "form",
  status: "beta",
  dependencies: [],
  registryDependencies: [
    "alert-dialog",
    "badge",
    "button",
    "checkbox",
    "dialog",
    "empty-state",
    "form",
    "input",
    "label",
    "secret-field",
    "table",
  ],
  files: ["api-keys.tsx"],
  a11y:
    "Keys are a real table with a caption, scrolling inside a named, focusable region. Each Revoke button " +
    "names its key, and revoking asks in a destructive alert dialog that says what stops working. Creating " +
    "asks for a name and at least one permission (a fieldset with a legend), checked on submit with errors " +
    "in words. The new key is shown once with copy and an acknowledgement, and a status line announces " +
    "each key created and revoked.",
  guidance: {
    useWhen: ["the API keys page of a developer product's settings"],
    avoidWhen: ["one secret to show — use secret-field on its own"],
    alternatives: ["secret-field", "settings"],
  },
});
