"use client";

// Original design.
import { cva, type VariantProps } from "class-variance-authority";
import {
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
  type Ref,
} from "react";

import { cn } from "@/lib/utils";

/*
 * Slow light behind content, in two looks that share one mechanism:
 *
 * - `curtain`: streaked bands, as a repeating gradient at a slant, hung from
 *   the top and drifting sideways — two layers at different angles moving in
 *   opposite directions, so the streaks shear past each other.
 * - `glow`: three soft colour fields that wander about the box.
 *
 * Either way it is CSS. Every layer is oversized and only ever moves by
 * `transform`, so the browser composites the blurred result rather than
 * repainting it each frame. An IntersectionObserver pauses the animation while
 * the background is off-screen. Colours are theme tokens by default, so the
 * aurora follows the preset and the colour scheme.
 *
 * Decoration only. Under reduced motion the global blanket settles each layer
 * on its last keyframe: the same light, standing still.
 */

const PREFIX = "dowel-aurora-background";

const STYLES = `
[data-slot=aurora-background-layer]{position:absolute;inset:-50%;will-change:transform;animation:var(--${PREFIX}-name) var(--${PREFIX}-duration) ease-in-out var(--${PREFIX}-delay,0s) infinite alternate}
[data-slot=aurora-background][data-paused] [data-slot=aurora-background-layer]{animation-play-state:paused}
@keyframes ${PREFIX}-curtain{from{transform:translate3d(-12%,0,0) scaleY(1)}to{transform:translate3d(12%,-3%,0) scaleY(1.08)}}
@keyframes ${PREFIX}-curtain-back{from{transform:translate3d(10%,-2%,0) scaleY(1.06)}to{transform:translate3d(-10%,2%,0) scaleY(1)}}
@keyframes ${PREFIX}-drift-a{from{transform:translate3d(-14%,-8%,0) scale(1)}to{transform:translate3d(10%,6%,0) scale(1.15)}}
@keyframes ${PREFIX}-drift-b{from{transform:translate3d(12%,4%,0) scale(1.1)}to{transform:translate3d(-8%,-10%,0) scale(0.95)}}
@keyframes ${PREFIX}-drift-c{from{transform:translate3d(0,10%,0) scale(0.95)}to{transform:translate3d(6%,-6%,0) scale(1.12)}}
@media (forced-colors:active){[data-slot=aurora-background-scene]{display:none}}
`;

const auroraBackgroundVariants = cva("relative isolate overflow-hidden", {
  variants: {
    /** `curtain` hangs streaked bands from the top; `glow` lets soft colour fields wander. */
    variant: {
      curtain: "",
      glow: "",
    },
    /** Fades the light out toward the edges so it sits inside a section. */
    fade: {
      none: "",
      edges:
        "[&>[data-slot=aurora-background-scene]]:[mask-image:radial-gradient(ellipse_at_center,var(--color-foreground)_40%,transparent_100%)]",
      bottom:
        "[&>[data-slot=aurora-background-scene]]:[mask-image:linear-gradient(to_bottom,var(--color-foreground)_45%,transparent)]",
      top: "[&>[data-slot=aurora-background-scene]]:[mask-image:linear-gradient(to_top,var(--color-foreground)_45%,transparent)]",
    },
  },
  defaultVariants: { variant: "curtain", fade: "none" },
});

export type AuroraBackgroundVariant = NonNullable<
  VariantProps<typeof auroraBackgroundVariants>["variant"]
>;

/** The layers each look draws: keyframes, base duration in seconds, and a start offset. */
const LAYERS: Record<
  AuroraBackgroundVariant,
  readonly { name: string; seconds: number; offset: number }[]
> = {
  curtain: [
    { name: `${PREFIX}-curtain`, seconds: 28, offset: 0 },
    { name: `${PREFIX}-curtain-back`, seconds: 40, offset: -11 },
  ],
  glow: [
    { name: `${PREFIX}-drift-a`, seconds: 18, offset: 0 },
    { name: `${PREFIX}-drift-b`, seconds: 24, offset: -7 },
    { name: `${PREFIX}-drift-c`, seconds: 31, offset: -15 },
  ],
};

export interface AuroraBackgroundProps
  extends
    Omit<ComponentPropsWithRef<"div">, "ref">,
    VariantProps<typeof auroraBackgroundVariants> {
  ref?: Ref<HTMLDivElement>;
  /**
   * The colours of the light, tokens (`"primary"`) or any CSS colour. The
   * curtain streaks through them in order; the glow gives one field to each of
   * the first three. Default `["primary", "info", "warning"]`.
   */
  colors?: readonly string[];
  /** How strong the light is, 0–1. Default 0.6. */
  intensity?: number;
  /** Drift speed multiplier. Default 1; 0 holds the light still. */
  speed?: number;
  /** Softness, as a blur radius in pixels. Default 48 for `curtain`, 72 for `glow`. */
  blur?: number;
}

/** Slow, blurred bands or fields of colour behind content — CSS only, paused off-screen. */
export function AuroraBackground({
  variant = "curtain",
  fade,
  colors = DEFAULT_COLORS,
  intensity = 0.6,
  speed = 1,
  blur,
  className,
  style,
  ref,
  children,
  ...props
}: AuroraBackgroundProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const node = rootRef.current;
    if (!node || typeof IntersectionObserver !== "function") return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) setPaused(!entry.isIntersecting);
      },
      { rootMargin: "100px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const setRef = (node: HTMLDivElement | null) => {
    rootRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) ref.current = node;
  };

  const look: AuroraBackgroundVariant = variant ?? "curtain";
  const palette = (colors.length > 0 ? colors : DEFAULT_COLORS).map(toCss);
  const still = !(speed > 0);
  const softness = Math.max(0, blur ?? (look === "glow" ? 72 : 48));

  return (
    <div
      ref={setRef}
      data-slot="aurora-background"
      data-variant={look}
      data-paused={paused || still || undefined}
      className={cn(auroraBackgroundVariants({ variant: look, fade }), className)}
      style={style}
      {...props}
    >
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      <div
        aria-hidden="true"
        data-slot="aurora-background-scene"
        className="pointer-events-none absolute inset-0 overflow-hidden"
        style={{
          opacity: clamp(intensity, 0, 1),
          filter: softness > 0 ? `blur(${String(softness)}px)` : undefined,
        }}
      >
        {LAYERS[look].map((layer, index) => (
          <div
            key={layer.name}
            data-slot="aurora-background-layer"
            style={
              {
                [`--${PREFIX}-name`]: layer.name,
                [`--${PREFIX}-duration`]: seconds(layer.seconds / (still ? 1 : speed)),
                [`--${PREFIX}-delay`]: seconds(layer.offset / (still ? 1 : speed)),
                backgroundImage:
                  look === "curtain"
                    ? curtain(palette, index === 0 ? 100 : 76)
                    : field(palette[index % palette.length] ?? "currentColor", index),
                ...(look === "curtain"
                  ? {
                      opacity: index === 0 ? 1 : 0.7,
                      maskImage: CURTAIN_MASK,
                      WebkitMaskImage: CURTAIN_MASK,
                    }
                  : null),
              } as CSSProperties
            }
          />
        ))}
      </div>
      <div data-slot="aurora-background-content" className="relative z-10 h-full">
        {children}
      </div>
    </div>
  );
}

const DEFAULT_COLORS = ["primary", "info", "warning"] as const;

/** The curtain hangs from the top and thins out below. */
const CURTAIN_MASK =
  "radial-gradient(ellipse 70% 55% at 50% 30%, var(--color-foreground) 20%, transparent 75%)";

/**
 * Streaks at `angle`, cycling through the palette. Between two bright rays the
 * light dims to a faint wash of the next colour rather than to nothing, so the
 * curtain reads as one sheet of light with rays in it, not a row of pillars.
 */
function curtain(palette: readonly string[], angle: number): string {
  const stops: string[] = [];
  const band = 30 / palette.length;
  palette.forEach((color, i) => {
    const start = i * band;
    stops.push(
      `color-mix(in oklab, ${color} 18%, transparent) ${fmt(start)}%`,
      `${color} ${fmt(start + band * 0.4)}%`,
      `color-mix(in oklab, ${color} 55%, transparent) ${fmt(start + band * 0.6)}%`,
    );
  });
  stops.push(`color-mix(in oklab, ${palette[0] ?? "currentColor"} 18%, transparent) 30%`);
  return `repeating-linear-gradient(${String(angle)}deg, ${stops.join(", ")})`;
}

/** Where each glow field sits in its (oversized) layer. */
const FIELDS = ["38% 40%", "62% 46%", "50% 62%"] as const;

function field(color: string, index: number): string {
  const at = FIELDS[index % FIELDS.length] ?? "50% 50%";
  return `radial-gradient(circle at ${at}, ${color} 0%, transparent 22%)`;
}

/** A token name becomes its custom property; anything else is already CSS. */
function toCss(color: string): string {
  if (color.startsWith("--")) return `var(${color})`;
  if (/^[a-z][a-z0-9-]*$/.test(color) && color !== "transparent" && color !== "currentcolor") {
    return `var(--color-${color})`;
  }
  return color;
}

/** Seconds, scaled so --motion-scale reaches them. */
function seconds(value: number): string {
  return `calc(${fmt(value)}s * var(--motion-scale, 1))`;
}

function fmt(value: number): string {
  return String(Math.round(value * 100) / 100);
}

function clamp(value: number, min: number, max: number): number {
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : max;
}

export { auroraBackgroundVariants };
