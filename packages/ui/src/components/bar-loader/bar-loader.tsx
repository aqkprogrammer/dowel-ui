// Ported from amicro "Bars & Waves" and "Wave Physics" (MIT, © 2026 Syed Subhan Uddin) and
// the SmoothUI AI Loader "bar" variant (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
//
// Renamed from the source: "Siri Wave" → voice-wave, "Apple EQ" → equalizer,
// "Sound Wave" (apple-sound-wave) → sound-wave, SmoothUI "bar" → indeterminate.
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentPropsWithRef, CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

/*
 * Same shape as the dots loader (ADR 0014): geometry in `em` so `size` scales
 * the whole loader, colour from `currentColor`, keyframes hoisted through
 * React's <style>, every duration and delay scaled by --motion-scale-indicator,
 * and `direction: ltr` so a sweep never mirrors into running backwards.
 */

const PREFIX = "dowel-bar-loader";

/** A delay or duration in seconds, scaled for reduced motion. */
function scaled(seconds: number): string {
  return `calc(${String(seconds)}s * var(--motion-scale-indicator, 1))`;
}

const STYLES = `
.${PREFIX}{direction:ltr;position:relative;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;color:inherit}
.${PREFIX} [data-part]{display:block;flex-shrink:0;border-radius:9999px;background:currentColor;animation-iteration-count:infinite;animation-timing-function:ease-in-out;animation-fill-mode:backwards;animation-duration:var(--dur);animation-delay:var(--delay,0s)}
.${PREFIX} [data-part=static]{animation:none}
.${PREFIX} [data-part=group]{background:transparent;border-radius:0}
.${PREFIX} [data-part=track]{position:relative;overflow:hidden;background:color-mix(in oklab,currentColor 15%,transparent);animation:none}
.${PREFIX} [data-part=frame]{position:relative;overflow:hidden;box-sizing:border-box;background:transparent;border:.25em solid currentColor;animation:none}
@keyframes ${PREFIX}-grow{0%,100%{height:var(--from)}50%{height:var(--to)}}
@keyframes ${PREFIX}-scale-y{0%,100%{transform:scaleY(var(--from))}50%{transform:scaleY(var(--to))}}
@keyframes ${PREFIX}-scale-x{0%,100%{transform:scaleX(var(--from))}50%{transform:scaleX(var(--to))}}
@keyframes ${PREFIX}-turn{0%,100%{transform:scaleY(.5) rotate(var(--r))}50%{transform:scaleY(1.5) rotate(var(--r))}}
@keyframes ${PREFIX}-sway{0%,100%{transform:scaleY(.8) rotate(-15deg)}50%{transform:scaleY(1) rotate(15deg)}}
@keyframes ${PREFIX}-slide{0%,100%{transform:translate(0,0)}50%{transform:translate(var(--x,0),var(--y,0))}}
@keyframes ${PREFIX}-stack{0%,100%{opacity:.2;width:50%}50%{opacity:1;width:100%}}
@keyframes ${PREFIX}-gap{0%,100%{gap:1em}50%{gap:.5em}}
@keyframes ${PREFIX}-conveyor{from{transform:translateX(0)}to{transform:translateX(-4em)}}
@keyframes ${PREFIX}-indeterminate{from{transform:translateX(-100%)}to{transform:translateX(200%)}}
`;

/*
 * Wave Physics. The source precomputes 201 framer-motion keyframes from a
 * closed-form formula (no simulation): a ball rides back and forth over 15 bars
 * in 4s, bouncing four times each way, and the bars swell under it and dent
 * where it lands. The same formula generates CSS keyframes here — one per bar,
 * plus the ball's travel and its 0.5s bounce — and they ship in their own
 * stylesheet so the other variants don't carry them.
 */
const PHYSICS_BARS = 15;
const PHYSICS_FRAMES = 81;
const PHYSICS_BOUNCES = 4;

/** Ball height (px above the floor) and squash for a bounce phase 0..1. */
function bounce(phase: number) {
  const hop = 4 * phase * (1 - phase);
  const squash = Math.max(0, 1 - hop * 2);
  return { hop, squash, lift: 16 + 48 - squash * 20 + hop * 60 };
}

function round(value: number): string {
  return String(Math.round(value * 1000) / 1000);
}

function physicsStyles(): string {
  const bars: { pct: string; rule: string }[][] = Array.from(
    { length: PHYSICS_BARS },
    () => [],
  );
  for (let frame = 0; frame < PHYSICS_FRAMES; frame++) {
    const t = frame / (PHYSICS_FRAMES - 1);
    const across = t < 0.5 ? t / 0.5 : (1 - t) / 0.5;
    const ball = across * (PHYSICS_BARS - 1);
    const phase = across === 0 || across === 1 ? 0 : (across * PHYSICS_BOUNCES) % 1;
    const { squash } = bounce(phase);
    for (let index = 0; index < PHYSICS_BARS; index++) {
      const distance = Math.abs(index - ball);
      const swell = distance < 3 ? Math.cos((distance / 3) * (Math.PI / 2)) : 0;
      const dent =
        distance < 1.5 ? Math.cos((distance / 1.5) * (Math.PI / 2)) * squash * 20 : 0;
      const height = Math.max(4, 16 + swell * 48 - dent) / 8;
      bars[index]?.push({
        pct: `${round(t * 100)}%`,
        rule: `{height:${round(height)}em;opacity:${round(0.15 + swell * 0.85)}}`,
      });
    }
  }
  const barFrames = bars.map((stops, index) => {
    // Keep only the stops where something changes; the rest interpolate flat.
    const kept = stops.filter(
      (stop, at) =>
        at === 0 ||
        at === stops.length - 1 ||
        stop.rule !== stops[at - 1]?.rule ||
        stop.rule !== stops[at + 1]?.rule,
    );
    return `@keyframes ${PREFIX}-physics-${String(index)}{${kept.map((stop) => stop.pct + stop.rule).join("")}}`;
  });
  const hop = Array.from({ length: 21 }, (_, step) => {
    const { lift, squash } = bounce(step / 20);
    return `${String(step * 5)}%{transform:translateY(-${round(lift / 8)}em) scale(${round(1 + squash * 0.25)},${round(1 - squash * 0.3)})}`;
  });
  return [
    ...barFrames,
    `@keyframes ${PREFIX}-physics-x{0%,100%{transform:translateX(0)}50%{transform:translateX(${String((PHYSICS_BARS - 1) * 2.5)}em)}}`,
    `@keyframes ${PREFIX}-physics-hop{${hop.join("")}}`,
  ].join("\n");
}

const PHYSICS_STYLES = physicsStyles();

type Vars = CSSProperties & Record<`--${string}`, string>;

type Variant = {
  /**
   * Layout of the root, inline rather than as utilities. The hoisted stylesheet
   * is unlayered, so it outranks Tailwind's layered utilities whatever their
   * specificity; inline styles are the one thing that reliably outranks it.
   */
  root: CSSProperties;
  render: () => ReactNode;
};

/** A moving part, with its keyframe, duration and delay. */
function part(
  key: number | string,
  animation: string,
  duration: number,
  delay: number,
  style: Vars,
  name = "bar",
): ReactNode {
  return (
    <span
      key={key}
      data-part={name}
      style={{
        ...style,
        animationName: `${PREFIX}-${animation}`,
        ["--dur" as string]: scaled(duration),
        ["--delay" as string]: scaled(delay),
      }}
    />
  );
}

/** Bars whose height breathes between `from` and `to`. */
function grow(
  delays: readonly number[],
  width: string,
  from: string,
  to: string,
  duration: number,
  extra: Vars = {},
): ReactNode {
  return delays.map((delay, index) =>
    part(index, "grow", duration, delay, { width, ["--from"]: from, ["--to"]: to, ...extra }),
  );
}

/** Full-width lines that stretch from their start edge. */
function lines(
  count: number,
  height: string,
  from: number,
  duration: number,
  stagger: number,
): ReactNode {
  return Array.from({ length: count }, (_, index) =>
    part(index, "scale-x", duration, index * stagger, {
      width: "100%",
      height,
      transformOrigin: "left",
      ["--from"]: String(from),
      ["--to"]: "1",
    }),
  );
}

const stagger = (count: number, step: number) =>
  Array.from({ length: count }, (_, index) => Math.round(index * step * 1000) / 1000);

const VARIANTS = {
  cascade: {
    root: { height: "4em", gap: "0.5em" },
    render: () => grow(stagger(5, 0.1), "0.75em", "1em", "3em", 1),
  },
  bouncing: {
    root: { height: "4em", gap: "0.75em" },
    render: () =>
      stagger(3, 0.2).map((delay, index) =>
        part(index, "scale-y", 1, delay, {
          width: "0.75em",
          height: "4em",
          ["--from"]: "0.3",
          ["--to"]: "1",
        }),
      ),
  },
  symmetric: {
    root: { height: "5em", gap: "0.75em" },
    render: () =>
      grow(
        [0, 1, 2, 3, 4, 3, 2, 1, 0].map((step) => step * 0.1),
        "0.75em",
        "1em",
        "3em",
        1.2,
      ),
  },
  sweep: {
    root: {},
    render: () => (
      <span
        data-part="frame"
        style={{ width: "6em", height: "3em", padding: "0.5em", borderRadius: "9999px" }}
      >
        {part("thumb", "slide", 1.5, 0, {
          position: "absolute",
          top: 0,
          bottom: 0,
          left: "0.5em",
          margin: "auto 0",
          width: "2em",
          height: "2em",
          ["--x"]: "3em",
        })}
      </span>
    ),
  },
  circular: {
    root: { width: "5em", height: "5em" },
    render: () =>
      stagger(8, 0.15).map((delay, index) =>
        part(index, "turn", 1.2, delay, {
          position: "absolute",
          top: 0,
          left: "2.25em",
          width: "0.5em",
          height: "1.5em",
          transformOrigin: "0.25em 2.5em",
          ["--r"]: `${String(index * 45)}deg`,
        }),
      ),
  },
  accordion: {
    root: { flexDirection: "column", width: "5em", height: "5em", gap: "0.75em" },
    render: () =>
      stagger(4, 0.15).map((delay, index) =>
        part(index, "scale-x", 1.5, delay, {
          width: "100%",
          height: "0.5em",
          transformOrigin: "left",
          ["--from"]: "1",
          ["--to"]: "0.2",
        }),
      ),
  },
  "square-accordion": {
    root: { width: "6em", height: "6em", gap: "0.5em" },
    render: () =>
      grow(stagger(3, 0.2), "1.5em", "1.5em", "4em", 1.5, { borderRadius: "0.25em" }),
  },
  conveyor: {
    root: {},
    render: () => (
      <span data-part="track" style={{ width: "8em", height: "1.5em", borderRadius: "9999px" }}>
        <span
          data-part="group"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            height: "100%",
            display: "flex",
            alignItems: "center",
            gap: "1em",
            animationName: `${PREFIX}-conveyor`,
            animationTimingFunction: "linear",
            ["--dur" as string]: scaled(1),
          }}
        >
          {Array.from({ length: 8 }, (_, index) => (
            <span
              key={index}
              data-part="static"
              style={{ width: "0.75em", height: "0.75em" }}
            />
          ))}
        </span>
      </span>
    ),
  },
  lines: {
    root: { flexDirection: "column", width: "4em", gap: "0.75em" },
    render: () => lines(3, "0.75em", 0.3, 1, 0.2),
  },
  "voice-wave": {
    root: { height: "4em", gap: "0.5em" },
    render: () => grow(stagger(5, 0.1), "0.5em", "0.5em", "3em", 1.2),
  },
  equalizer: {
    root: { height: "4em", alignItems: "flex-end", gap: "0.5em" },
    // The source draws each delay from Math.random() * 0.5 on every render,
    // which cannot hydrate; these are four fixed draws from the same range.
    render: () =>
      grow([0.31, 0.07, 0.42, 0.18], "0.75em", "20%", "100%", 0.8, {
        borderRadius: "0.25em 0.25em 0 0",
        animationTimingFunction: "cubic-bezier(0.85, 0, 0.15, 1)",
      }),
  },
  spring: {
    root: { flexDirection: "column", width: "5em", gap: "1em" },
    render: () => lines(3, "0.75em", 0.2, 1.4, 0.15),
  },
  fluid: {
    root: { gap: "0.5em" },
    render: () =>
      stagger(4, 0.1).map((delay, index) =>
        part(index, "sway", 1.5, delay, {
          width: "0.75em",
          height: "4em",
          transformOrigin: "bottom",
        }),
      ),
  },
  morphing: {
    root: { height: "4em" },
    render: () => (
      <span
        data-part="group"
        style={{
          display: "flex",
          alignItems: "center",
          animationName: `${PREFIX}-gap`,
          ["--dur" as string]: scaled(2),
        }}
      >
        {grow([0, 0, 0], "1em", "4em", "2em", 2, { borderRadius: "0.25em" })}
      </span>
    ),
  },
  stacked: {
    root: { flexDirection: "column", width: "4em", gap: "0.5em" },
    render: () =>
      stagger(3, 0.2).map((delay, index) =>
        part(index, "stack", 1.5, delay, { height: "0.5em" }),
      ),
  },
  waveform: {
    root: { height: "4em", gap: "0.25em" },
    render: () =>
      grow(
        stagger(8, 1).map((index) => Math.round(Math.sin(index) * 500) / 1000),
        "0.5em",
        "0.5em",
        "3em",
        1,
      ),
  },
  elastic: {
    root: { height: "5em", gap: "1em" },
    render: () => grow(stagger(3, 0.15), "1em", "1em", "4.5em", 1.1),
  },
  sliding: {
    root: { width: "4em", height: "4em" },
    render: () => [
      part("top", "slide", 1.5, 0, {
        position: "absolute",
        top: 0,
        left: 0,
        width: "4em",
        height: "0.75em",
        ["--y"]: "3em",
      }),
      part("bottom", "slide", 1.5, 0, {
        position: "absolute",
        bottom: 0,
        left: 0,
        width: "4em",
        height: "0.75em",
        opacity: 0.5,
        ["--y"]: "-3em",
      }),
    ],
  },
  "sound-wave": {
    root: { height: "4em", gap: "0.5em" },
    render: () =>
      [1, 2, 3, 2, 1].map((peak, index) =>
        part(index, "grow", 1, index * 0.1, {
          width: "0.5em",
          ["--from"]: "0.5em",
          ["--to"]: `${String(peak)}em`,
        }),
      ),
  },
  "wave-physics": {
    // The source is a 36.5em stage — five times its siblings. Drawn at 0.4 of
    // the family's scale so it sits in the same space and still follows `size`.
    root: { height: "6.8em", alignItems: "flex-end" },
    render: () => (
      <>
        <style href={`${PREFIX}-physics`} precedence="dowel">
          {PHYSICS_STYLES}
        </style>
        <span
          data-part="group"
          style={{
            position: "relative",
            display: "flex",
            alignItems: "flex-end",
            gap: "1em",
            width: "36.5em",
            fontSize: "0.4em",
          }}
        >
          {Array.from({ length: PHYSICS_BARS }, (_, index) =>
            part(index, `physics-${String(index)}`, 4, 0, {
              width: "1.5em",
              animationTimingFunction: "linear",
            }),
          )}
          <span
            data-part="group"
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              zIndex: 1,
              animationName: `${PREFIX}-physics-x`,
              animationTimingFunction: "linear",
              ["--dur" as string]: scaled(4),
            }}
          >
            {part(
              "ball",
              "physics-hop",
              4 / (PHYSICS_BOUNCES * 2),
              0,
              {
                width: "1.5em",
                height: "1.5em",
                transformOrigin: "bottom center",
                animationTimingFunction: "linear",
              },
              "ball",
            )}
          </span>
        </span>
      </>
    ),
  },
  indeterminate: {
    root: {},
    // A sweep, not a percentage: it must never fake determinate progress.
    render: () => (
      <span
        data-part="track"
        style={{ width: "12em", height: "0.5em", borderRadius: "9999px" }}
      >
        {part("sweep", "indeterminate", 1.68, 0, {
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 0,
          width: "33.333%",
          animationTimingFunction: "cubic-bezier(0.645, 0.045, 0.355, 1)",
        })}
      </span>
    ),
  },
} satisfies Record<string, Variant>;

export type BarLoaderVariant = keyof typeof VARIANTS;

/** Every variant, in catalogue order. Stories and tests iterate this. */
export const barLoaderVariantNames = Object.keys(VARIANTS) as BarLoaderVariant[];

const barLoaderVariants = cva("", {
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

export interface BarLoaderProps
  extends
    Omit<ComponentPropsWithRef<"span">, "children">,
    VariantProps<typeof barLoaderVariants> {
  /** Which animation to play. */
  variant?: BarLoaderVariant;
  /**
   * Announced to assistive technology while the loader is visible.
   *
   * Omit it when the loader sits inside something that already reports its
   * busy state — announcing twice is worse than not announcing at all.
   */
  label?: string;
}

/** An indeterminate loading indicator made of bars, in 21 motions. */
export function BarLoader({
  className,
  size,
  variant = "cascade",
  label,
  style,
  ...props
}: BarLoaderProps) {
  const spec: Variant = VARIANTS[variant];

  return (
    <>
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      <span
        aria-hidden="true"
        data-slot="bar-loader"
        data-variant={variant}
        // Exempt from the reduced-motion blanket: a loader that stops says the
        // application has hung. It is slowed instead — see ADR 0014.
        data-motion="indicator"
        className={cn(PREFIX, barLoaderVariants({ size }), className)}
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

export { barLoaderVariants };
