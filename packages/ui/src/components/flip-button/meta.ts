import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "flip-button",
  title: "Flip Button",
  description:
    "A button with a front and a back face that turns over in 3D on a spring — on hover and focus, or as a toggle on press.",
  category: "form",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: ["button"],
  files: ["flip-button.tsx"],
  a11y:
    "The accessible name is the front face; the back face is aria-hidden, so the name never changes under a " +
    'screen reader. With trigger="press" the button is a toggle exposed through aria-pressed; with ' +
    'trigger="hover" it also turns on keyboard focus-visible, and the turn is purely decorative. Pass ' +
    "aria-label when the front face has no text. Under reduced motion the turn becomes an instant swap.",
  guidance: {
    useWhen: [
      "a call to action that turns over to show a second face on hover or focus",
      "a two-state button that flips on each press",
    ],
    avoidWhen: [
      "back-face text that carries information — it is hidden from screen readers; use button",
    ],
    alternatives: ["button", "morph-button"],
  },
});
