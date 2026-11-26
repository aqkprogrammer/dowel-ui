import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "shimmer-skeleton",
  title: "Shimmer Skeleton",
  description:
    "A glassy card placeholder — avatar, text lines and a media block — with one soft diagonal shimmer sweeping across it.",
  category: "feedback",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: ["shimmer-skeleton.tsx"],
  a11y:
    'The root is a polite role="status" with aria-busy, named by a visually hidden `label` ("Loading" by ' +
    "default), so the loading state is announced once for the whole card; pass an empty label when the " +
    "surrounding region already reports it. Every shape and the shimmer are aria-hidden. The shimmer is " +
    "decorative and stops under reduced motion, leaving a still placeholder.",
  guidance: {
    useWhen: [
      "a card-shaped placeholder with a glassy, premium sheen while a feed item or profile loads",
    ],
    avoidWhen: [
      "a single line or block inside existing layout — use skeleton",
      "an indeterminate wait with no content shape to preview — use spinner",
    ],
    alternatives: ["skeleton", "spinner"],
  },
});
