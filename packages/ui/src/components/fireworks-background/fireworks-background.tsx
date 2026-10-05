"use client";

// Original design (pattern inspired by Animate UI Fireworks Background; no code referenced).
import { cva, type VariantProps } from "class-variance-authority";
import { useRef, type ComponentPropsWithRef, type PointerEvent } from "react";

import { useDitherCanvas, type DitherDraw } from "@/components/dither-canvas";
import { cn } from "@/lib/utils";

import {
  createFireworksShow,
  FIREWORKS,
  fireworksSparkAlpha,
  frozenFireworks,
  launchFireworksRocket,
  stepFireworks,
  type FireworksShow,
  type FireworksStepOptions,
} from "./fireworks-background-sim";

// Installed, this file is what `@/components/ui/fireworks-background` resolves
// to, so it exports everything the folder's index does.
export {
  burstFireworks,
  createFireworksShow,
  FIREWORKS,
  fireworksSparkAlpha,
  frozenFireworks,
  launchFireworksRocket,
  stepFireworks,
  type FireworksBurstStyle,
  type FireworksFlash,
  type FireworksOptions,
  type FireworksRocket,
  type FireworksShow,
  type FireworksSpark,
  type FireworksStepOptions,
} from "./fireworks-background-sim";

/*
 * A fireworks show behind content. Rockets rise from the bottom on a loose
 * timer, trailing a fading streak, slow under gravity and burst at their apex
 * — as a filled peony, an even ring or a drooping willow — into sparks that
 * feel drag and gravity, fade, and crackle as they die, with a soft flash at
 * the heart of each burst. Each launch takes the next colour of the palette,
 * so the sky cycles through the theme. A click or tap launches a rocket that
 * bursts right where you pressed.
 *
 * The simulation is in fireworks-background-sim.ts. Drawing goes through the
 * dither engine (useDitherCanvas): DPR capped, paused off-screen and in hidden
 * tabs, colours resolved from theme tokens and re-resolved when the theme
 * changes. Under reduced motion it is one still frame of three bursts frozen
 * just after they open, and presses do nothing.
 */

/** The theme's voices, one per launch. The last borrows accent to lift primary. */
export const FIREWORKS_PALETTE: readonly string[] = [
  "primary",
  "info",
  "success",
  "warning",
  "destructive",
  "color-mix(in oklab, var(--color-primary) 45%, var(--color-accent))",
];

const fireworksBackgroundVariants = cva("relative isolate overflow-hidden", {
  variants: {
    /** Fades the sky toward the bottom, where rockets are born. */
    fade: {
      none: "",
      bottom:
        "[&>[data-slot=fireworks-background-canvas]]:[mask-image:linear-gradient(to_bottom,var(--color-foreground)_60%,transparent)]",
    },
  },
  defaultVariants: { fade: "none" },
});

export interface FireworksBackgroundProps
  extends ComponentPropsWithRef<"div">, VariantProps<typeof fireworksBackgroundVariants> {
  /** Paint every burst in one colour token. Omit to cycle through `palette`. */
  color?: string;
  /** Colour tokens the bursts cycle through. Default FIREWORKS_PALETTE. */
  palette?: readonly string[];
  /** Launch rockets on a timer. Default true. */
  autoLaunch?: boolean;
  /** Automatic launches a second, on average, capped at 3. Default 0.8. */
  rate?: number;
  /** Sparks per burst. Default 70. */
  particleCount?: number;
  /** A click or tap launches a rocket that bursts at the pointer. Default true. */
  interactive?: boolean;
  /** Seed for launch timing, positions and burst shapes. Default 1. */
  seed?: number;
}

/** Rockets that rise, burst and fade in the theme's colours, behind its children. */
export function FireworksBackground({
  color,
  palette = FIREWORKS_PALETTE,
  autoLaunch = true,
  rate = 0.8,
  particleCount = 70,
  interactive = true,
  seed = 1,
  fade,
  className,
  children,
  onPointerDown,
  ...props
}: FireworksBackgroundProps) {
  const live = useRef<FireworksShow | null>(null);
  const still = useRef<{ key: string; show: FireworksShow } | null>(null);

  const tokens = color ? [color] : palette.length > 0 ? palette : FIREWORKS_PALETTE;
  const options: FireworksStepOptions = {
    colors: tokens.length,
    particleCount,
    autoLaunch,
    rate,
  };

  const draw: DitherDraw = (ctx, frame) => {
    const { width, height, delta } = frame;
    let show: FireworksShow;
    if (frame.animated) {
      live.current ??= createFireworksShow(width, height, seed);
      show = live.current;
      show.width = width;
      show.height = height;
      stepFireworks(show, delta, options);
    } else {
      const key = [width, height, particleCount, tokens.length, seed].join(":");
      if (still.current?.key !== key) {
        still.current = { key, show: frozenFireworks(width, height, options, seed) };
      }
      show = still.current.show;
    }
    const colors = tokens.map((token) => frame.color(token));
    const paint = (index: number) => colors[index] ?? colors[0] ?? "";

    for (const flash of show.flashes) {
      const t = flash.age / FIREWORKS.flashLife;
      ctx.fillStyle = paint(flash.color);
      ctx.globalAlpha = (1 - t) ** 2 * 0.28;
      ctx.beginPath();
      ctx.arc(flash.x, flash.y, 6 + t * 46, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.lineCap = "round";
    for (const rocket of show.rockets) {
      const tint = paint(rocket.color);
      ctx.strokeStyle = tint;
      ctx.lineWidth = 1.6;
      for (let i = 1; i < rocket.trail.length; i += 1) {
        const from = rocket.trail[i - 1];
        const to = rocket.trail[i];
        if (!from || !to) continue;
        ctx.globalAlpha = (i / rocket.trail.length) * 0.75;
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
      }
      ctx.fillStyle = tint;
      ctx.globalAlpha = 1;
      ctx.shadowColor = tint;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(rocket.x, rocket.y, 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    let current = -1;
    for (const spark of show.sparks) {
      if (spark.color !== current) {
        current = spark.color;
        ctx.strokeStyle = paint(current);
      }
      ctx.globalAlpha = fireworksSparkAlpha(spark);
      ctx.lineWidth = spark.size;
      ctx.beginPath();
      ctx.moveTo(spark.x - spark.vx * 0.04, spark.y - spark.vy * 0.04);
      ctx.lineTo(spark.x, spark.y);
      ctx.stroke();
    }
  };

  const { canvasRef, reducedMotion } = useDitherCanvas(draw);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    onPointerDown?.(event);
    const box = canvasRef.current?.getBoundingClientRect();
    if (!interactive || reducedMotion || !live.current || !box) return;
    launchFireworksRocket(
      live.current,
      { x: event.clientX - box.left, y: event.clientY - box.top },
      options,
    );
  };

  return (
    <div
      data-slot="fireworks-background"
      data-interactive={interactive || undefined}
      {...props}
      onPointerDown={handlePointerDown}
      className={cn(fireworksBackgroundVariants({ fade }), className)}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        data-slot="fireworks-background-canvas"
        className="pointer-events-none absolute inset-0 block size-full"
      />
      <div data-slot="fireworks-background-content" className="relative z-10 h-full">
        {children}
      </div>
    </div>
  );
}

export { fireworksBackgroundVariants };
