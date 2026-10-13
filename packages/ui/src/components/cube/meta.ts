import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "cube",
  title: "Cube",
  description:
    "Content on the faces of a cube that turns to show one face at a time — a carousel in three dimensions, by buttons, arrow keys or drag.",
  category: "display",
  status: "beta",
  dependencies: [],
  registryDependencies: ["use-reduced-motion"],
  files: ["cube.tsx"],
  a11y:
    'A carousel to assistive technology (aria-roledescription), each face a labelled slide ("2 of 4: Speed"). ' +
    "Faces turned away are inert and hidden, so focus never reaches them. Previous and next buttons, the arrow " +
    "keys on the focused cube (Up and Down for the top and bottom), Home and End, and a horizontal drag all turn " +
    "it, and a status line names the face. Auto-rotation pauses on hover and focus, never runs under reduced " +
    "motion, and is not announced. The turn is on the motion scale, so under reduced motion the face just changes.",
  guidance: {
    useWhen: ["a playful showcase of four to six short panels — features, plans, a team"],
    avoidWhen: [
      "content people need to compare side by side — lay it out flat",
      "long text on a face — it turns away from the reader",
    ],
    alternatives: ["carousel", "carousel-3d", "flip-card"],
  },
  composesWith: ["card", "badge"],
  controls: {
    size: { min: 120, max: 400, step: 10 },
    autoRotate: { min: 1000, max: 8000, step: 500 },
  },
});
