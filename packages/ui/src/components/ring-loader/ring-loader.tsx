// Ported from amicro "Rings & Spinners" (MIT, © 2026 Syed Subhan Uddin). See THIRD_PARTY_NOTICES.md.
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentPropsWithRef, CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

/*
 * Same shape as the dots loader (ADR 0014): geometry in `em` (source px ÷ 8),
 * colour from `currentColor`, keyframes shipped through React's hoisted
 * <style>, every duration and delay scaled by --motion-scale-indicator, and
 * `direction: ltr` on the root so a clockwise spin stays clockwise in RTL.
 *
 * Renamed from the source: "iOS Spinner" → `petals`.
 *
 * Where the source animates two properties with different easing (Dual Arc,
 * Morphing Ring), each property gets its own keyframe and the part lists both
 * names, so each keeps its own timing function.
 */

const PREFIX = "dowel-ring-loader";

/** A delay or duration in seconds, scaled for reduced motion. */
function scaled(seconds: number): string {
  return `calc(${String(seconds)}s * var(--motion-scale-indicator, 1))`;
}

/** currentColor at a given strength — the faint track and secondary strokes. */
function faint(percent: number): string {
  return `color-mix(in oklab, currentColor ${String(percent)}%, transparent)`;
}

const STYLES = `
.${PREFIX}{direction:ltr;position:relative;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;color:inherit}
.${PREFIX} [data-part]{display:block;box-sizing:border-box;flex-shrink:0;border-radius:9999px;background:currentColor;animation-iteration-count:infinite;animation-timing-function:linear;animation-duration:var(--dur);animation-delay:var(--delay,0s)}
.${PREFIX} [data-part=static]{animation:none}
.${PREFIX} [data-part=ring],.${PREFIX} [data-part=track]{background:transparent;border-style:solid;border-color:currentColor}
.${PREFIX} [data-part=track]{animation:none}
.${PREFIX} [data-part=layer]{position:absolute;inset:0;background:transparent;border-radius:0}
.${PREFIX} [data-part=frame]{background:transparent;border-radius:0;animation:none;overflow:visible}
.${PREFIX} [data-part=svg]{background:transparent;border-radius:0;overflow:visible}
.${PREFIX} [data-part=stroke]{background:none;border-radius:0}
@keyframes ${PREFIX}-spin{to{transform:rotate(360deg)}}
@keyframes ${PREFIX}-spin-reverse{to{transform:rotate(-360deg)}}
@keyframes ${PREFIX}-half-turn{from{transform:rotate(0deg)}to{transform:rotate(180deg)}}
@keyframes ${PREFIX}-quarter-turn{from{transform:rotate(0deg)}to{transform:rotate(90deg)}}
@keyframes ${PREFIX}-quarters{0%{transform:rotate(0deg)}25%{transform:rotate(90deg)}50%{transform:rotate(180deg)}75%{transform:rotate(270deg)}100%{transform:rotate(360deg)}}
@keyframes ${PREFIX}-flip{0%{transform:rotate(0deg)}50%{transform:rotate(180deg)}100%{transform:rotate(360deg)}}
@keyframes ${PREFIX}-flip-reverse{0%{transform:rotate(0deg)}50%{transform:rotate(-180deg)}100%{transform:rotate(-360deg)}}
@keyframes ${PREFIX}-fade-out{from{opacity:1}to{opacity:.2}}
@keyframes ${PREFIX}-dot-pulse{0%,100%{transform:rotate(var(--angle)) scale(1);opacity:1}50%{transform:rotate(var(--angle)) scale(.5);opacity:.3}}
@keyframes ${PREFIX}-tumble-a{from{transform:rotateX(0deg) rotateY(0deg)}to{transform:rotateX(360deg) rotateY(180deg)}}
@keyframes ${PREFIX}-tumble-b{from{transform:rotateX(0deg) rotateY(0deg)}to{transform:rotateX(180deg) rotateY(360deg)}}
@keyframes ${PREFIX}-pinch{0%,100%{scale:1}50%{scale:.82}}
@keyframes ${PREFIX}-trace{0%{stroke-dashoffset:125}50%{stroke-dashoffset:0}100%{stroke-dashoffset:-125}}
@keyframes ${PREFIX}-morph{0%,100%{border-radius:10%}50%{border-radius:50%}}
@keyframes ${PREFIX}-expand{from{transform:scale(.1);opacity:1}to{transform:scale(1.25);opacity:0}}
@keyframes ${PREFIX}-breathe{0%,100%{transform:scale(.8);border-width:.75em}50%{transform:scale(1.1);border-width:.25em}}
@keyframes ${PREFIX}-spiral{0%{transform:rotate(0deg) scale(1)}50%{transform:rotate(180deg) scale(1.1)}100%{transform:rotate(360deg) scale(1)}}
`;

type Variant = {
  /** Layout of the root, inline so it outranks the unlayered hoisted stylesheet. */
  root: CSSProperties;
  render: () => ReactNode;
};

type Motion = {
  /** One keyframe name, or several separated by commas. */
  name: string;
  duration: number;
  delay?: number;
  /** One timing function, or one per keyframe name. Defaults to linear. */
  ease?: string;
};

const EASE_IN_OUT = "ease-in-out";
/** The source's `type: "spring", bounce: 0.4`, as an overshooting curve per step. */
const SPRING = "cubic-bezier(0.34, 1.56, 0.64, 1)";

/** A part of the loader, with its keyframes, duration and delay. */
function part(
  key: number | string,
  kind: string,
  style: CSSProperties,
  motion?: Motion,
  children?: ReactNode,
): ReactNode {
  const css: CSSProperties & Record<`--${string}`, string> = { ...style };
  if (motion) {
    css.animationName = motion.name
      .split(",")
      .map((name) => `${PREFIX}-${name.trim()}`)
      .join(", ");
    if (motion.ease) css.animationTimingFunction = motion.ease;
    css["--dur"] = scaled(motion.duration);
    css["--delay"] = scaled(motion.delay ?? 0);
  }
  return (
    <span key={key} data-part={motion ? kind : kind === "ring" ? "track" : kind} style={css}>
      {children}
    </span>
  );
}

/** A bordered circle; `colors` is the four-side border-color shorthand. */
function ring(
  key: number | string,
  size: string,
  width: string,
  colors: string,
  motion?: Motion,
  extra: CSSProperties = {},
): ReactNode {
  return part(
    key,
    "ring",
    { width: size, height: size, borderWidth: width, borderColor: colors, ...extra },
    motion,
  );
}

const ABSOLUTE: CSSProperties = { position: "absolute" };

function box(size: string): CSSProperties {
  return { width: size, height: size };
}

/** Twelve bars around a centre, fading in turn. */
function blades(width: string, height: string, radius: string): ReactNode {
  return Array.from({ length: 12 }, (_, index) =>
    part(
      index,
      "bar",
      {
        position: "absolute",
        top: 0,
        left: `calc(50% - ${width} / 2)`,
        width,
        height,
        transformOrigin: `calc(${width} / 2) ${radius}`,
        transform: `rotate(${String(index * 30)}deg)`,
      },
      { name: "fade-out", duration: 1, delay: index / 12 },
    ),
  );
}

/** An SVG ring: a faint track and a stroked arc, in a viewBox of `view`. */
function svg(size: string, view: number, circles: ReactNode, motion?: Motion): ReactNode {
  const css: CSSProperties & Record<`--${string}`, string> = { width: size, height: size };
  if (motion) {
    css.animationName = `${PREFIX}-${motion.name}`;
    css["--dur"] = scaled(motion.duration);
    css["--delay"] = scaled(motion.delay ?? 0);
  }
  return (
    <svg
      data-part={motion ? "svg" : "frame"}
      viewBox={`0 0 ${String(view)} ${String(view)}`}
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
      style={css}
    >
      {circles}
    </svg>
  );
}

/** Keeps the variant names as literal keys while typing each entry as a plain Variant. */
function defineVariants<Name extends string>(variants: Record<Name, Variant>) {
  return variants;
}

const VARIANTS = defineVariants({
  classic: { root: box("4em"), render: () => blades("0.5em", "1em", "2em") },
  sweep: {
    root: {},
    render: () =>
      ring(0, "5em", "0.375em", `currentColor ${faint(20)} ${faint(20)} ${faint(20)}`, {
        name: "spin",
        duration: 1,
      }),
  },
  concentric: {
    root: box("6em"),
    render: () => [
      ring(
        0,
        "6em",
        "0.25em",
        "transparent currentColor currentColor",
        {
          name: "spin",
          duration: 2,
        },
        ABSOLUTE,
      ),
      ring(
        1,
        "4em",
        "0.25em",
        "currentColor currentColor transparent",
        {
          name: "spin-reverse",
          duration: 1.5,
        },
        { ...ABSOLUTE, opacity: 0.6 },
      ),
      ring(
        2,
        "2em",
        "0.25em",
        "currentColor currentColor currentColor transparent",
        {
          name: "spin",
          duration: 1,
        },
        { ...ABSOLUTE, opacity: 0.35 },
      ),
    ],
  },
  "dot-ring": {
    root: box("6em"),
    render: () =>
      Array.from({ length: 8 }, (_, index) =>
        part(
          index,
          "dot",
          {
            position: "absolute",
            top: 0,
            left: "calc(50% - 0.5em)",
            width: "1em",
            height: "1em",
            transformOrigin: "0.5em 3em",
            transform: `rotate(${String(index * 45)}deg)`,
            ["--angle" as string]: `${String(index * 45)}deg`,
          },
          { name: "dot-pulse", duration: 1.5, delay: index * 0.15, ease: EASE_IN_OUT },
        ),
      ),
  },
  twin: {
    root: box("6em"),
    render: () => [
      ring(
        0,
        "auto",
        "0.25em",
        "currentColor transparent transparent currentColor",
        {
          name: "spin",
          duration: 1.5,
        },
        { position: "absolute", inset: 0 },
      ),
      ring(
        1,
        "auto",
        "0.25em",
        "transparent currentColor currentColor transparent",
        {
          name: "spin-reverse",
          duration: 1.5,
        },
        { position: "absolute", inset: "1em", opacity: 0.7 },
      ),
    ],
  },
  comet: {
    root: { ...box("5em"), borderRadius: "9999px", border: `0.125em solid ${faint(15)}` },
    render: () =>
      part(
        0,
        "layer",
        {
          borderRadius: "9999px",
          background: `conic-gradient(from 0deg, transparent 0%, ${faint(10)} 60%, currentColor 100%)`,
          maskImage: "radial-gradient(closest-side, transparent 84%, black 84%)",
          WebkitMaskImage: "radial-gradient(closest-side, transparent 84%, black 84%)",
        },
        { name: "spin", duration: 1 },
      ),
  },
  swirl: {
    root: box("5em"),
    render: () => [
      ring(
        0,
        "auto",
        "0.3125em",
        `currentColor ${faint(30)} ${faint(10)} transparent`,
        {
          name: "spin",
          duration: 1.3,
        },
        { position: "absolute", inset: 0 },
      ),
      ring(
        1,
        "3em",
        "0.3125em",
        `${faint(30)} ${faint(10)} currentColor transparent`,
        {
          name: "spin-reverse",
          duration: 0.9,
        },
        ABSOLUTE,
      ),
    ],
  },
  radar: {
    root: {
      ...box("6em"),
      borderRadius: "9999px",
      border: `0.125em solid ${faint(10)}`,
      overflow: "hidden",
    },
    render: () => [
      ring("r1", "4em", "0.125em", faint(5), undefined, ABSOLUTE),
      ring("r2", "2em", "0.125em", faint(5), undefined, ABSOLUTE),
      part("core", "static", { ...ABSOLUTE, ...box("0.75em"), opacity: 0.8 }),
      part(
        "sweep",
        "layer",
        {
          background: `conic-gradient(from 0deg, transparent 50%, ${faint(2)} 65%, ${faint(10)} 85%, ${faint(45)} 100%)`,
        },
        { name: "spin", duration: 1.8 },
      ),
    ],
  },
  orbit: {
    root: box("5em"),
    render: () => [
      part("core", "static", { ...box("1em"), opacity: 0.3 }),
      part(
        "track",
        "layer",
        { borderRadius: "9999px", border: `0.125em solid ${faint(15)}` },
        { name: "spin", duration: 2 },
        part("dot", "static", {
          position: "absolute",
          top: "-0.75em",
          left: "calc(50% - 0.75em)",
          ...box("1.5em"),
        }),
      ),
    ],
  },
  "orbit-pair": {
    root: box("6em"),
    render: () => [
      part("core", "static", box("1.5em")),
      ...(["spin", "spin-reverse"] as const).map((name) =>
        part(
          name,
          "layer",
          {},
          { name, duration: 2 },
          part("dot", "static", {
            position: "absolute",
            top: 0,
            left: "calc(50% - 0.5em)",
            ...box("1em"),
            opacity: 0.6,
          }),
        ),
      ),
    ],
  },
  intersect: {
    root: { ...box("6em"), perspective: "100em" },
    render: () => [
      ring(
        0,
        "5em",
        "0.25em",
        `currentColor ${faint(30)} ${faint(10)} transparent`,
        {
          name: "tumble-a",
          duration: 2.2,
        },
        { ...ABSOLUTE, transformStyle: "preserve-3d" },
      ),
      ring(
        1,
        "5em",
        "0.25em",
        `${faint(30)} transparent currentColor ${faint(10)}`,
        {
          name: "tumble-b",
          duration: 2.2,
        },
        { ...ABSOLUTE, transformStyle: "preserve-3d" },
      ),
    ],
  },
  clock: {
    root: { ...box("5em"), borderRadius: "9999px", border: "0.25em solid currentColor" },
    render: () =>
      (
        [
          ["minute", "1.75em", 2],
          ["hour", "1.25em", 12],
        ] as const
      ).map(([key, height, duration]) =>
        part(
          key,
          "bar",
          {
            position: "absolute",
            bottom: "50%",
            left: "calc(50% - 0.125em)",
            width: "0.25em",
            height,
            transformOrigin: "50% 100%",
          },
          { name: "spin", duration },
        ),
      ),
  },
  gears: {
    root: { alignItems: "flex-start" },
    render: () => [
      ring(
        0,
        "4em",
        "0.5em",
        "currentColor",
        { name: "spin", duration: 4 },
        {
          borderStyle: "dashed",
        },
      ),
      ring(
        1,
        "3em",
        "0.375em",
        "currentColor",
        { name: "spin-reverse", duration: 3 },
        {
          borderStyle: "dashed",
          marginTop: "1.5em",
          marginLeft: "-0.5em",
          opacity: 0.6,
        },
      ),
    ],
  },
  cross: {
    root: box("4em"),
    render: () =>
      part(0, "layer", {}, { name: "quarters", duration: 2, ease: EASE_IN_OUT }, [
        part("h", "static", {
          position: "absolute",
          top: "calc(50% - 0.375em)",
          left: 0,
          width: "100%",
          height: "0.75em",
        }),
        part("v", "static", {
          position: "absolute",
          top: 0,
          left: "calc(50% - 0.375em)",
          width: "0.75em",
          height: "100%",
        }),
      ]),
  },
  line: {
    root: box("5em"),
    render: () => [
      ring("track", "5em", "0.25em", faint(20), undefined, ABSOLUTE),
      part("bar", "bar", { width: "4em", height: "0.5em" }, { name: "spin", duration: 1.2 }),
    ],
  },
  square: {
    root: {},
    render: () =>
      part(
        0,
        "ring",
        {
          ...box("4em"),
          borderWidth: "0.25em",
          borderRadius: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        },
        { name: "quarter-turn", duration: 0.6, ease: EASE_IN_OUT },
        part("core", "static", { ...box("1em"), borderRadius: 0 }),
      ),
  },
  "dual-arc": {
    root: box("4em"),
    render: () =>
      ring(
        0,
        "auto",
        "0.25em",
        "currentColor transparent",
        {
          name: "spin, pinch",
          duration: 1.2,
          ease: `linear, ${EASE_IN_OUT}`,
        },
        { position: "absolute", inset: 0 },
      ),
  },
  "fade-arc": {
    root: {},
    render: () =>
      svg(
        "4.5em",
        50,
        <>
          <circle cx="25" cy="25" r="20" strokeWidth="3.5" strokeOpacity="0.2" />
          <circle
            cx="25"
            cy="25"
            r="20"
            strokeWidth="3.5"
            strokeDasharray="80"
            strokeDashoffset="28"
            strokeLinecap="round"
          />
        </>,
        { name: "spin", duration: 1 },
      ),
  },
  dash: {
    root: {},
    render: () =>
      svg("6em", 50, <circle cx="25" cy="25" r="20" strokeWidth="3" strokeDasharray="8 8" />, {
        name: "spin",
        duration: 4,
      }),
  },
  tracer: {
    root: {},
    render: () =>
      svg(
        "5em",
        50,
        <>
          <circle cx="25" cy="25" r="20" strokeWidth="4" strokeOpacity="0.2" />
          <circle
            data-part="stroke"
            cx="25"
            cy="25"
            r="20"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray="125"
            style={
              {
                animationName: `${PREFIX}-trace`,
                animationTimingFunction: EASE_IN_OUT,
                "--dur": scaled(2),
                "--delay": scaled(0),
              } as CSSProperties
            }
          />
        </>,
      ),
  },
  petals: { root: box("4em"), render: () => blades("0.25em", "0.875em", "2em") },
  smooth: {
    root: {},
    render: () =>
      svg(
        "4.5em",
        32,
        <>
          <circle cx="16" cy="16" r="14" strokeWidth="3" strokeOpacity="0.2" />
          <circle
            cx="16"
            cy="16"
            r="14"
            strokeWidth="3"
            strokeDasharray="38 80"
            strokeLinecap="round"
          />
        </>,
        { name: "spin", duration: 1 },
      ),
  },
  morph: {
    root: {},
    render: () =>
      ring(
        0,
        "5em",
        "0.375em",
        "currentColor",
        {
          name: "half-turn, morph",
          duration: 2,
          ease: EASE_IN_OUT,
        },
        { borderRadius: "10%" },
      ),
  },
  expand: {
    root: box("6em"),
    render: () =>
      [0, 1].map((index) =>
        ring(
          index,
          "5em",
          "0.25em",
          "currentColor",
          {
            name: "expand",
            duration: 1.6,
            delay: index * 0.8,
            ease: "ease-out",
          },
          { ...ABSOLUTE, transform: "scale(0.1)" },
        ),
      ),
  },
  watch: {
    root: box("6em"),
    render: () =>
      [0, 1, 2].map((index) =>
        ring(
          index,
          `${String(5.5 - index * 1.5)}em`,
          "0.375em",
          "currentColor transparent transparent",
          {
            name: "spin",
            duration: 1 + index * 0.5,
            ease: EASE_IN_OUT,
          },
          ABSOLUTE,
        ),
      ),
  },
  gradient: {
    root: {},
    render: () =>
      part(
        0,
        "dot",
        {
          ...box("5em"),
          background: "conic-gradient(from 0deg, transparent, currentColor)",
          maskImage: "radial-gradient(transparent 55%, black 60%)",
          WebkitMaskImage: "radial-gradient(transparent 55%, black 60%)",
        },
        { name: "spin", duration: 1.2 },
      ),
  },
  breathe: {
    root: box("5em"),
    render: () =>
      ring(0, "5em", "0.5em", "currentColor", {
        name: "breathe",
        duration: 3,
        ease: EASE_IN_OUT,
      }),
  },
  offset: {
    root: box("6em"),
    render: () => [
      ring(
        0,
        "6em",
        "0.25em",
        "currentColor transparent",
        {
          name: "flip",
          duration: 2,
          ease: EASE_IN_OUT,
        },
        ABSOLUTE,
      ),
      ring(
        1,
        "4em",
        "0.25em",
        "transparent currentColor",
        {
          name: "flip-reverse",
          duration: 2,
          delay: 0.2,
          ease: EASE_IN_OUT,
        },
        { ...ABSOLUTE, opacity: 0.6 },
      ),
    ],
  },
  spiral: {
    root: {},
    render: () =>
      ring(
        0,
        "5em",
        "0.375em",
        "currentColor",
        { name: "spiral", duration: 4 },
        {
          borderStyle: "dashed",
        },
      ),
  },
  haptic: {
    root: {},
    render: () =>
      ring(0, "5em", "0.375em", `currentColor ${faint(20)} ${faint(20)} ${faint(20)}`, {
        name: "quarters",
        duration: 2,
        ease: SPRING,
      }),
  },
});

export type RingLoaderVariant = keyof typeof VARIANTS;

/** Every variant, in catalogue order. Stories and tests iterate this. */
export const ringLoaderVariantNames = Object.keys(VARIANTS) as RingLoaderVariant[];

const ringLoaderVariants = cva("", {
  variants: {
    size: {
      sm: "text-[0.25rem]",
      md: "text-[0.375rem]",
      lg: "text-[0.5rem]",
      xl: "text-[0.625rem]",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

export interface RingLoaderProps
  extends
    Omit<ComponentPropsWithRef<"span">, "children">,
    VariantProps<typeof ringLoaderVariants> {
  /** Which animation to play. */
  variant?: RingLoaderVariant;
  /**
   * Announced to assistive technology while the loader is visible.
   *
   * Omit it when the loader sits inside something that already reports its
   * busy state — announcing twice is worse than not announcing at all.
   */
  label?: string;
}

/** An indeterminate loading indicator made of rings and spinners, in 30 motions. */
export function RingLoader({
  className,
  size,
  variant = "classic",
  label,
  style,
  ...props
}: RingLoaderProps) {
  const spec: Variant = VARIANTS[variant];

  return (
    <>
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      <span
        aria-hidden="true"
        data-slot="ring-loader"
        data-variant={variant}
        // Exempt from the reduced-motion blanket: a loader that stops says the
        // application has hung. It is slowed instead — see ADR 0014.
        data-motion="indicator"
        className={cn(PREFIX, ringLoaderVariants({ size }), className)}
        style={{ ...spec.root, ...style }}
        {...props}
      >
        {spec.render()}
      </span>
      {label ? (
        <span role="status" className="sr-only">
          {label}
        </span>
      ) : null}
    </>
  );
}

export { ringLoaderVariants };
