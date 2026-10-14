import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "globe",
  title: "Globe",
  description:
    "A dotted globe with places and the routes between them, drawn in raw WebGL — turning slowly, draggable, listed for screen readers.",
  category: "data",
  status: "experimental",
  dependencies: [],
  registryDependencies: ["use-in-view", "use-reduced-motion"],
  files: ["globe.tsx", "globe-math.ts"],
  a11y:
    "The picture is aria-hidden; the information is not — every place and route is listed for screen readers " +
    "inside the named region. Focus it and the arrow keys turn it; a drag does too. It spins and pulses only " +
    "while on screen, not hovered, and never under reduced motion. Without WebGL, or if the context is lost, " +
    "an SVG of the same view stands in. Colours are theme tokens and follow theme changes.",
  guidance: {
    useWhen: [
      "a hero showing a global network — regions, offices, traffic between them",
      "a handful of places and routes where the shape of the world is the point",
    ],
    avoidWhen: [
      "reading exact locations or values — use a map or a table",
      "more than one or two on a page — each is a WebGL context",
    ],
    alternatives: ["shader-background", "dither-scatter"],
  },
  composesWith: ["hero-minimal", "stats-grid"],
  controls: {
    dots: { min: 500, max: 20000, step: 500 },
    speed: { min: 0, max: 60, step: 1 },
    dotColor: { kind: "color" },
    markerColor: { kind: "color" },
    arcColor: { kind: "color" },
  },
});
