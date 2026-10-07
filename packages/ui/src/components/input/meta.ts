import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "input",
  title: "Input",
  description: "A single-line text field with size variants and native validation styling.",
  category: "form",
  status: "stable",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: ["input.tsx", "floating-label-input.tsx"],
  a11y:
    "Always pair with a Label via htmlFor/id. Error state is driven by aria-invalid so " +
    "assistive technology and styling stay in sync; describe the error with aria-describedby. FloatingLabelInput keeps a real <label for> " +
    "as the accessible name whether resting or floated, and floats it with CSS alone.",
  guidance: {
    useWhen: ["single-line text, email, password or number entry"],
    avoidWhen: [
      "several lines of text — use textarea",
      "a number with a unit — use quantity-input",
      "a one-time code — use otp-input",
    ],
    alternatives: ["textarea", "quantity-input", "otp-input", "tags-input"],
  },
  composesWith: ["label", "form"],
});
