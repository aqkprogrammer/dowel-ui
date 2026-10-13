"use client";

// Original design.
import { cva, type VariantProps } from "class-variance-authority";
import { useCallback, type ComponentPropsWithRef, type CSSProperties } from "react";

import { useInView } from "@/hooks/use-in-view";
import { cn } from "@/lib/utils";

/*
 * Rays of light falling from a point above content — a spotlight on a hero,
 * a stage, a launch.
 *
 * The rays are a repeating conic gradient centred on the light, cut to a fan
 * and faded with distance by a mask. Two layers with different ray counts sway
 * slowly against each other about the light, so the beams shimmer rather than
 * rotate. CSS and transform only; it pauses off-screen, and under reduced
 * motion it stands still on its last frame. Decoration: aria-hidden.
 */

const PREFIX = "dowel-light-beams";

const STYLES = `
@keyframes ${PREFIX}-sway{from{transform:rotate(calc(var(--${PREFIX}-sway) * -1))}to{transform:rotate(var(--${PREFIX}-sway))}}
[data-slot=light-beams-layer]{position:absolute;inset:-50%;will-change:transform;animation:${PREFIX}-sway var(--${PREFIX}-duration) ease-in-out var(--${PREFIX}-delay,0s) infinite alternate}
[data-slot=light-beams][data-paused] [data-slot=light-beams-layer]{animation-play-state:paused}
@media (forced-colors:active){[data-slot=light-beams-scene]{display:none}}
`;

/**
 * Where the light hangs, as a point in the box, and which way its fan points
 * (degrees, 0 up, clockwise). Physical, not logical: a light in the top left
 * corner stays there in a right-to-left page, as a lamp would.
 */
export const LIGHT_BEAMS_ORIGINS = {
  top: { x: 50, y: -10, aim: 180 },
  "top-left": { x: 8, y: -12, aim: 145 },
  "top-right": { x: 92, y: -12, aim: 215 },
  center: { x: 50, y: 50, aim: 180 },
} as const;

export type LightBeamsOrigin = keyof typeof LIGHT_BEAMS_ORIGINS;

/** A point in the box, as a point in a layer twice its size centred on it. */
function inLayer(percent: number): number {
  return (percent + 50) / 2;
}

/**
 * The rays: `rays` beams across a fan of `spread` degrees aimed at `aim`, in
 * `color`. Each beam fills half its share of the fan, with a held core and
 * soft edges — a thin peak reads as haze once it is blurred and faded.
 */
export function lightBeamsGradient(
  origin: { x: number; y: number; aim: number },
  rays: number,
  spread: number,
  color: string,
): string {
  const fan = Math.min(360, Math.max(10, spread));
  const count = Math.max(1, Math.round(rays));
  const period = fan / count;
  const beam = period * 0.5;
  const from = origin.aim - fan / 2;
  return `repeating-conic-gradient(from ${fmt(from)}deg at ${fmt(inLayer(origin.x))}% ${fmt(inLayer(origin.y))}%, transparent 0deg, ${color} ${fmt(beam * 0.3)}deg ${fmt(beam * 0.7)}deg, transparent ${fmt(beam)}deg ${fmt(period)}deg)`;
}

/** Cuts the rays to the fan and fades them with distance from the light. */
export function lightBeamsMask(
  origin: { x: number; y: number; aim: number },
  spread: number,
): string {
  const fan = Math.min(360, Math.max(10, spread));
  const from = origin.aim - fan / 2;
  const at = `${fmt(origin.x)}% ${fmt(origin.y)}%`;
  const keep = "var(--color-foreground)";
  // The fan's edges are feathered, so the light falls off rather than stops.
  const soft = Math.min(8, fan * 0.12);
  return `conic-gradient(from ${fmt(from)}deg at ${at}, transparent 0deg, ${keep} ${fmt(soft)}deg ${fmt(fan - soft)}deg, transparent ${fmt(fan)}deg), radial-gradient(farthest-corner at ${at}, ${keep} 10%, transparent 85%)`;
}

function fmt(value: number): string {
  return String(Math.round(value * 100) / 100);
}

const lightBeamsVariants = cva("relative isolate overflow-hidden", {
  variants: {
    /** How the light meets what is behind it: `screen` brightens dark surfaces, `normal` suits light ones. */
    blend: {
      screen: "[&_[data-slot=light-beams-scene]]:mix-blend-screen",
      normal: "",
    },
  },
  defaultVariants: { blend: "normal" },
});

export interface LightBeamsProps
  extends ComponentPropsWithRef<"div">, VariantProps<typeof lightBeamsVariants> {
  /** Where the light hangs. Default "top". */
  origin?: LightBeamsOrigin;
  /** Beams across the fan. Default 8. */
  rays?: number;
  /** Width of the fan, in degrees. Default 70. */
  spread?: number;
  /** Beam colour: a token or any CSS colour. Default "primary". */
  color?: string;
  /** Strength of the light, 0–1. Default 0.8. */
  intensity?: number;
  /** Softness, as a blur radius in pixels. Default 6. */
  blur?: number;
  /** Sway speed multiplier; 0 holds the beams still. Default 1. */
  speed?: number;
}

/** Rays of light fanning down from a point behind content — CSS only. */
export function LightBeams({
  origin = "top",
  rays = 8,
  spread = 70,
  color = "primary",
  intensity = 0.8,
  blur = 6,
  speed = 1,
  blend,
  className,
  children,
  ref,
  ...props
}: LightBeamsProps) {
  const { ref: inViewRef, inView } = useInView<HTMLDivElement>({ rootMargin: "100px" });
  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      inViewRef(node);
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [inViewRef, ref],
  );

  const light = LIGHT_BEAMS_ORIGINS[origin];
  const css = /^[a-z][a-z0-9-]*$/.test(color) ? `var(--color-${color})` : color;
  const still = !(speed > 0);
  const mask = lightBeamsMask(light, spread);
  const pivot = `${fmt(inLayer(light.x))}% ${fmt(inLayer(light.y))}%`;
  // Two layers: the main beams, and a finer, fainter set swaying the other way.
  const layers = [
    { rays, seconds: 9, sway: 3, opacity: 1, delay: 0 },
    { rays: Math.round(rays * 1.5), seconds: 13, sway: -4, opacity: 0.35, delay: -5 },
  ];

  return (
    <div
      ref={setRefs}
      data-slot="light-beams"
      data-origin={origin}
      data-paused={!inView || still || undefined}
      className={cn(lightBeamsVariants({ blend }), className)}
      {...props}
    >
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      <div
        aria-hidden="true"
        data-slot="light-beams-scene"
        className="pointer-events-none absolute inset-0 overflow-hidden"
        style={{
          opacity: Math.min(1, Math.max(0, intensity)),
          filter: blur > 0 ? `blur(${String(blur)}px)` : undefined,
          maskImage: mask,
          WebkitMaskImage: mask,
          maskComposite: "intersect",
          WebkitMaskComposite: "source-in",
        }}
      >
        {layers.map((layer) => (
          <div
            key={layer.seconds}
            data-slot="light-beams-layer"
            style={
              {
                backgroundImage: lightBeamsGradient(light, layer.rays, spread, css),
                transformOrigin: pivot,
                opacity: layer.opacity,
                [`--${PREFIX}-sway`]: `${String(layer.sway)}deg`,
                [`--${PREFIX}-duration`]: `calc(${String(layer.seconds / (still ? 1 : speed))}s * var(--motion-scale, 1))`,
                [`--${PREFIX}-delay`]: `calc(${String(layer.delay / (still ? 1 : speed))}s * var(--motion-scale, 1))`,
              } as CSSProperties
            }
          />
        ))}
      </div>
      <div data-slot="light-beams-content" className="relative z-10 h-full">
        {children}
      </div>
    </div>
  );
}

export { lightBeamsVariants };
