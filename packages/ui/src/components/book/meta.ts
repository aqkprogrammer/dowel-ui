import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "book",
  title: "Book",
  description:
    "A 3D book cover drawn in CSS that tilts, or swings open to reveal its first page, on hover and keyboard focus.",
  category: "display",
  status: "beta",
  dependencies: ["class-variance-authority", "radix-ui"],
  registryDependencies: [],
  files: ["book.tsx"],
  a11y:
    "The title is real text; the spine shading, page edges, back cover and inside of the cover are aria-hidden. " +
    "Keyboard focus anywhere in the book (or on the book itself, when it is rendered as a link with asChild) " +
    "does what hover does, and the link gets the shared focus ring. The tilt is decoration and does not happen " +
    "under prefers-reduced-motion; the open effect still reveals its content there, instantly.",
});
