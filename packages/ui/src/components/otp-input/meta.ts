import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "otp-input",
  title: "OTP Input",
  description:
    "A one-time-code field drawn as a row of animated slots — paste, SMS autofill, masking and grouping included.",
  category: "form",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: ["otp-input.tsx"],
  a11y:
    'One real text input with autocomplete="one-time-code" and a numeric inputmode sits over the slots, so ' +
    "paste, SMS autofill, password managers and screen readers all meet a single labelled field holding the " +
    "code; the painted slots are aria-hidden. Every prop except className lands on that input, so FormField's " +
    'id, aria-describedby and aria-invalid wire up through FormControl. It is named "One-time code" only ' +
    "when given no aria-label, aria-labelledby or id. Arrow keys, Home and End move between slots; typing " +
    "over a filled slot replaces it. The slots stay left-to-right in RTL, as codes are read. Slot, digit and " +
    "caret motion is decoration and stops under reduced motion, leaving the caret visible.",
});
