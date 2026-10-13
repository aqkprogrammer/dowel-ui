"use client";

// Original design: Dowel's own cosmic mark and loader, as a background.
import { cva, type VariantProps } from "class-variance-authority";
import {
  useRef,
  type ComponentPropsWithRef,
  type CSSProperties,
  type PointerEvent,
} from "react";

import {
  createSpring,
  tokenToCss,
  useDitherCanvas,
  type DitherDraw,
  type Spring,
} from "@/components/dither-canvas";
import { cn } from "@/lib/utils";

import {
  COSMIC_BACKGROUND_MAX_ORBITS,
  COSMIC_BACKGROUND_ORBITS,
  COSMIC_BACKGROUND_ORIGINS,
  cosmicBackgroundOrbitAngle,
  cosmicBackgroundOrbitPoint,
  cosmicBackgroundScale,
  cosmicBackgroundStarCount,
  cosmicBackgroundTwinkle,
  createCosmicBackgroundStars,
  type CosmicBackgroundOrigin,
  type CosmicPoint,
  type CosmicStar,
} from "./cosmic-background-sim";

// Installed, this file is what `@/components/ui/cosmic-background` resolves to,
// so it exports everything the folder's index does.
export {
  COSMIC_BACKGROUND_MAX_ORBITS,
  COSMIC_BACKGROUND_ORBITS,
  COSMIC_BACKGROUND_ORIGINS,
  cosmicBackgroundOrbitAngle,
  cosmicBackgroundOrbitPoint,
  cosmicBackgroundScale,
  cosmicBackgroundStarCount,
  cosmicBackgroundTwinkle,
  createCosmicBackgroundRandom,
  createCosmicBackgroundStars,
  type CosmicBackgroundOrigin,
  type CosmicOrbit,
  type CosmicPoint,
  type CosmicStar,
} from "./cosmic-background-sim";

/*
 * Dowel's mark, opened out into a sky: a bright core, tilted orbits with a
 * body riding each one — blue and orange by default, the brand's two accents
 * — over a seeded field of twinkling stars and a soft glow. With
 * `interactive`, the scene leans toward the pointer, the near stars most.
 *
 * The glow is a CSS layer, so it costs nothing per frame. Everything that
 * moves is drawn through the dither engine (useDitherCanvas): DPR capped,
 * paused off-screen and in hidden tabs, colours resolved from theme tokens and
 * re-resolved when the theme changes. No shadowBlur, and the frame loop
 * allocates nothing. Under reduced motion it draws one still frame: the same
 * sky, each body parked at its starting point, no parallax.
 */

const cosmicBackgroundVariants = cva("relative isolate overflow-hidden", {
  variants: {
    /** Fades the scene out toward the edges so it sits inside a section. */
    fade: {
      none: "",
      edges:
        "[&>[data-slot=cosmic-background-scene]]:[mask-image:radial-gradient(ellipse_at_center,var(--color-foreground)_45%,transparent_100%)]",
      bottom:
        "[&>[data-slot=cosmic-background-scene]]:[mask-image:linear-gradient(to_bottom,var(--color-foreground)_55%,transparent)]",
    },
  },
  defaultVariants: { fade: "none" },
});

/** How far, in CSS pixels, the nearest stars lean toward the pointer. */
const PARALLAX = 28;
/** Depth of the orbits and core: they lean about half as far as the near stars. */
const ORBIT_DEPTH = 0.5;
/** Trail dots behind each body, and the angle between them. */
const TRAIL = 7;
const TRAIL_STEP = 0.045;

interface SceneState {
  stars: CosmicStar[];
  key: string;
  leanX: Spring;
  leanY: Spring;
  point: CosmicPoint;
}

export interface CosmicBackgroundProps
  extends ComponentPropsWithRef<"div">, VariantProps<typeof cosmicBackgroundVariants> {
  /** Star and orbit-ring colour: a token (`"foreground"`) or any CSS colour. Default `"foreground"`. */
  starColor?: string;
  /**
   * Accent colours, cycled across the orbiting bodies and the tinted stars.
   * Tokens or CSS colours. Default `["primary", "warning"]` — blue and orange
   * in the default theme.
   */
  palette?: readonly string[];
  /** How many orbits to draw, 0–3. Default 2: the mark's own pair. */
  orbits?: number;
  /** Draw the orbit paths as faint rings. Default true. */
  rings?: boolean;
  /** Draw the bright core the orbits turn about. Default true. */
  core?: boolean;
  /** Where the core sits. Default `"center"`. */
  origin?: CosmicBackgroundOrigin;
  /** Stars per area; 1 is about one per 2,400 square pixels. Default 1. */
  density?: number;
  /** Orbit and twinkle speed multiplier. 0 parks the bodies. Default 1. */
  speed?: number;
  /** Strength of the glow behind the core, 0–1. Default 0.7. */
  glow?: number;
  /** Lean the scene toward the pointer. Default true. */
  interactive?: boolean;
  /** Seed for the star layout, so a page renders the same sky every time. Default 7. */
  seed?: number;
}

/** Dowel's orbital mark as a living sky: a core, tilted orbits with bodies, twinkling stars and a glow. */
export function CosmicBackground({
  starColor = "foreground",
  palette = DEFAULT_PALETTE,
  orbits = 2,
  rings = true,
  core = true,
  origin = "center",
  density = 1,
  speed = 1,
  glow = 0.7,
  interactive = true,
  seed = 7,
  fade,
  className,
  style,
  children,
  onPointerMove,
  onPointerLeave,
  ...props
}: CosmicBackgroundProps) {
  const state = useRef<SceneState | null>(null);
  const orbitCount = clampInt(orbits, 0, COSMIC_BACKGROUND_MAX_ORBITS);
  const anchor = COSMIC_BACKGROUND_ORIGINS[origin];

  const draw: DitherDraw = (ctx, frame) => {
    const { width, height, time, delta } = frame;
    state.current ??= {
      stars: [],
      key: "",
      leanX: createSpring(0, { stiffness: 40, damping: 11, mass: 1 }),
      leanY: createSpring(0, { stiffness: 40, damping: 11, mass: 1 }),
      point: { x: 0, y: 0, near: 0 },
    };
    const scene = state.current;
    const count = cosmicBackgroundStarCount(width, height, density);
    const key = `${String(count)}:${String(seed)}:${String(palette.length)}`;
    if (scene.key !== key) {
      scene.stars = createCosmicBackgroundStars(count, seed, palette.length);
      scene.key = key;
    }

    if (!interactive || frame.reducedMotion) {
      scene.leanX.set(0);
      scene.leanY.set(0);
    }
    const movingX = scene.leanX.step(delta, frame.reducedMotion);
    const movingY = scene.leanY.step(delta, frame.reducedMotion);
    const leanX = scene.leanX.value * PARALLAX;
    const leanY = scene.leanY.value * PARALLAX;
    // The clock only runs while animated, so a still frame is the scene at t=0.
    const clock = time * speed;

    // Stars, far to near.
    const base = frame.color(starColor);
    let tint = -2;
    for (const star of scene.stars) {
      if (star.tint !== tint) {
        tint = star.tint;
        ctx.fillStyle = tint < 0 ? base : frame.color(palette[tint] ?? starColor);
      }
      const x = star.x * width + leanX * star.depth;
      const y = star.y * height + leanY * star.depth;
      ctx.globalAlpha = cosmicBackgroundTwinkle(star, clock);
      if (star.radius < 0.8) {
        const side = star.radius * 2;
        ctx.fillRect(x - star.radius, y - star.radius, side, side);
      } else {
        ctx.beginPath();
        ctx.arc(x, y, star.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const scale = cosmicBackgroundScale(width, height);
    const cx = anchor.x * width + leanX * ORBIT_DEPTH;
    const cy = anchor.y * height + leanY * ORBIT_DEPTH;

    // Orbit paths.
    if (rings && orbitCount > 0) {
      ctx.strokeStyle = base;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.1;
      for (let i = 0; i < orbitCount; i += 1) {
        const orbit = COSMIC_BACKGROUND_ORBITS[i];
        if (!orbit) continue;
        const rx = orbit.rx * scale;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, rx * orbit.ratio, orbit.tilt, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // The core: a few soft concentric discs instead of a blurred shadow.
    if (core) {
      const radius = Math.max(2.5, scale * 0.028) * (1 + 0.06 * Math.sin(clock * 1.8));
      ctx.fillStyle = frame.color(palette[0] ?? starColor);
      for (const [reach, alpha] of HALO) {
        ctx.globalAlpha = alpha * glow;
        ctx.beginPath();
        ctx.arc(cx, cy, radius * reach, 0, Math.PI * 2);
        ctx.fill();
      }
      // The core is a star in the first accent, so it reads as light on a dark
      // theme and on a light one alike — the star colour would be ink on paper.
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Bodies, each with a short fading trail behind it.
    const point = scene.point;
    for (let i = 0; i < orbitCount; i += 1) {
      const orbit = COSMIC_BACKGROUND_ORBITS[i];
      if (!orbit) continue;
      ctx.fillStyle = frame.color(
        palette.length > 0 ? (palette[i % palette.length] ?? starColor) : starColor,
      );
      const angle = cosmicBackgroundOrbitAngle(orbit, time, speed);
      for (let step = TRAIL; step >= 1; step -= 1) {
        cosmicBackgroundOrbitPoint(
          orbit,
          angle - orbit.direction * step * TRAIL_STEP,
          cx,
          cy,
          scale,
          point,
        );
        const fadeOut = 1 - step / (TRAIL + 1);
        ctx.globalAlpha = 0.35 * fadeOut * (0.4 + 0.6 * point.near);
        ctx.beginPath();
        ctx.arc(point.x, point.y, orbit.body * (0.35 + 0.45 * fadeOut), 0, Math.PI * 2);
        ctx.fill();
      }
      cosmicBackgroundOrbitPoint(orbit, angle, cx, cy, scale, point);
      const size = orbit.body * (0.7 + 0.3 * point.near);
      ctx.globalAlpha = 0.16 * (0.5 + 0.5 * point.near);
      ctx.beginPath();
      ctx.arc(point.x, point.y, size * 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.6 + 0.4 * point.near;
      ctx.beginPath();
      ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    return movingX || movingY;
  };

  const { canvasRef, reducedMotion } = useDitherCanvas(draw);

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    onPointerMove?.(event);
    const scene = state.current;
    const box = canvasRef.current?.getBoundingClientRect();
    if (!interactive || reducedMotion || !scene || !box || box.width <= 0 || box.height <= 0) {
      return;
    }
    scene.leanX.set(((event.clientX - box.left) / box.width - 0.5) * 2);
    scene.leanY.set(((event.clientY - box.top) / box.height - 0.5) * 2);
  };

  const handlePointerLeave = (event: PointerEvent<HTMLDivElement>) => {
    onPointerLeave?.(event);
    state.current?.leanX.set(0);
    state.current?.leanY.set(0);
  };

  const glowStrength = clamp(glow, 0, 1);

  return (
    <div
      data-slot="cosmic-background"
      data-interactive={interactive || undefined}
      {...props}
      style={
        {
          "--cosmic-background-x": `${String(anchor.x * 100)}%`,
          "--cosmic-background-y": `${String(anchor.y * 100)}%`,
          "--cosmic-background-glow": String(glowStrength),
          "--cosmic-background-accent": tokenToCss(palette[0] ?? "primary"),
          "--cosmic-background-accent-2": tokenToCss(palette[1] ?? palette[0] ?? "primary"),
          ...style,
        } as CSSProperties
      }
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={cn(cosmicBackgroundVariants({ fade }), className)}
    >
      <div
        aria-hidden="true"
        data-slot="cosmic-background-scene"
        className="pointer-events-none absolute inset-0"
      >
        <div
          data-slot="cosmic-background-glow"
          className={cn(
            "absolute inset-0 opacity-(--cosmic-background-glow)",
            "bg-[radial-gradient(60%_55%_at_var(--cosmic-background-x)_var(--cosmic-background-y),color-mix(in_oklab,var(--cosmic-background-accent)_32%,transparent),transparent_70%),radial-gradient(35%_30%_at_calc(var(--cosmic-background-x)+18%)_calc(var(--cosmic-background-y)+12%),color-mix(in_oklab,var(--cosmic-background-accent-2)_14%,transparent),transparent_70%)]",
          )}
        />
        <canvas
          ref={canvasRef}
          data-slot="cosmic-background-canvas"
          className="absolute inset-0 block size-full"
        />
      </div>
      <div data-slot="cosmic-background-content" className="relative z-10 h-full">
        {children}
      </div>
    </div>
  );
}

const DEFAULT_PALETTE = ["primary", "warning"] as const;

/** The core's halo: [radius multiple, opacity at full glow]. */
const HALO: readonly (readonly [number, number])[] = [
  [6, 0.05],
  [3.6, 0.09],
  [2.1, 0.16],
];

function clamp(value: number, min: number, max: number): number {
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min;
}

function clampInt(value: number, min: number, max: number): number {
  return Math.round(clamp(value, min, max));
}

export { cosmicBackgroundVariants };
