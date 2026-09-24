import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "otp-input",
  title: "OTP Input",
  description:
    "A one-time-code field drawn as a row of animated slots, with a caret that slides between them and success and error verdicts — paste, SMS autofill, masking and grouping included.",
  category: "form",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: ["otp-input.tsx"],
  a11y:
    'One real text input with autocomplete="one-time-code" and a numeric inputmode sits over the slots, so ' +
    "paste, SMS autofill, password managers and screen readers all meet a single labelled field holding the " +
    "code; the painted slots and the caret are aria-hidden. Every prop except className lands on that input, so FormField's " +
    'id, aria-describedby and aria-invalid wire up through FormControl. It is named "One-time code" only ' +
    "when given no aria-label, aria-labelledby or id. Arrow keys, Home and End move between slots; typing " +
    'over a filled slot replaces it. `status="error"` sets aria-invalid (an explicit aria-invalid wins), and ' +
    "`statusMessage`, when given, is announced through a polite live region once there is a verdict; colour " +
    "is never the only signal, since the error also shakes the row and the message says what happened. " +
    "The slots stay left-to-right in RTL, as codes are read. Slot, character, caret and verdict motion is " +
    "decoration and stops under reduced motion, leaving the caret visible and the verdict rings drawn.",
});
