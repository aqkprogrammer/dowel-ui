import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "signature-pad",
  title: "Signature Pad",
  description:
    "A pad to sign with a pointer, finger or pen — ink that thins with speed, undo and clear, and a typed alternative.",
  category: "form",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: ["button"],
  files: ["signature-pad.tsx"],
  a11y:
    'The canvas is a role="img" named by the visible label, with instructions in its description. Drawing ' +
    "needs a pointer, so the pad offers Type instead: a text field whose name is set in a script face on the " +
    "same canvas, giving keyboard and voice users an equal way to sign. Undo and Clear are real buttons, " +
    "disabled when there is nothing to undo, and a polite live region says when the pad holds a signature. " +
    "Ink takes the foreground colour, so it keeps its contrast in every theme.",
  guidance: {
    useWhen: [
      "capturing a hand-drawn signature or initials to store as an image, such as on a delivery or consent form",
    ],
    avoidWhen: [
      "a legally binding e-signature flow — use a dedicated signing provider",
      "confirming a dangerous action — use confirm-typed",
    ],
    alternatives: ["confirm-typed", "input"],
  },
  composesWith: ["form"],
});
