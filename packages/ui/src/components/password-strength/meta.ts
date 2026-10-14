import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "password-strength",
  title: "Password Strength",
  description:
    "A strength meter and rule checklist under a password field: length, mixed case, a number, a symbol, and not a common password — or your own rules.",
  category: "form",
  status: "beta",
  dependencies: [],
  registryDependencies: [],
  files: ["password-strength.tsx"],
  a11y:
    'The meter is role="meter" with the level as its value text ("Fair", "Strong"), so it is never colour alone. ' +
    "The level is announced politely as it changes; the rule list is not live, so a screen reader does not read " +
    "it on every keystroke. Each rule says in words whether it is met. Point the password field's " +
    "aria-describedby at this component so the rules are read with it. A client-side check is guidance, not " +
    "security: check against breach data on the server too.",
  guidance: {
    useWhen: [
      "a sign-up or change-password form",
      "anywhere a reader chooses a secret that must meet a policy",
    ],
    avoidWhen: [
      "showing or copying an API key — use secret-field",
      "sign-in forms, where it only gets in the way",
    ],
    alternatives: ["secret-field", "progress", "meter"],
  },
  composesWith: ["input", "form", "label"],
  controls: {
    minLength: { min: 6, max: 32, step: 1 },
  },
});
