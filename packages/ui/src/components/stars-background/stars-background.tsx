"use client";

// Original design (pattern inspired by Animate UI Stars Background; no code referenced).
import { cva, type VariantProps } from "class-variance-authority";
import { useRef, type ComponentPropsWithRef, type PointerEvent } from "react";

import {
  createSpring,
  useDitherCanvas,
  type DitherDraw,
  type Spring,
} from "@/components/dither-canvas";
import { cn } from "@/lib/utils";

import {
  createStarsBackgroundRandom,
  createStarsBackgroundStars,
  spawnStarsBackgroundStreak,
  STARS_BACKGROUND_LAYERS,
  starsBackgroundCount,
  starsBackgroundPosition,
  starsBackgroundStreakDelay,
  starsBackgroundStreakShape,
  starsBackgroundTwinkle,
  stepStarsBackgroundStreaks,
  type StarsBackgroundStar,
  type StarsBackgroundStreak,
} from "./stars-background-sim";

// Installed, this file is what `@/components/ui/stars-background` resolves to,
// so it exports everything the folder's index does.
export {
  createStarsBackgroundRandom,
  createStarsBackgroundStars,
  spawnStarsBackgroundStreak,
  STARS_BACKGROUND_LAYERS,
  starsBackgroundCount,
  starsBackgroundPosition,
  starsBackgroundStreakDelay,
  starsBackgroundStreakShape,
  starsBackgroundTwinkle,
  stepStarsBackgroundStreaks,
  type StarsBackgroundLayer,
  type StarsBackgroundStar,
  type StarsBackgroundStreak,
} from "./stars-background-sim";

/*
 * A night sky behind content: three depth layers of stars drift at different
 * speeds, so the field reads as deep rather than flat; every star twinkles on
 * its own clock, the brightest near ones throw a four-point glint, and now and
 * then a shooting star burns across. With `interactive`, the layers lean
 * toward the pointer — the near layer most — on a soft spring, and drift back
 * when it leaves.
 *
 * Drawing goes through the dither engine (useDitherCanvas), which caps DPR,
 * pauses off-screen and in hidden tabs, and resolves `color` as a theme token
 * that follows theme changes. Under reduced motion it is one still frame: the
 * same sky, every star at rest, no shooting stars, no parallax.
 */

const starsBackgroundVariants = cva("relative isolate overflow-hidden", {
  variants: {
    /** Fades the sky out toward the edges so it sits inside a section. */
    fade: {
      none: "",
      edges:
        "[&>[data-slot=stars-background-canvas]]:[mask-image:radial-gradient(ellipse_at_center,var(--color-foreground)_45%,transparent_100%)]",
      bottom:
        "[&>[data-slot=stars-background-canvas]]:[mask-image:linear-gradient(to_bottom,var(--color-foreground)_55%,transparent)]",
    },
  },
  defaultVariants: { fade: "none" },
});

/** How far, in CSS pixels, the near layer leans toward the pointer. */
const PARALLAX = 36;

interface SkyState {
  stars: StarsBackgroundStar[];
  key: string;
  streaks: StarsBackgroundStreak[];
  untilStreak: number;
  random: () => number;
  leanX: Spring;
  leanY: Spring;
}

export interface StarsBackgroundProps
  extends ComponentPropsWithRef<"div">, VariantProps<typeof starsBackgroundVariants> {
  /** Star colour: a token (`"foreground"`, `"primary"`) or any CSS colour. Default `"foreground"`. */
  color?: string;
  /** Stars per area; 1 is about one per 1,600 square pixels. Default 1. */
  density?: number;
  /** Drift speed multiplier. 0 holds the sky still while it still twinkles. Default 1. */
  speed?: number;
  /** Let a shooting star cross every few seconds. Default true. */
  shootingStars?: boolean;
  /** Lean the layers toward the pointer. Default true. */
  interactive?: boolean;
  /** Seed for the star layout, so a page renders the same sky every time. Default 1. */
  seed?: number;
}

/** A layered, twinkling, parallax starfield with shooting stars, behind its children. */
export function StarsBackground({
  color = "foreground",
  density = 1,
  speed = 1,
  shootingStars = true,
  interactive = true,
  seed = 1,
  fade,
  className,
  children,
  onPointerMove,
  onPointerLeave,
  ...props
}: StarsBackgroundProps) {
  const state = useRef<SkyState | null>(null);

  const draw: DitherDraw = (ctx, frame) => {
    const { width, height, delta, time } = frame;
    state.current ??= {
      stars: [],
      key: "",
      streaks: [],
      untilStreak: 1.5,
      random: createStarsBackgroundRandom(seed + 7),
      leanX: createSpring(0, { stiffness: 40, damping: 11, mass: 1 }),
      leanY: createSpring(0, { stiffness: 40, damping: 11, mass: 1 }),
    };
    const sky = state.current;
    const count = starsBackgroundCount(width, height, density);
    const key = `${String(count)}:${String(seed)}`;
    if (sky.key !== key) {
      sky.stars = createStarsBackgroundStars(count, seed);
      sky.key = key;
    }

    if (!interactive || frame.reducedMotion) {
      sky.leanX.set(0);
      sky.leanY.set(0);
    }
    const leaning = sky.leanX.step(delta, frame.reducedMotion);
    const leaningY = sky.leanY.step(delta, frame.reducedMotion);

    const tint = frame.color(color);
    ctx.fillStyle = tint;
    ctx.strokeStyle = tint;
    for (const star of sky.stars) {
      const depth = STARS_BACKGROUND_LAYERS[star.layer]?.depth ?? 1;
      const brightness = STARS_BACKGROUND_LAYERS[star.layer]?.brightness ?? 1;
      const { x, y } = starsBackgroundPosition(star, time, width, height, {
        speed,
        shiftX: sky.leanX.value * depth * PARALLAX,
        shiftY: sky.leanY.value * depth * PARALLAX,
      });
      const alpha = starsBackgroundTwinkle(star, time) * brightness;
      ctx.globalAlpha = alpha;
      if (star.radius < 0.75) {
        const side = star.radius * 2;
        ctx.fillRect(x - star.radius, y - star.radius, side, side);
        continue;
      }
      ctx.beginPath();
      ctx.arc(x, y, star.radius, 0, Math.PI * 2);
      ctx.fill();
      // The brightest near stars catch a four-point glint as they peak.
      if (star.layer === STARS_BACKGROUND_LAYERS.length - 1 && star.brightness > 0.85) {
        const reach = star.radius * (2 + alpha * 4);
        ctx.globalAlpha = alpha * 0.55;
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(x - reach, y);
        ctx.lineTo(x + reach, y);
        ctx.moveTo(x, y - reach);
        ctx.lineTo(x, y + reach);
        ctx.stroke();
      }
    }

    if (frame.animated) {
      sky.streaks = stepStarsBackgroundStreaks(sky.streaks, delta);
      sky.untilStreak -= delta;
      if (sky.untilStreak <= 0) {
        if (shootingStars)
          sky.streaks.push(spawnStarsBackgroundStreak(sky.random, width, height));
        sky.untilStreak = starsBackgroundStreakDelay(sky.random);
      }
    } else {
      sky.streaks = [];
    }
    ctx.lineCap = "round";
    for (const streak of sky.streaks) {
      const { alpha, extent } = starsBackgroundStreakShape(streak);
      const dx = -Math.cos(streak.angle) * streak.length * extent;
      const dy = -Math.sin(streak.angle) * streak.length * extent;
      // The tail as tapering segments, brightest at the head.
      const segments = 10;
      for (let i = 0; i < segments; i += 1) {
        const from = i / segments;
        const to = (i + 1) / segments;
        ctx.globalAlpha = alpha * (1 - from) ** 1.6;
        ctx.lineWidth = 1.8 * (1 - from) + 0.3;
        ctx.beginPath();
        ctx.moveTo(streak.x + dx * from, streak.y + dy * from);
        ctx.lineTo(streak.x + dx * to, streak.y + dy * to);
        ctx.stroke();
      }
      ctx.globalAlpha = alpha;
      ctx.shadowColor = tint;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(streak.x, streak.y, 1.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    return leaning || leaningY;
  };

  const { canvasRef, reducedMotion } = useDitherCanvas(draw);

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    onPointerMove?.(event);
    const sky = state.current;
    const box = canvasRef.current?.getBoundingClientRect();
    if (!interactive || reducedMotion || !sky || !box || box.width <= 0 || box.height <= 0) {
      return;
    }
    sky.leanX.set(((event.clientX - box.left) / box.width - 0.5) * 2);
    sky.leanY.set(((event.clientY - box.top) / box.height - 0.5) * 2);
  };

  const handlePointerLeave = (event: PointerEvent<HTMLDivElement>) => {
    onPointerLeave?.(event);
    state.current?.leanX.set(0);
    state.current?.leanY.set(0);
  };

  return (
    <div
      data-slot="stars-background"
      data-interactive={interactive || undefined}
      {...props}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={cn(starsBackgroundVariants({ fade }), className)}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        data-slot="stars-background-canvas"
        className="pointer-events-none absolute inset-0 block size-full"
      />
      <div data-slot="stars-background-content" className="relative z-10 h-full">
        {children}
      </div>
    </div>
  );
}

export { starsBackgroundVariants };
