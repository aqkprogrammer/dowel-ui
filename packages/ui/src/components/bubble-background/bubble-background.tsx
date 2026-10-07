"use client";

// Original design (pattern inspired by Animate UI Bubble Background; no code referenced).
import { cva, type VariantProps } from "class-variance-authority";
import { MotionConfig, motion, useMotionValue, useSpring, useTransform } from "motion/react";
import {
  useId,
  useSyncExternalStore,
  type ComponentPropsWithRef,
  type CSSProperties,
  type PointerEvent,
} from "react";

import { cn } from "@/lib/utils";

/*
 * Large soft colour blobs drifting behind content, fused by a goo filter.
 *
 * Each blob is a radial gradient that fades to transparent at its edge. An SVG
 * filter blurs the group and then steepens its alpha (feColorMatrix), so where
 * two fading edges overlap they cross the threshold together and the blobs
 * merge like liquid instead of simply overlapping. A CSS blur on top softens
 * the hard goo edge back into light.
 *
 * The drift is CSS: every blob loops its own keyframe path, at its own
 * duration and direction, so the composition never visibly repeats. Durations
 * run through `--motion-scale`, and `speed` multiplies them.
 *
 * With `interactive`, one more blob follows the pointer on a soft spring — the
 * one thing here CSS cannot do honestly (ADR 0014). The pointer is read from
 * the root, so content above stays fully interactive; touch is ignored.
 *
 * Under reduced motion the base.css blanket stops every loop, and since the
 * loops have no fill mode each blob rests at its static position — a composed
 * still, not a frozen mid-frame. The follower is not rendered at all.
 */

const PREFIX = "dowel-bubble-background";

/** A duration on the motion scale, multiplied by the `speed` variant. */
function scaled(seconds: number): string {
  return `calc(${String(seconds)}s * var(--bubble-speed, 1) * var(--motion-scale, 1))`;
}

/** Blob placements: a static rest position, a size and a looping path. */
const BLOBS = [
  { top: "-12%", start: "-10%", size: "62%", path: "a", seconds: 26, reverse: false },
  { top: "28%", start: "48%", size: "58%", path: "b", seconds: 32, reverse: true },
  { top: "52%", start: "-6%", size: "54%", path: "c", seconds: 22, reverse: false },
  { top: "-18%", start: "56%", size: "50%", path: "d", seconds: 36, reverse: false },
  { top: "40%", start: "20%", size: "46%", path: "e", seconds: 28, reverse: true },
] as const;

const STYLES = `
@keyframes ${PREFIX}-a{0%,100%{translate:0 0}33%{translate:24% 18%}66%{translate:-8% 30%}}
@keyframes ${PREFIX}-b{0%,100%{translate:0 0;scale:1}50%{translate:-34% -20%;scale:1.15}}
@keyframes ${PREFIX}-c{0%,100%{translate:0 0}25%{translate:30% -14%}50%{translate:52% 6%}75%{translate:18% 16%}}
@keyframes ${PREFIX}-d{0%,100%{translate:0 0;scale:1}40%{translate:-26% 34%;scale:.9}70%{translate:-46% 8%;scale:1.1}}
@keyframes ${PREFIX}-e{from{rotate:0deg}to{rotate:360deg}}
[data-slot=bubble-background-blob],[data-slot=bubble-background-follower]{position:absolute;aspect-ratio:1;border-radius:9999px;mix-blend-mode:hard-light;background:radial-gradient(circle at center,var(--bubble-color) 0%,color-mix(in oklab,var(--bubble-color) 40%,transparent) 38%,transparent 66%)}
[data-slot=bubble-background-blob][data-path=e]{transform-origin:30% 70%}
[data-slot=bubble-background-follower]{--bubble-color:var(--bubble-follower-color);width:38%;translate:-50% -50%;opacity:.85}
`;

const DEFAULT_COLORS = [
  "var(--color-primary)",
  "color-mix(in oklab, var(--color-accent-foreground) 30%, var(--color-info))",
  "color-mix(in oklab, var(--color-primary) 55%, var(--color-info))",
  "color-mix(in oklab, var(--color-secondary-foreground) 25%, var(--color-primary))",
  "color-mix(in oklab, var(--color-info) 70%, var(--color-success))",
  "color-mix(in oklab, var(--color-primary) 70%, var(--color-accent))",
];

const bubbleBackgroundVariants = cva("relative isolate overflow-hidden bg-background", {
  variants: {
    /** How far the fused blobs are softened. `sm` keeps the goo edge readable. */
    blur: {
      sm: "[--bubble-blur:0.75rem]",
      md: "[--bubble-blur:2rem]",
      lg: "[--bubble-blur:4rem]",
    },
    /** Multiplies every drift duration. */
    speed: {
      slow: "[--bubble-speed:1.75]",
      normal: "[--bubble-speed:1]",
      fast: "[--bubble-speed:0.55]",
    },
  },
  defaultVariants: {
    blur: "md",
    speed: "normal",
  },
});

/** A 0–1 fraction of the box as a CSS percentage. */
function toPercent(fraction: number): string {
  return `${String(fraction * 100)}%`;
}

const SPRING = { stiffness: 70, damping: 20, mass: 1.2 };

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

export interface BubbleBackgroundProps
  extends ComponentPropsWithRef<"div">, VariantProps<typeof bubbleBackgroundVariants> {
  /**
   * Blob colours as CSS colour expressions, e.g.
   * `"color-mix(in oklab, var(--color-primary) 60%, transparent)"`. Six are
   * used (five drifting, one following the pointer); fewer repeat in order.
   */
  colors?: string[];
  /** Adds a blob that follows the pointer on a soft spring. */
  interactive?: boolean;
  /** Classes for the decorative layer. */
  layerClassName?: string;
}

/** A background of drifting, liquid-fused colour blobs, with content rendered above. */
export function BubbleBackground({
  className,
  layerClassName,
  blur,
  speed,
  colors = DEFAULT_COLORS,
  interactive = false,
  children,
  onPointerMove,
  onPointerLeave,
  ...props
}: BubbleBackgroundProps) {
  const reduced = usePrefersReducedMotion();
  const filterId = `${PREFIX}-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const palette = colors.length > 0 ? colors : DEFAULT_COLORS;
  const colorAt = (index: number) => palette[index % palette.length] ?? DEFAULT_COLORS[0];

  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);
  const springX = useSpring(x, SPRING);
  const springY = useSpring(y, SPRING);
  const left = useTransform(springX, toPercent);
  const top = useTransform(springY, toPercent);

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
    // Let go, the follower drifts home to the middle rather than stopping dead.
    x.set(0.5);
    y.set(0.5);
  }

  return (
    <MotionConfig reducedMotion="user">
      <div
        data-slot="bubble-background"
        data-interactive={follows ? "" : undefined}
        className={cn(bubbleBackgroundVariants({ blur, speed }), className)}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        {...props}
      >
        <style href={PREFIX} precedence="dowel">
          {STYLES}
        </style>
        <div
          aria-hidden="true"
          data-slot="bubble-background-layer"
          className={cn("pointer-events-none absolute inset-0 overflow-hidden", layerClassName)}
        >
          <svg className="absolute size-0" focusable="false">
            <defs>
              <filter id={filterId}>
                <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur" />
                <feColorMatrix
                  in="blur"
                  mode="matrix"
                  values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8"
                  result="goo"
                />
                <feBlend in="SourceGraphic" in2="goo" />
              </filter>
            </defs>
          </svg>
          <div
            data-slot="bubble-background-blobs"
            className="absolute inset-0"
            style={
              {
                filter: `url(#${filterId}) blur(var(--bubble-blur, 2rem))`,
                "--bubble-follower-color": colorAt(BLOBS.length),
              } as CSSProperties
            }
          >
            {BLOBS.map((blob, index) => (
              <span
                key={blob.path}
                data-slot="bubble-background-blob"
                data-path={blob.path}
                style={
                  {
                    "--bubble-color": colorAt(index),
                    top: blob.top,
                    insetInlineStart: blob.start,
                    width: blob.size,
                    animation: `${PREFIX}-${blob.path} ${scaled(blob.seconds)} var(--ease-in-out-quint) infinite${blob.reverse ? " reverse" : ""}`,
                  } as CSSProperties
                }
              />
            ))}
            {follows ? (
              <motion.span
                data-slot="bubble-background-follower"
                data-path="pointer"
                // The measured pointer is a physical coordinate in either direction.
                style={{ left, top }}
              />
            ) : null}
          </div>
        </div>
        {children === undefined || children === null ? null : (
          <div data-slot="bubble-background-content" className="relative z-10">
            {children}
          </div>
        )}
      </div>
    </MotionConfig>
  );
}

export { bubbleBackgroundVariants };
