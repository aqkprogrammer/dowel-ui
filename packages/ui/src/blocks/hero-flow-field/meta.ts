import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "hero-flow-field",
  kind: "block",
  title: "Hero flow field",
  description:
    "A developer hero over a flowing current — headline, an install command to copy, two actions and a row of figures.",
  category: "layout",
  status: "beta",
  dependencies: [],
  registryDependencies: ["button", "copy-button", "flow-field"],
  files: ["hero-flow-field.tsx"],
  a11y:
    "One section landmark named by its headline, whose level is a prop. The current is aria-hidden " +
    "decoration on a canvas that pauses off-screen and holds still under reduced motion. The command is " +
    "real text in <code> with a named copy button that announces the copy. The figures are a description " +
    "list, so each number is read with what it counts.",
  guidance: {
    useWhen: ["a developer tool's landing page, leading with how to install it"],
    avoidWhen: ["a non-technical audience — a command line means nothing to them"],
    alternatives: ["hero-light-beams", "hero-product", "hero-minimal"],
  },
});
