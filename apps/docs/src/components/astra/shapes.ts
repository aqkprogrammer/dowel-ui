import { PATH_SHAPE_SAMPLE_COUNT } from "./field";

/**
 * The outlines the star field settles into as the page scrolls.
 *
 * Each is a set of stroked SVG paths. Stars are dealt out along the total
 * stroke length, so a shape's visual weight is its path length: a long path
 * gets more stars than a short one, and a shape with too little stroke reads
 * thin. Sizes are in the shape's own viewBox; the cue element decides how
 * large it is on screen.
 */

export type AstraShapeId = "prompt" | "dowel";

export interface AstraShape {
  id: AstraShapeId;
  viewBox: { width: number; height: number };
  paths: readonly string[];
  /** Only the reduced-motion outline draws this; the stars ignore it. */
  strokeWidth: number;
}

export const ASTRA_SHAPES: Record<AstraShapeId, AstraShape> = {
  // A terminal prompt: the CLI is how every component arrives.
  prompt: {
    id: "prompt",
    viewBox: { width: 200, height: 200 },
    paths: ["M52 58 L104 100 L52 142", "M112 142 H154"],
    strokeWidth: 2,
  },
  // A dowel: the letter, with the peg it is named after through the bowl.
  dowel: {
    id: "dowel",
    viewBox: { width: 200, height: 200 },
    paths: [
      "M62 42 V158 H98 C130.03 158 156 132.03 156 100 C156 67.97 130.03 42 98 42 Z",
      "M84 100 H134",
      "M119 86 A14 14 0 1 1 119 114",
    ],
    strokeWidth: 2,
  },
};

export function resolveAstraShape(value: unknown): AstraShape | null {
  return typeof value === "string" && value in ASTRA_SHAPES
    ? ASTRA_SHAPES[value as AstraShapeId]
    : null;
}

export interface SampledShape {
  element: HTMLElement;
  id: string;
  /** RGBA per sample: x, y in [-0.5, 0.5]; z, w = the sub-path's span. */
  samples: Float32Array;
  aspectRatio: number;
}

/**
 * Samples the shape's rendered SVG into 1024 points along its stroke.
 *
 * Reads the live element rather than the path data, so whatever the browser
 * laid out — transforms, a viewBox that letterboxes — is what the stars form.
 */
export function sampleShapeElement(element: HTMLElement, id: string): SampledShape | null {
  const svg = element.querySelector("svg");
  const viewBox = svg?.viewBox.baseVal;
  if (!svg || !viewBox || viewBox.width <= 0 || viewBox.height <= 0) return null;
  const svgMatrix = svg.getScreenCTM();
  const paths = Array.from(svg.querySelectorAll("path"))
    .map((path) => {
      try {
        const length = path.getTotalLength();
        const pathMatrix = path.getScreenCTM();
        const matrix =
          svgMatrix && pathMatrix ? svgMatrix.inverse().multiply(pathMatrix) : null;
        return length > 0 && Number.isFinite(length) ? { path, length, matrix } : null;
      } catch {
        return null;
      }
    })
    .filter((entry) => entry !== null);
  const totalLength = paths.reduce((sum, entry) => sum + entry.length, 0);
  if (totalLength <= 0) return null;

  const samples = new Float32Array(4 * PATH_SHAPE_SAMPLE_COUNT);
  let pathIndex = 0;
  let consumed = 0;
  for (let index = 0; index < PATH_SHAPE_SAMPLE_COUNT; index += 1) {
    const distance = ((index + 0.5) / PATH_SHAPE_SAMPLE_COUNT) * totalLength;
    while (
      pathIndex < paths.length - 1 &&
      distance > consumed + (paths[pathIndex]?.length ?? 0)
    ) {
      consumed += paths[pathIndex]?.length ?? 0;
      pathIndex += 1;
    }
    const entry = paths[pathIndex];
    if (!entry) return null;
    const local = entry.path.getPointAtLength(distance - consumed);
    const point = entry.matrix
      ? new DOMPoint(local.x, local.y).matrixTransform(entry.matrix)
      : local;
    const offset = 4 * index;
    samples[offset] = (point.x - viewBox.x) / viewBox.width - 0.5;
    samples[offset + 1] = 0.5 - (point.y - viewBox.y) / viewBox.height;
    samples[offset + 2] = consumed / totalLength;
    samples[offset + 3] = (consumed + entry.length) / totalLength;
  }
  if (samples.some((value) => !Number.isFinite(value))) return null;
  return { element, id, samples, aspectRatio: viewBox.width / viewBox.height };
}
