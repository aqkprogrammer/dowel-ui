"use client";

// Original design (pattern inspired by Animate UI Hole Background; no code referenced).
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
  createHoleParticles,
  createHoleRandom,
  holeGeometry,
  holeParticleAlpha,
  holeParticleCount,
  holeParticleVelocity,
  holePoint,
  holeRing,
  holeRings,
  stepHoleParticles,
  type HoleParticle,
  type HoleShape,
} from "./hole-background-sim";

// Installed, this file is what `@/components/ui/hole-background` resolves to,
// so it exports everything the folder's index does.
export {
  createHoleParticles,
  createHoleRandom,
  holeGeometry,
  holeParticleAlpha,
  holeParticleCount,
  holeParticleVelocity,
  holePoint,
  holeRing,
  holeRings,
  stepHoleParticles,
  type HoleGeometry,
  type HoleParticle,
  type HoleShape,
} from "./hole-background-sim";

/*
 * A tunnel into a black hole behind content. Concentric rings recede toward a
 * vanishing point, crowding together as perspective does, and flow inward
 * without end; radial lines run down the walls; particles stream in along
 * them, swirling and speeding up as they near the centre, where a dark event
 * horizon with a glowing rim swallows them. A vignette in the page colour
 * closes the edges. With `interactive`, the vanishing point eases toward the
 * pointer on a spring, bending the whole tunnel after it.
 *
 * The geometry and particles are in hole-background-sim.ts. Drawing goes
 * through the dither engine (useDitherCanvas): DPR capped, paused off-screen
 * and in hidden tabs, colours resolved from theme tokens and re-resolved when
 * the theme changes. Under reduced motion it is one still frame of the tunnel
 * at rest, centred, with the particles caught mid-fall.
 */

const holeBackgroundVariants = cva("relative isolate overflow-hidden", {
  variants: {
    /** How strongly the edges close in toward the page colour. */
    vignette: {
      none: "[&>[data-slot=hole-background-vignette]]:hidden",
      soft: "[&>[data-slot=hole-background-vignette]]:bg-[radial-gradient(ellipse_at_center,transparent_45%,var(--color-background)_100%)]",
      strong:
        "[&>[data-slot=hole-background-vignette]]:bg-[radial-gradient(ellipse_at_center,transparent_25%,var(--color-background)_85%)]",
    },
  },
  defaultVariants: { vignette: "soft" },
});

interface HoleState {
  particles: HoleParticle[];
  key: string;
  random: () => number;
  flow: number;
  leanX: Spring;
  leanY: Spring;
}

export interface HoleBackgroundProps
  extends ComponentPropsWithRef<"div">, VariantProps<typeof holeBackgroundVariants> {
  /** Colour of rings, lines and particles: a token or any CSS colour. Default `"foreground"`. */
  color?: string;
  /** Colour of the event horizon's rim and of particles about to fall in. Default `"primary"`. */
  glowColor?: string;
  /** Particles per area; 1 is about one per 2,500 square pixels. Default 1. */
  density?: number;
  /** Flow speed multiplier for rings and particles. Default 1. */
  speed?: number;
  /** Number of rings. Default 18. */
  rings?: number;
  /** Number of radial lines. Default 28. */
  spokes?: number;
  /** `"well"` looks down into the hole at an angle; `"tunnel"` straight along it. Default `"well"`. */
  shape?: HoleShape;
  /** The vanishing point eases toward the pointer. Default true. */
  interactive?: boolean;
  /** Seed for the particles. Default 1. */
  seed?: number;
}

/** A perspective tunnel into a black hole, with particles streaming in, behind its children. */
export function HoleBackground({
  color = "foreground",
  glowColor = "primary",
  density = 1,
  speed = 1,
  rings = 18,
  spokes = 28,
  shape = "well",
  interactive = true,
  seed = 1,
  vignette,
  className,
  children,
  onPointerMove,
  onPointerLeave,
  ...props
}: HoleBackgroundProps) {
  const state = useRef<HoleState | null>(null);

  const draw: DitherDraw = (ctx, frame) => {
    const { width, height, delta, time } = frame;
    state.current ??= {
      particles: [],
      key: "",
      random: createHoleRandom(seed + 3),
      flow: 0,
      leanX: createSpring(0, { stiffness: 26, damping: 9, mass: 1 }),
      leanY: createSpring(0, { stiffness: 26, damping: 9, mass: 1 }),
    };
    const hole = state.current;
    const count = holeParticleCount(width, height, density);
    const key = `${String(count)}:${String(seed)}`;
    if (hole.key !== key) {
      hole.particles = createHoleParticles(count, seed);
      hole.key = key;
    }
    if (!interactive || frame.reducedMotion) {
      hole.leanX.set(0);
      hole.leanY.set(0);
    }
    const moving = hole.leanX.step(delta, frame.reducedMotion);
    const movingY = hole.leanY.step(delta, frame.reducedMotion);
    if (frame.animated) {
      hole.flow += delta * speed * 0.9;
      stepHoleParticles(hole.particles, delta, speed, hole.random);
    }

    const geometry = holeGeometry(width, height, shape, {
      x: hole.leanX.value,
      y: hole.leanY.value,
    });
    const tint = frame.color(color);
    const glow = frame.color(glowColor);
    ctx.strokeStyle = tint;

    // Radial lines down the walls, sampled so they bend with the tunnel.
    if (spokes > 0) {
      ctx.globalAlpha = 0.1;
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      const turn = time * speed * 0.03;
      for (let i = 0; i < spokes; i += 1) {
        const angle = (i / spokes) * Math.PI * 2 + turn;
        for (let j = 0; j <= 12; j += 1) {
          const u = 0.2 + (j / 12) * 0.8;
          const { x, y } = holePoint(geometry, u * u, angle);
          if (j === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    }

    for (const ring of holeRings(Math.max(0, Math.round(rings)), hole.flow)) {
      if (ring.alpha <= 0.01) continue;
      const { x, y, rx, ry } = holeRing(geometry, ring.s);
      ctx.globalAlpha = ring.alpha * 0.38;
      ctx.lineWidth = 0.5 + ring.s * 1.3;
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Particles as short streaks along their path, glowing as they fall in.
    ctx.lineCap = "round";
    for (const particle of hole.particles) {
      const alpha = holeParticleAlpha(particle);
      if (alpha <= 0.01) continue;
      const { ds, dAngle } = holeParticleVelocity(particle, Math.max(speed, 0.2));
      const head = holePoint(geometry, particle.s, particle.angle);
      const tail = holePoint(geometry, particle.s - ds * 0.09, particle.angle - dAngle * 0.09);
      ctx.strokeStyle = particle.s < 0.18 ? glow : tint;
      ctx.globalAlpha = alpha * 0.85;
      ctx.lineWidth = particle.size * (0.6 + particle.s * 0.8);
      ctx.beginPath();
      ctx.moveTo(tail.x, tail.y);
      ctx.lineTo(head.x, head.y);
      ctx.stroke();
    }

    // The event horizon: a disc in the page colour with a glowing rim.
    const core = holeRing(geometry, 0.045);
    ctx.globalAlpha = 1;
    ctx.fillStyle = frame.color("background");
    ctx.beginPath();
    ctx.ellipse(core.x, core.y, core.rx, core.ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = glow;
    ctx.shadowColor = glow;
    ctx.shadowBlur = 18;
    ctx.globalAlpha = 0.75 + 0.15 * Math.sin(time * 2);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(core.x, core.y, core.rx, core.ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    return moving || movingY;
  };

  const { canvasRef, reducedMotion } = useDitherCanvas(draw);

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    onPointerMove?.(event);
    const hole = state.current;
    const box = canvasRef.current?.getBoundingClientRect();
    if (!interactive || reducedMotion || !hole || !box || box.width <= 0 || box.height <= 0) {
      return;
    }
    // The pointer's offset from centre, as a share of how far the point may travel.
    const lean = (offset: number) => Math.min(1, Math.max(-1, offset / 0.32));
    hole.leanX.set(lean((event.clientX - box.left) / box.width - 0.5));
    hole.leanY.set(lean((event.clientY - box.top) / box.height - 0.5));
  };

  const handlePointerLeave = (event: PointerEvent<HTMLDivElement>) => {
    onPointerLeave?.(event);
    state.current?.leanX.set(0);
    state.current?.leanY.set(0);
  };

  return (
    <div
      data-slot="hole-background"
      data-interactive={interactive || undefined}
      data-shape={shape}
      {...props}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={cn(holeBackgroundVariants({ vignette }), className)}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        data-slot="hole-background-canvas"
        className="pointer-events-none absolute inset-0 block size-full"
      />
      <div
        aria-hidden="true"
        data-slot="hole-background-vignette"
        className="pointer-events-none absolute inset-0"
      />
      <div data-slot="hole-background-content" className="relative z-10 h-full">
        {children}
      </div>
    </div>
  );
}

export { holeBackgroundVariants };
