"use client";

// Original design.
import { cva, type VariantProps } from "class-variance-authority";
import { useRef, type ComponentPropsWithRef, type PointerEvent } from "react";

import { useDitherCanvas, type DitherDraw } from "@/components/dither-canvas";
import { cn } from "@/lib/utils";

import {
  createFlowRandom,
  FLOW_STRIDE,
  flowAngle,
  flowFieldParticleCount,
  respawnParticle,
  stepFlowField,
} from "./flow-field-sim";

// Installed, this file is what `@/components/ui/flow-field` resolves to, so it
// exports everything the folder's index does.
export {
  createFlowRandom,
  FLOW_FIELD_MAX_PARTICLES,
  FLOW_STRIDE,
  flowAngle,
  flowFieldParticleCount,
  respawnParticle,
  stepFlowField,
  type FlowStep,
} from "./flow-field-sim";

/*
 * Particles carried along a slowly changing current, drawn as short streaks
 * — wind on a weather map, data in motion — behind content. The pointer parts
 * the flow around it.
 *
 * Drawn through the dither engine (useDitherCanvas): DPR capped, paused
 * off-screen and in hidden tabs, colour from a theme token. Every streak goes
 * into one path and one stroke per frame, and the particles live in one
 * preallocated array. Under reduced motion it is a still drawing of the field:
 * the same streaks, laid along the current, not moving.
 */

const flowFieldVariants = cva("relative isolate overflow-hidden", {
  variants: {
    /** Fades the field out so it sits inside a section. */
    fade: {
      none: "",
      edges:
        "[&>[data-slot=flow-field-canvas]]:[mask-image:radial-gradient(ellipse_at_center,var(--color-foreground)_40%,transparent_90%)]",
      bottom:
        "[&>[data-slot=flow-field-canvas]]:[mask-image:linear-gradient(to_bottom,var(--color-foreground)_45%,transparent)]",
    },
  },
  defaultVariants: { fade: "none" },
});

interface FieldState {
  key: string;
  count: number;
  particles: Float32Array;
  random: () => number;
  pointer: { x: number; y: number } | null;
}

export interface FlowFieldProps
  extends ComponentPropsWithRef<"div">, VariantProps<typeof flowFieldVariants> {
  /** Streak colour: a token or any CSS colour. Default "primary". */
  color?: string;
  /** Particles per area; 1 is about one per 1,100 square pixels. Default 1. */
  density?: number;
  /** Flow speed multiplier. Default 1. */
  speed?: number;
  /** Streak length, in CSS pixels. Default 10. */
  length?: number;
  /** Streak width, in CSS pixels. Default 1. */
  thickness?: number;
  /** Breadth of the currents; larger is broader and calmer. Default 1. */
  scale?: number;
  /** Strength of the streaks, 0–1. Default 0.55. */
  opacity?: number;
  /** Part the flow around the pointer. Default true. */
  interactive?: boolean;
  /** Seed for where particles start, so a page renders the same field. Default 3. */
  seed?: number;
}

/** Particles flowing along a slowly changing current behind content. */
export function FlowField({
  color = "primary",
  density = 1,
  speed = 1,
  length = 10,
  thickness = 1,
  scale = 1,
  opacity = 0.55,
  interactive = true,
  seed = 3,
  fade,
  className,
  children,
  onPointerMove,
  onPointerLeave,
  ...props
}: FlowFieldProps) {
  const state = useRef<FieldState | null>(null);

  const draw: DitherDraw = (ctx, frame) => {
    const { width, height, time, delta } = frame;
    const count = flowFieldParticleCount(width, height, density);
    const key = `${String(count)}:${String(seed)}:${String(width)}x${String(height)}`;
    if (!state.current || state.current.key !== key) {
      const random = createFlowRandom(seed);
      const particles = new Float32Array(count * FLOW_STRIDE);
      for (let i = 0; i < count; i += 1) respawnParticle(particles, i, width, height, random);
      state.current = {
        key,
        count,
        particles,
        random,
        pointer: state.current?.pointer ?? null,
      };
    }
    const field = state.current;
    const pace = 38 * Math.max(0, speed);

    if (frame.animated) {
      stepFlowField(field.particles, field.count, field.random, {
        width,
        height,
        time,
        delta,
        speed: pace,
        scale,
        pointer: interactive ? field.pointer : null,
        pushRadius: 110,
      });
    }

    // Every streak in one path: from each particle back along the current.
    ctx.strokeStyle = frame.color(color);
    ctx.globalAlpha = Math.min(1, Math.max(0, opacity));
    ctx.lineWidth = Math.max(0.5, thickness);
    ctx.lineCap = "round";
    ctx.beginPath();
    const reach = Math.max(1, length);
    for (let i = 0; i < field.count; i += 1) {
      const at = i * FLOW_STRIDE;
      const x = field.particles[at] ?? 0;
      const y = field.particles[at + 1] ?? 0;
      const angle = flowAngle(x, y, time, scale);
      ctx.moveTo(x, y);
      ctx.lineTo(x - Math.cos(angle) * reach, y - Math.sin(angle) * reach);
    }
    ctx.stroke();
  };

  const { canvasRef } = useDitherCanvas(draw, { animate: speed > 0 });

  return (
    <div
      data-slot="flow-field"
      data-interactive={interactive || undefined}
      {...props}
      className={cn(flowFieldVariants({ fade }), className)}
      onPointerMove={(event: PointerEvent<HTMLDivElement>) => {
        onPointerMove?.(event);
        const box = canvasRef.current?.getBoundingClientRect();
        if (!interactive || !state.current || !box) return;
        state.current.pointer = { x: event.clientX - box.left, y: event.clientY - box.top };
      }}
      onPointerLeave={(event) => {
        onPointerLeave?.(event);
        if (state.current) state.current.pointer = null;
      }}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        data-slot="flow-field-canvas"
        className="pointer-events-none absolute inset-0 block size-full"
      />
      <div data-slot="flow-field-content" className="relative z-10 h-full">
        {children}
      </div>
    </div>
  );
}

export { flowFieldVariants };
