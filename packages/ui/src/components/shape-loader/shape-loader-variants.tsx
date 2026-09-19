// Ported from amicro "Geometric Shapes" (MIT, © 2026 Syed Subhan Uddin). See THIRD_PARTY_NOTICES.md.
import type { CSSProperties, ReactNode } from "react";

/*
 * The variant table for ShapeLoader, split out to keep each file small.
 *
 * Source px ÷ 8 = em, so a 32px square is 4em at the default size. Framer's
 * keyframe arrays become @keyframes whose stops are spread evenly, the way
 * Framer spreads them; its easeInOut is CSS ease-in-out, applied per segment
 * as Framer does. The source's springs (cube flip, diamond spin, spring hex)
 * become the overshoot curve, the closest a CSS easing gets to a bounce.
 *
 * Renamed: amicro's "apple-icon-morph" is `icon-morph` here.
 */

export const PREFIX = "dowel-shape-loader";

/** A delay or duration in seconds, scaled for reduced motion. */
export function scaled(seconds: number): string {
  return `calc(${String(seconds)}s * var(--motion-scale-indicator, 1))`;
}

const OVERSHOOT = "var(--ease-overshoot, cubic-bezier(0.34, 1.4, 0.64, 1))";

export type Variant = {
  /** Layout of the root, inline so it outranks the unlayered stylesheet. */
  root: CSSProperties;
  render: () => ReactNode;
};

type Motion = {
  name: string;
  duration: number;
  delay?: number;
  ease?: string;
};

/** The inline animation for a part: keyframe, scaled duration and delay. */
function animate({ name, duration, delay = 0, ease }: Motion): CSSProperties {
  const style: Style = {
    animationName: `${PREFIX}-${name}`,
    "--dur": scaled(duration),
    "--delay": scaled(delay),
  };
  if (ease) style.animationTimingFunction = ease;
  return style;
}

/**
 * A span part. `kind` picks its base look in the stylesheet: `shape` is a
 * filled block, `outline` a bordered one, `group` a transparent layer that may
 * move, `frame` a transparent layer that never does.
 */
function part(
  key: number | string,
  kind: "shape" | "outline" | "group" | "frame",
  style: CSSProperties,
  motion?: Motion,
  children?: ReactNode,
): ReactNode {
  return (
    <span key={key} data-part={kind} style={{ ...style, ...(motion ? animate(motion) : {}) }}>
      {children}
    </span>
  );
}

type Style = CSSProperties & Record<`--${string}`, string>;

function square(size: string, radius: string, extra: Style = {}): Style {
  return { width: size, height: size, borderRadius: radius, ...extra };
}

const HEXAGON = "25,5 45,15 45,35 25,45 5,35 5,15";
const TRIANGLE = "25,5 45,40 5,40";
const INFINITY =
  "M 15 15 C 15 5, 25 5, 30 15 C 35 25, 45 25, 45 15 C 45 5, 35 5, 30 15 C 25 25, 15 25, 15 15";
const HEART =
  "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z";

type StrokeProps = {
  strokeWidth: number;
  strokeDasharray?: number;
  strokeLinecap?: "round";
  strokeLinejoin?: "round";
};

/** A stroked SVG outline: a faint track, or the moving line when given a motion. */
function stroke(
  key: string,
  shape: "polygon" | "polyline" | "path",
  geometry: string,
  props: StrokeProps,
  motion?: Motion,
): ReactNode {
  const style = motion ? animate(motion) : { opacity: 0.2 };
  const common = { "data-part": "stroke", style, ...props };
  if (shape === "path") return <path key={key} {...common} d={geometry} />;
  if (shape === "polyline") return <polyline key={key} {...common} points={geometry} />;
  return <polygon key={key} {...common} points={geometry} />;
}

function svg(
  width: string,
  height: string,
  viewBox: string,
  children: ReactNode,
  motion?: Motion,
): ReactNode {
  return (
    <svg
      data-part="svg"
      width={width}
      height={height}
      viewBox={viewBox}
      aria-hidden="true"
      style={{ width, height, ...(motion ? animate(motion) : {}) }}
    >
      {children}
    </svg>
  );
}

const BOX = (size: string): CSSProperties => ({ width: size, height: size });

/** Every variant, in catalogue order. */
export const VARIANT_NAMES = [
  "flip-square",
  "morphing-shape",
  "newtons-cradle",
  "spinning-squares",
  "expanding-cross",
  "square-grid",
  "floating-diamonds",
  "pulse-square",
  "pendulum",
  "hexagon-spinner",
  "wandering-cube",
  "hourglass",
  "rotating-triangle",
  "bouncing-square",
  "breathing-square",
  "diamond-grid",
  "square-snake",
  "infinity-path",
  "morphing-infinity",
  "zig-zag-pulse",
  "pumping-heart",
  "heartbeat",
  "spiral-spinner",
  "concentric-squares",
  "rotating-cross",
  "icon-morph",
  "smooth-rounded-square",
  "cube-flip-spring",
  "origami-shape",
  "diamond-rotate-spring",
  "shape-shift-grid",
  "spring-hexagon",
  "elastic-square",
  "minimal-triangle",
  "fluid-diamond",
] as const;

export type VariantName = (typeof VARIANT_NAMES)[number];

export const VARIANTS: Record<VariantName, Variant> = {
  "flip-square": {
    root: {},
    render: () => part("s", "shape", square("4em", "0.75em"), { name: "flip", duration: 2 }),
  },
  "morphing-shape": {
    root: {},
    render: () => part("s", "shape", square("5em", "10%"), { name: "morph", duration: 2 }),
  },
  "newtons-cradle": {
    root: { gap: "0.25em" },
    render: () => [
      part(
        "a",
        "shape",
        { ...BOX("1.5em"), transformOrigin: "top" },
        {
          name: "cradle-a",
          duration: 1.5,
        },
      ),
      part("b", "shape", BOX("1.5em")),
      part("c", "shape", BOX("1.5em")),
      part(
        "d",
        "shape",
        { ...BOX("1.5em"), transformOrigin: "top" },
        {
          name: "cradle-b",
          duration: 1.5,
        },
      ),
    ],
  },
  "spinning-squares": {
    root: BOX("5em"),
    render: () => [
      part(
        "a",
        "shape",
        square("2em", "0.25em", { position: "absolute", top: 0, left: 0, "--d": "3em" }),
        { name: "trace", duration: 2 },
      ),
      part(
        "b",
        "shape",
        square("2em", "0.25em", {
          position: "absolute",
          bottom: 0,
          right: 0,
          opacity: 0.3,
          "--d": "-3em",
        }),
        { name: "trace", duration: 2 },
      ),
    ],
  },
  "expanding-cross": {
    root: BOX("4em"),
    render: () => [
      part(
        "h",
        "shape",
        {
          position: "absolute",
          top: "calc(50% - 0.25em)",
          left: 0,
          width: "100%",
          height: "0.5em",
        },
        { name: "stretch-x", duration: 1.5 },
      ),
      part(
        "v",
        "shape",
        {
          position: "absolute",
          left: "calc(50% - 0.25em)",
          top: 0,
          height: "100%",
          width: "0.5em",
        },
        { name: "stretch-y", duration: 1.5, delay: 0.75 },
      ),
    ],
  },
  "square-grid": {
    root: { display: "grid", gridTemplateColumns: "repeat(2, auto)", gap: "0.75em" },
    render: () =>
      [0, 1, 2, 3].map((index) =>
        part(index, "shape", square("2em", "0.25em"), {
          name: "shrink",
          duration: 1.5,
          delay: index * 0.2,
        }),
      ),
  },
  "floating-diamonds": {
    root: { gap: "1em" },
    // The source's rotate-45 is the `rotate` property, which composes outside
    // Framer's transform, so each diamond bobs along its own rotated axis.
    render: () =>
      [0, 1, 2].map((index) =>
        part(index, "shape", square("1.5em", "0.25em", { rotate: "45deg" }), {
          name: "float",
          duration: 1,
          delay: index * 0.2,
        }),
      ),
  },
  "pulse-square": {
    root: {},
    render: () =>
      part("s", "outline", square("4em", "20%", { borderWidth: "0.5em" }), {
        name: "pulse",
        duration: 1.5,
      }),
  },
  pendulum: {
    root: { width: "8em", height: "6em", alignItems: "flex-start" },
    render: () => [
      part("beam", "shape", {
        position: "absolute",
        top: 0,
        width: "100%",
        height: "0.5em",
        borderRadius: "9999px 9999px 0 0",
        opacity: 0.2,
      }),
      part(
        "arm",
        "group",
        {
          position: "absolute",
          top: 0,
          left: "calc(50% - 0.25em)",
          width: "0.5em",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          transformOrigin: "top",
        },
        { name: "swing", duration: 1.5 },
        [
          part("rod", "shape", { width: "0.5em", height: "4em", borderRadius: 0 }),
          part("bob", "shape", BOX("2em")),
        ],
      ),
    ],
  },
  "hexagon-spinner": {
    root: {},
    render: () =>
      svg("5em", "5em", "0 0 50 50", [
        stroke("track", "polygon", HEXAGON, { strokeWidth: 4 }),
        stroke(
          "line",
          "polygon",
          HEXAGON,
          { strokeWidth: 4, strokeLinecap: "round", strokeDasharray: 120 },
          { name: "dash-120", duration: 2, ease: "linear" },
        ),
      ]),
  },
  "wandering-cube": {
    root: BOX("5em"),
    render: () =>
      part("s", "shape", square("2em", "0.25em", { position: "absolute", top: 0, left: 0 }), {
        name: "wander",
        duration: 2.5,
      }),
  },
  hourglass: {
    root: {},
    render: () =>
      part(
        "glass",
        "group",
        {
          width: "4em",
          height: "5em",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
        },
        { name: "hourglass", duration: 3 },
        [
          part("top", "frame", {
            width: "4em",
            height: 0,
            borderStyle: "solid",
            borderWidth: "2em 2em 0",
            borderColor: "currentColor transparent transparent",
          }),
          part("bottom", "frame", {
            width: "4em",
            height: 0,
            borderStyle: "solid",
            borderWidth: "0 2em 2em",
            borderColor: "transparent transparent currentColor",
          }),
        ],
      ),
  },
  "rotating-triangle": {
    root: {},
    render: () =>
      svg(
        "5em",
        "5em",
        "0 0 50 50",
        stroke(
          "line",
          "polygon",
          TRIANGLE,
          { strokeWidth: 4, strokeLinejoin: "round" },
          { name: "spin", duration: 2, ease: "linear" },
        ),
      ),
  },
  "bouncing-square": {
    root: { width: "5em", height: "6em", alignItems: "flex-end" },
    render: () => [
      part("shadow", "shape", {
        position: "absolute",
        bottom: 0,
        width: "4em",
        height: "0.5em",
        opacity: 0.2,
        filter: "blur(0.5em)",
      }),
      part("s", "shape", square("3em", "0.25em", { transformOrigin: "bottom" }), {
        name: "hop",
        duration: 0.6,
      }),
    ],
  },
  "breathing-square": {
    root: {},
    render: () => part("s", "shape", square("4em", "0%"), { name: "breathe", duration: 2 }),
  },
  "diamond-grid": {
    root: {},
    render: () =>
      part(
        "grid",
        "frame",
        {
          display: "grid",
          gridTemplateColumns: "repeat(2, auto)",
          gap: "1em",
          rotate: "45deg",
        },
        undefined,
        [0, 1, 2, 3].map((index) =>
          part(index, "shape", square("1.5em", "0.25em"), {
            name: "shrink",
            duration: 1.5,
            delay: index * 0.2,
          }),
        ),
      ),
  },
  "square-snake": {
    root: {
      ...BOX("5em"),
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gridTemplateRows: "repeat(3, 1fr)",
      gap: "0.5em",
      // The family root centres its children; these cells are sized by the
      // grid tracks, so they must stretch into them or they collapse to 0.
      alignItems: "stretch",
      justifyContent: "stretch",
    },
    render: () =>
      Array.from({ length: 9 }, (_, index) =>
        part(
          index,
          "shape",
          { borderRadius: "0.25em" },
          {
            name: "flicker",
            duration: 1.5,
            delay: ((index % 3) + Math.floor(index / 3)) * 0.15,
          },
        ),
      ),
  },
  "infinity-path": {
    root: {},
    render: () =>
      svg("6em", "3em", "0 0 60 30", [
        stroke("track", "path", INFINITY, { strokeWidth: 4, strokeLinecap: "round" }),
        stroke(
          "line",
          "path",
          INFINITY,
          { strokeWidth: 4, strokeLinecap: "round", strokeDasharray: 100 },
          { name: "dash-100", duration: 2, ease: "linear" },
        ),
      ]),
  },
  "morphing-infinity": {
    root: { width: "6em", height: "3em", justifyContent: "space-between" },
    render: () => [
      part(
        "a",
        "outline",
        { ...BOX("3em"), borderWidth: "0.25em" },
        {
          name: "loop-a",
          duration: 2,
        },
      ),
      part(
        "b",
        "outline",
        { ...BOX("3em"), borderWidth: "0.25em", position: "absolute", top: 0, left: 0 },
        {
          name: "loop-b",
          duration: 2,
        },
      ),
    ],
  },
  "zig-zag-pulse": {
    root: {
      ...BOX("6em"),
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gridTemplateRows: "repeat(3, 1fr)",
      gap: "1em",
    },
    render: () =>
      [
        [0, 0],
        [1, 1],
        [2, 0],
        [0, 2],
        [1, 1],
        [2, 2],
      ].map(([column = 0, row = 0], index) =>
        part(
          index,
          "shape",
          { ...BOX("1.25em"), gridColumn: column + 1, gridRow: row + 1 },
          {
            name: "fade",
            duration: 1.2,
            delay: index * 0.1,
          },
        ),
      ),
  },
  "pumping-heart": {
    root: {},
    render: () =>
      svg("4em", "4em", "0 0 24 24", <path data-part="fill" d={HEART} />, {
        name: "pump",
        duration: 1.5,
      }),
  },
  heartbeat: {
    root: {},
    render: () =>
      svg(
        "8em",
        "4em",
        "0 0 64 32",
        stroke(
          "line",
          "polyline",
          "0,16 16,16 24,4 32,28 40,16 64,16",
          {
            strokeWidth: 2,
            strokeLinecap: "round",
            strokeLinejoin: "round",
            strokeDasharray: 100,
          },
          { name: "dash-100", duration: 2, ease: "linear" },
        ),
      ),
  },
  "spiral-spinner": {
    root: {},
    render: () =>
      part(
        "s",
        "outline",
        { ...BOX("5em"), borderWidth: "0.375em", borderTopColor: "transparent" },
        { name: "spiral", duration: 1.5 },
      ),
  },
  "concentric-squares": {
    root: BOX("6em"),
    render: () => [
      part(
        "outer",
        "outline",
        square("6em", "0.25em", { position: "absolute", borderWidth: "0.25em" }),
        {
          name: "nest-outer",
          duration: 2,
        },
      ),
      part(
        "inner",
        "outline",
        square("3em", "0.25em", { position: "absolute", borderWidth: "0.25em", opacity: 0.6 }),
        { name: "nest-inner", duration: 2 },
      ),
    ],
  },
  "rotating-cross": {
    root: {},
    render: () =>
      part("cross", "group", BOX("4em"), { name: "half-turn", duration: 0.8 }, [
        part("h", "shape", {
          position: "absolute",
          top: "calc(50% - 0.375em)",
          width: "100%",
          height: "0.75em",
          borderRadius: "0.25em",
        }),
        part("v", "shape", {
          position: "absolute",
          left: "calc(50% - 0.375em)",
          height: "100%",
          width: "0.75em",
          borderRadius: "0.25em",
        }),
      ]),
  },
  "icon-morph": {
    root: {},
    render: () => part("s", "shape", square("4em", "20%"), { name: "icon", duration: 2 }),
  },
  "smooth-rounded-square": {
    root: {},
    render: () =>
      part("s", "outline", square("5em", "10%", { borderWidth: "0.375em" }), {
        name: "round",
        duration: 2,
      }),
  },
  "cube-flip-spring": {
    root: {},
    render: () =>
      part("s", "shape", square("4em", "1em"), { name: "cube", duration: 2, ease: OVERSHOOT }),
  },
  "origami-shape": {
    root: BOX("5em"),
    render: () => [
      part(
        "a",
        "shape",
        square("2.5em", "0.75em 0 0 0", {
          position: "absolute",
          top: 0,
          left: 0,
          transformOrigin: "right",
        }),
        { name: "fold", duration: 2 },
      ),
      part(
        "b",
        "shape",
        square("2.5em", "0 0 0.75em 0", {
          position: "absolute",
          bottom: 0,
          right: 0,
          transformOrigin: "left",
          opacity: 0.6,
        }),
        { name: "fold", duration: 2 },
      ),
    ],
  },
  "diamond-rotate-spring": {
    root: {},
    render: () =>
      part("s", "shape", square("4em", "0.25em"), {
        name: "diamond",
        duration: 2,
        ease: OVERSHOOT,
      }),
  },
  "shape-shift-grid": {
    root: {
      ...BOX("4em"),
      display: "grid",
      gridTemplateColumns: "repeat(2, 1fr)",
      gridTemplateRows: "repeat(2, 1fr)",
      gap: "0.5em",
    },
    render: () =>
      [0, 1, 2, 3].map((index) =>
        part(
          index,
          "shape",
          { borderRadius: "10%" },
          {
            name: "shift",
            duration: 1.5,
            delay: index * 0.1,
          },
        ),
      ),
  },
  "spring-hexagon": {
    root: {},
    render: () =>
      svg("5em", "5em", "0 0 50 50", <polygon data-part="fill" points={HEXAGON} />, {
        name: "hex",
        duration: 2,
        ease: OVERSHOOT,
      }),
  },
  "elastic-square": {
    root: {
      ...BOX("6em"),
      alignItems: "flex-end",
      borderBottom: "0.25em solid color-mix(in oklab, currentColor 20%, transparent)",
    },
    render: () =>
      part("s", "shape", square("3em", "0.25em", { transformOrigin: "bottom" }), {
        name: "elastic",
        duration: 0.8,
      }),
  },
  "minimal-triangle": {
    root: {},
    render: () =>
      svg("5em", "5em", "0 0 50 50", [
        stroke("track", "polygon", TRIANGLE, { strokeWidth: 3 }),
        stroke(
          "line",
          "polygon",
          TRIANGLE,
          { strokeWidth: 3, strokeDasharray: 120 },
          { name: "dash-tri", duration: 2 },
        ),
      ]),
  },
  "fluid-diamond": {
    root: {},
    render: () => part("s", "shape", square("3em", "0.25em"), { name: "fluid", duration: 1.5 }),
  },
};
