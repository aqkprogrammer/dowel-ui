"use client";

// Original design (pattern inspired by Animate UI Gradient Background; no code referenced).
import { cva, type VariantProps } from "class-variance-authority";
import { MotionConfig, motion, useMotionValue, useSpring, useTransform } from "motion/react";
import {
  useId,
  useSyncExternalStore,
  type ComponentPropsWithRef,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

/*
 * A full-bleed animated gradient, in three moods.
 *
 * - `linear` — an oversized multi-stop gradient whose position pans slowly
 *   back and forth, so the colours slide past rather than cross-fade.
 * - `aurora` — three soft ribbons, blurred and masked to the top of the box,
 *   that sway on their own periods like curtains of light.
 * - `mesh` — four radial blooms, each orbiting its own anchor at its own
 *   speed and direction, blurred together into a living mesh gradient.
 *
 * All of it is CSS keyframes on the motion scale, multiplied by `speed`. The
 * optional `grain` is an SVG feTurbulence overlay — no image files — which
 * breaks up banding and gives the colour a printed, tactile finish.
 *
 * Reduced motion is designed for, not just tolerated. Loops have no fill
 * mode, so when the base.css blanket stops them every layer settles at its
 * static styling, and that styling is a composition in its own right: mesh
 * blooms keep their start angles (a static `rotate`, which the animated
 * `transform` composes with), ribbons keep their resting tilt.
 *
 * With `interactive`, a soft light follows the pointer on a spring — the one
 * thing here CSS cannot do honestly (ADR 0014). The pointer is read from the
 * root as events bubble, so content above stays fully interactive; touch is
 * ignored, and nothing follows under reduced motion.
 */

const PREFIX = "dowel-gradient-background";

/** A duration on the motion scale, multiplied by the `speed` variant. */
function scaled(seconds: number): string {
  return `calc(${String(seconds)}s * var(--gradient-speed, 1) * var(--motion-scale, 1))`;
}

const STYLES = `
@keyframes ${PREFIX}-pan{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
@keyframes ${PREFIX}-sway{0%,100%{transform:translate3d(0,0,0) rotate(0deg) skewX(0deg)}33%{transform:translate3d(-6%,4%,0) rotate(4deg) skewX(-8deg)}66%{transform:translate3d(5%,-3%,0) rotate(-3deg) skewX(6deg)}}
@keyframes ${PREFIX}-orbit{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
[data-slot=gradient-background-field]{position:absolute;inset:0;background-size:300% 300%;background-position:0% 50%;animation:${PREFIX}-pan ${scaled(18)} var(--ease-in-out-quint) infinite}
[data-slot=gradient-background-ribbons]{position:absolute;inset:0;mask-image:linear-gradient(to bottom,black 0%,black 45%,transparent 92%);-webkit-mask-image:linear-gradient(to bottom,black 0%,black 45%,transparent 92%)}
[data-slot=gradient-background-ribbon]{position:absolute;inset:-30% -25%;filter:blur(2.5rem);opacity:.75;transform-origin:50% 0%;animation:${PREFIX}-sway var(--ribbon-period) var(--ease-in-out-quint) infinite}
[data-slot=gradient-background-orbit]{position:absolute;inset:0;transform-origin:var(--orbit-x) var(--orbit-y);animation:${PREFIX}-orbit var(--orbit-period) linear infinite}
[data-slot=gradient-background-bloom]{position:absolute;width:var(--bloom-size);aspect-ratio:1;border-radius:9999px;translate:-50% -50%;background:radial-gradient(circle at center,var(--bloom-color) 0%,color-mix(in oklab,var(--bloom-color) 45%,transparent) 35%,transparent 68%)}
[data-slot=gradient-background-spotlight]{position:absolute;width:55%;aspect-ratio:1;border-radius:9999px;translate:-50% -50%;mix-blend-mode:soft-light;background:radial-gradient(circle at center,color-mix(in oklab,var(--color-primary-foreground) 70%,transparent) 0%,transparent 65%)}
`;

const DEFAULT_COLORS = [
  "var(--color-primary)",
  "color-mix(in oklab, var(--color-primary) 50%, var(--color-info))",
  "var(--color-info)",
  "color-mix(in oklab, var(--color-info) 60%, var(--color-success))",
];

/** Ribbon rest tilts and periods (seconds) for `aurora`. */
const RIBBONS = [
  { tilt: "-8deg", top: "-10%", seconds: 19, reverse: false },
  { tilt: "6deg", top: "4%", seconds: 25, reverse: true },
  { tilt: "-3deg", top: "16%", seconds: 31, reverse: false },
] as const;

/** Bloom anchors, radii and start angles for `mesh`. */
const BLOOMS = [
  {
    x: "28%",
    y: "30%",
    radius: "14%",
    size: "75%",
    start: "0deg",
    seconds: 23,
    reverse: false,
  },
  {
    x: "72%",
    y: "28%",
    radius: "12%",
    size: "70%",
    start: "120deg",
    seconds: 29,
    reverse: true,
  },
  {
    x: "70%",
    y: "74%",
    radius: "16%",
    size: "80%",
    start: "220deg",
    seconds: 35,
    reverse: false,
  },
  {
    x: "26%",
    y: "72%",
    radius: "11%",
    size: "65%",
    start: "300deg",
    seconds: 41,
    reverse: true,
  },
] as const;

const gradientBackgroundVariants = cva("relative isolate overflow-hidden bg-background", {
  variants: {
    variant: {
      linear: "",
      aurora: "",
      mesh: "",
    },
    /** Multiplies every loop duration. */
    speed: {
      slow: "[--gradient-speed:1.75]",
      normal: "[--gradient-speed:1]",
      fast: "[--gradient-speed:0.55]",
    },
  },
  defaultVariants: {
    variant: "linear",
    speed: "normal",
  },
});

const SPRING = { stiffness: 60, damping: 18, mass: 1.1 };

const REDUCE = "(prefers-reduced-motion: reduce)";

/** Live reduced-motion preference; false on the server, where nothing moves anyway. */
function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    (notify) => {
      const query = window.matchMedia(REDUCE);
      query.addEventListener("change", notify);
      return () => {
        query.removeEventListener("change", notify);
      };
    },
    () => window.matchMedia(REDUCE).matches,
    () => false,
  );
}

/** A 0–1 fraction of the box as a CSS percentage. */
function toPercent(fraction: number): string {
  return `${String(fraction * 100)}%`;
}

export interface GradientBackgroundProps
  extends ComponentPropsWithRef<"div">, VariantProps<typeof gradientBackgroundVariants> {
  /**
   * Gradient colours as CSS colour expressions built from tokens, e.g.
   * `"color-mix(in oklab, var(--color-primary) 60%, var(--color-info))"`.
   * Four are used; fewer repeat in order.
   */
  colors?: string[];
  /** Overlays a fine film grain (SVG noise) on the gradient. */
  grain?: boolean;
  /** Adds a soft light that follows the pointer on a spring. */
  interactive?: boolean;
  /** Classes for the decorative layer. */
  layerClassName?: string;
}

/** A full-bleed animated gradient — panning, aurora or mesh — with content rendered above. */
export function GradientBackground({
  className,
  layerClassName,
  variant,
  speed,
  colors = DEFAULT_COLORS,
  grain = false,
  interactive = false,
  children,
  onPointerMove,
  onPointerLeave,
  ...props
}: GradientBackgroundProps) {
  const reduced = usePrefersReducedMotion();
  const grainId = `${PREFIX}-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const palette = colors.length > 0 ? colors : DEFAULT_COLORS;
  const c = (index: number) => palette[index % palette.length] ?? DEFAULT_COLORS[0];
  const mood = variant ?? "linear";

  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);
  const left = useTransform(useSpring(x, SPRING), toPercent);
  const top = useTransform(useSpring(y, SPRING), toPercent);
  const follows = interactive && !reduced;

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    onPointerMove?.(event);
    if (!follows || event.pointerType === "touch") return;
    const box = event.currentTarget.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) return;
    x.set((event.clientX - box.left) / box.width);
    y.set((event.clientY - box.top) / box.height);
  }

  function handlePointerLeave(event: PointerEvent<HTMLDivElement>) {
    onPointerLeave?.(event);
    x.set(0.5);
    y.set(0.5);
  }

  let scene: ReactNode;
  if (mood === "aurora") {
    scene = (
      <div
        data-slot="gradient-background-ribbons"
        style={{ backgroundColor: `color-mix(in oklab, ${c(0)} 10%, var(--color-background))` }}
      >
        {RIBBONS.map((ribbon, index) => (
          <span
            key={ribbon.seconds}
            data-slot="gradient-background-ribbon"
            style={
              {
                "--ribbon-period": scaled(ribbon.seconds),
                top: ribbon.top,
                rotate: ribbon.tilt,
                animationDirection: ribbon.reverse ? "reverse" : undefined,
                backgroundImage: `linear-gradient(100deg, transparent 18%, ${c(index)} 32%, ${c(index + 1)} 46%, transparent 62%)`,
              } as CSSProperties
            }
          />
        ))}
      </div>
    );
  } else if (mood === "mesh") {
    scene = (
      <div
        data-slot="gradient-background-mesh"
        className="absolute inset-0"
        style={{
          backgroundColor: `color-mix(in oklab, ${c(0)} 18%, var(--color-background))`,
          filter: "blur(2rem) saturate(1.15)",
        }}
      >
        {BLOOMS.map((bloom, index) => (
          <div
            key={bloom.start}
            data-slot="gradient-background-orbit"
            style={
              {
                "--orbit-x": bloom.x,
                "--orbit-y": bloom.y,
                "--orbit-period": scaled(bloom.seconds),
                rotate: bloom.start,
                animationDirection: bloom.reverse ? "reverse" : undefined,
              } as CSSProperties
            }
          >
            <span
              data-slot="gradient-background-bloom"
              style={
                {
                  "--bloom-color": c(index),
                  "--bloom-size": bloom.size,
                  top: bloom.y,
                  // Physical, like the orbit's transform-origin: the anchor plus its
                  // radius, so the bloom circles the anchor in either direction.
                  left: `calc(${bloom.x} + ${bloom.radius})`,
                } as CSSProperties
              }
            />
          </div>
        ))}
      </div>
    );
  } else {
    scene = (
      <span
        data-slot="gradient-background-field"
        style={{
          backgroundImage: `linear-gradient(125deg, ${c(0)}, ${c(1)}, ${c(2)}, ${c(3)}, ${c(0)})`,
        }}
      />
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <div
        data-slot="gradient-background"
        data-variant={mood}
        data-interactive={follows ? "" : undefined}
        className={cn(gradientBackgroundVariants({ variant, speed }), className)}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        {...props}
      >
        <style href={PREFIX} precedence="dowel">
          {STYLES}
        </style>
        <div
          aria-hidden="true"
          data-slot="gradient-background-layer"
          className={cn("pointer-events-none absolute inset-0 overflow-hidden", layerClassName)}
        >
          {scene}
          {follows ? (
            // The measured pointer is a physical coordinate in either direction.
            <motion.span data-slot="gradient-background-spotlight" style={{ left, top }} />
          ) : null}
          {grain ? (
            <svg
              data-slot="gradient-background-grain"
              className="absolute inset-0 size-full opacity-35 mix-blend-overlay"
              focusable="false"
            >
              <filter id={grainId}>
                <feTurbulence
                  type="fractalNoise"
                  baseFrequency="0.85"
                  numOctaves="3"
                  stitchTiles="stitch"
                />
                <feColorMatrix type="saturate" values="0" />
              </filter>
              <rect width="100%" height="100%" filter={`url(#${grainId})`} />
            </svg>
          ) : null}
        </div>
        {children === undefined || children === null ? null : (
          <div data-slot="gradient-background-content" className="relative z-10">
            {children}
          </div>
        )}
      </div>
    </MotionConfig>
  );
}

export { gradientBackgroundVariants };
