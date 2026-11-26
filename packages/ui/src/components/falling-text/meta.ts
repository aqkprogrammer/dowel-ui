import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "falling-text",
  title: "Falling Text",
  description:
    "Text that lets go: its words or letters drop out of the line, tumble, bounce and pile up at the bottom of the box — then fly home on reset.",
  category: "effects",
  status: "beta",
  dependencies: [],
  registryDependencies: ["use-reduced-motion"],
  files: ["falling-text.tsx"],
  a11y:
    "The text is read as written: a visually hidden copy carries it and the falling pieces are aria-hidden. " +
    'With trigger="click" the box becomes a toggle button (role="button", aria-pressed) that Enter and Space ' +
    "also work; name it with aria-label if the text alone does not say what it does. Under reduced motion " +
    "nothing falls — the text only dims to show it was triggered.",
  guidance: {
    useWhen: [
      "a playful moment in a hero, an empty state or a 404 page",
      "a headline that should react once when it scrolls into view",
    ],
    avoidWhen: [
      "text people need to read after the effect — once fallen it is a pile",
      "anything inside a form or a dense layout",
    ],
    alternatives: ["text-effect", "scramble-text", "letter-swap"],
  },
  controls: {
    gravity: { min: 400, max: 6000, step: 100 },
    bounce: { min: 0, max: 0.9, step: 0.05 },
  },
});
