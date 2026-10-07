"use client";

// Original design (pattern inspired by Animate UI Gravity Stars Background; no code referenced).
import { cva, type VariantProps } from "class-variance-authority";
import { useRef, type ComponentPropsWithRef, type PointerEvent } from "react";

import { useDitherCanvas, type DitherDraw } from "@/components/dither-canvas";
import { cn } from "@/lib/utils";

import {
  addGravityStarsWave,
  createGravityStarsWorld,
  GRAVITY_STARS,
  gravityStarsCount,
  gravityStarsLinks,
  resizeGravityStarsWorld,
  setGravityStarsPointer,
  stepGravityStars,
  type GravityStarsWorld,
} from "./gravity-stars-background-sim";

// Installed, this file is what `@/components/ui/gravity-stars-background`
// resolves to, so it exports everything the folder's index does.
export {
  addGravityStarsWave,
  createGravityStarsWorld,
  GRAVITY_STARS,
  gravityStarsCount,
  gravityStarsLinks,
  resizeGravityStarsWorld,
  setGravityStarsPointer,
  stepGravityStars,
  type GravityStar,
  type GravityStarsWave,
  type GravityStarsWorld,
} from "./gravity-stars-background-sim";

/*
 * A field of drifting particles that the pointer bends like a gravity well.
 * Near the pointer they accelerate in and fall into orbit; when it moves on
 * or leaves, the orbiting ones are slung outward, glowing and trailing until
 * they cool back to a drift. A click sends a shockwave ring that throws
 * everything it passes outward. Left alone, the field wanders, and particles
 * close to one another are joined by faint lines that come and go.
 *
 * The physics is in gravity-stars-background-sim.ts. Drawing goes through the
 * dither engine (useDitherCanvas): DPR capped, paused off-screen and in hidden
 * tabs, colours resolved from theme tokens and re-resolved when the theme
 * changes. Under reduced motion it is one still frame — the field and its
 * links at rest — and the pointer and clicks do nothing.
 */

const gravityStarsBackgroundVariants = cva("relative isolate overflow-hidden", {
  variants: {
    /** Fades the field out toward the edges. */
    fade: {
      none: "",
      edges:
        "[&>[data-slot=gravity-stars-background-canvas]]:[mask-image:radial-gradient(ellipse_at_center,var(--color-foreground)_45%,transparent_100%)]",
    },
  },
  defaultVariants: { fade: "none" },
});

/** Strength buckets for links, so the whole web strokes in four calls. */
const LINK_BUCKETS = 4;

export interface GravityStarsBackgroundProps
  extends ComponentPropsWithRef<"div">, VariantProps<typeof gravityStarsBackgroundVariants> {
  /** Particle colour: a token or any CSS colour. Default `"foreground"`. */
  color?: string;
  /** Colour of the glow and trails of fast particles, and of shockwaves. Default `"primary"`. */
  glowColor?: string;
  /** Particles per area; 1 is about one per 5,000 square pixels. Default 1. */
  density?: number;
  /** Join nearby particles with faint lines. Default true. */
  connections?: boolean;
  /** Distance in CSS pixels under which two particles are joined. Default 110. */
  linkDistance?: number;
  /** The pointer acts as a gravity well and a click sends a shockwave. Default true. */
  interactive?: boolean;
  /** Seed for the particle layout. Default 1. */
  seed?: number;
}

/** Drifting particles that the pointer pulls into orbit and flings out, behind its children. */
export function GravityStarsBackground({
  color = "foreground",
  glowColor = "primary",
  density = 1,
  connections = true,
  linkDistance = 110,
  interactive = true,
  seed = 1,
  fade,
  className,
  children,
  onPointerMove,
  onPointerLeave,
  onPointerDown,
  onPointerUp,
  onPointerCancel,
  ...props
}: GravityStarsBackgroundProps) {
  const world = useRef<GravityStarsWorld | null>(null);
  const built = useRef("");

  const draw: DitherDraw = (ctx, frame) => {
    const { width, height, delta, time } = frame;
    const count = gravityStarsCount(width, height, density);
    const key = `${String(count)}:${String(seed)}`;
    if (!world.current || built.current !== key) {
      world.current = createGravityStarsWorld(width, height, count, seed);
      built.current = key;
    } else if (world.current.width !== width || world.current.height !== height) {
      resizeGravityStarsWorld(world.current, width, height);
    }
    const field = world.current;
    if (!interactive || frame.reducedMotion) {
      field.pointer = null;
      field.waves = [];
    }
    if (frame.animated) stepGravityStars(field, delta);

    const tint = frame.color(color);
    const glow = frame.color(glowColor);
    const { stars } = field;

    if (connections && linkDistance > 0) {
      const buckets: [number, number][][] = Array.from({ length: LINK_BUCKETS }, () => []);
      for (const [i, j, strength] of gravityStarsLinks(stars, linkDistance)) {
        buckets[Math.min(LINK_BUCKETS - 1, Math.floor(strength * LINK_BUCKETS))]?.push([i, j]);
      }
      ctx.strokeStyle = tint;
      ctx.lineWidth = 0.6;
      buckets.forEach((pairs, bucket) => {
        if (pairs.length === 0) return;
        ctx.globalAlpha = ((bucket + 1) / LINK_BUCKETS) * 0.26;
        ctx.beginPath();
        for (const [i, j] of pairs) {
          const a = stars[i];
          const b = stars[j];
          if (!a || !b) continue;
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
        }
        ctx.stroke();
      });
    }

    // The well: a faint halo under the pointer.
    if (field.pointer) {
      ctx.fillStyle = glow;
      ctx.globalAlpha = 0.05;
      ctx.beginPath();
      ctx.arc(field.pointer.x, field.pointer.y, GRAVITY_STARS.radius * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.12;
      ctx.beginPath();
      ctx.arc(field.pointer.x, field.pointer.y, 10 + Math.sin(time * 3) * 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = glow;
    for (const wave of field.waves) {
      const t = wave.age / GRAVITY_STARS.waveLife;
      ctx.globalAlpha = (1 - t) ** 2 * 0.55;
      ctx.lineWidth = 1 + (1 - t) * 3;
      ctx.beginPath();
      ctx.arc(wave.x, wave.y, wave.age * GRAVITY_STARS.waveSpeed, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Trails behind fast particles, glowing in the glow colour.
    ctx.lineCap = "round";
    ctx.shadowColor = glow;
    ctx.shadowBlur = 10;
    for (const star of stars) {
      if (star.heat < 0.04) continue;
      ctx.globalAlpha = star.heat * 0.8;
      ctx.lineWidth = star.radius * (1.2 + star.heat);
      ctx.beginPath();
      ctx.moveTo(star.x - star.vx * 0.07, star.y - star.vy * 0.07);
      ctx.lineTo(star.x, star.y);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;

    for (const star of stars) {
      const twinkle = 0.5 + 0.5 * Math.sin(time * 1.4 + star.phase);
      ctx.fillStyle = star.heat > 0.5 ? glow : tint;
      ctx.globalAlpha = Math.min(1, 0.4 + 0.35 * twinkle + star.heat * 0.5);
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.radius * (1 + star.heat * 0.7), 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const { canvasRef, reducedMotion } = useDitherCanvas(draw);
  const live = interactive && !reducedMotion;

  const local = (event: PointerEvent<HTMLDivElement>) => {
    const box = canvasRef.current?.getBoundingClientRect();
    return box ? { x: event.clientX - box.left, y: event.clientY - box.top } : null;
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    onPointerMove?.(event);
    if (live && world.current) setGravityStarsPointer(world.current, local(event));
  };

  const release = () => {
    if (world.current) setGravityStarsPointer(world.current, null);
  };

  const handlePointerLeave = (event: PointerEvent<HTMLDivElement>) => {
    onPointerLeave?.(event);
    release();
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    onPointerDown?.(event);
    const point = local(event);
    if (!live || !world.current || !point) return;
    setGravityStarsPointer(world.current, point);
    addGravityStarsWave(world.current, point.x, point.y);
  };

  // A finger lifting is a pointer leaving: there is no hover to keep the well.
  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    onPointerUp?.(event);
    if (event.pointerType !== "mouse") release();
  };

  const handlePointerCancel = (event: PointerEvent<HTMLDivElement>) => {
    onPointerCancel?.(event);
    release();
  };

  return (
    <div
      data-slot="gravity-stars-background"
      data-interactive={interactive || undefined}
      {...props}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      className={cn(gravityStarsBackgroundVariants({ fade }), className)}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        data-slot="gravity-stars-background-canvas"
        className="pointer-events-none absolute inset-0 block size-full"
      />
      <div data-slot="gravity-stars-background-content" className="relative z-10 h-full">
        {children}
      </div>
    </div>
  );
}

export { gravityStarsBackgroundVariants };
