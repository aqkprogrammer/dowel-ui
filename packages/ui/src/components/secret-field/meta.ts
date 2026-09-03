import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "secret-field",
  title: "Secret Field",
  description: "An API key in its three states: shown once, hidden but revealable, and gone.",
  category: "form",
  status: "stable",
  dependencies: [],
  registryDependencies: ["button", "input"],
  files: ["secret-field.tsx"],
  a11y:
    "The value sits in a read-only input rather than a disabled one, so it can be focused, " +
    "selected and read, and focusing a shown value selects all of it for copying by hand. The " +
    "field's state — shown once, hidden, revealed, gone — is a sentence attached as its " +
    "description, never a colour or an icon. Copying is announced through a status region that " +
    "exists before the first copy, and failure is announced too, with what to do instead, because " +
    "the clipboard can be refused. Every button carries the field's label in its name, so a " +
    "settings page with several keys has several distinct Copy buttons. Regenerating is confirmed " +
    "inline in a named group that states the consequence, since it revokes the current key.",
});
