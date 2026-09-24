import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "folder",
  title: "Folder",
  description:
    "A folder illustration whose sheets fan out on hover and lift out as its flap tips open in 3D when pressed.",
  category: "display",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: ["folder.tsx"],
  a11y:
    "One native button with aria-expanded — a screen reader announces the folder as collapsed or expanded, the " +
    "vocabulary it already has for a container opening (aria-pressed would describe a setting switched on). Its " +
    "accessible name is `label`, which is also the visible caption, or visually hidden with `hideLabel`. The " +
    "artwork and any `items` previews are aria-hidden, since a button flattens its content into its name; describe " +
    "real contents elsewhere and point `aria-controls` at them. Enter and Space toggle it natively, Escape closes " +
    "it, keyboard focus fans the sheets the way hover does, and it has the shared focus ring. The motion is CSS " +
    "transitions through the motion scale, so under reduced motion the poses apply instantly.",
});
