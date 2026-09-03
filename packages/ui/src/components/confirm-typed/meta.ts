import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "confirm-typed",
  title: "Confirm Typed",
  description: "Type the name to confirm — and be told, not ignored, when it does not match.",
  category: "form",
  status: "stable",
  dependencies: [],
  registryDependencies: ["button", "input"],
  files: ["confirm-typed.tsx"],
  a11y:
    "The button stays reachable while the text does not match, dimmed rather than disabled, and " +
    "pressing it or Enter announces what was expected, marks the field invalid and returns focus " +
    "to it — the common version disables the button and says nothing, so a keyboard user cannot " +
    "tell whether anything happened. The match is announced once, on the transition, naming the " +
    "action that became available, so nobody has to watch the button change colour. Typing " +
    "itself stays silent, because a verdict on every keystroke is noise. The hint is the field's " +
    "description and the button's, and the status region exists from the first render so the " +
    "first announcement is heard. Pasting is allowed: blocking it punishes people who cannot " +
    "type a long name easily and stops nobody who can select-all and copy.",
});
