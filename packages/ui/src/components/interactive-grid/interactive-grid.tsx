"use client";

// Original design.
import { cva, type VariantProps } from "class-variance-authority";
import { useRef, type ComponentPropsWithRef, type PointerEvent } from "react";

import { useDitherCanvas, type DitherDraw } from "@/components/dither-canvas";
import { cn } from "@/lib/utils";

import {
  ageRipples,
  layoutInteractiveGrid,
  stepInteractiveGrid,
  type GridLayout,
  type Ripple,
} from "./interactive-grid-sim";

// Installed, this file is what `@/components/ui/interactive-grid` resolves to,
// so it exports everything the folder's index does.
export {
  ageRipples,
  falloff,
  INTERACTIVE_GRID_MAX_CELLS,
  layoutInteractiveGrid,
  RIPPLE_LIFE,
  RIPPLE_SPEED,
  rippleAt,
  stepInteractiveGrid,
  type GridLayout,
  type Ripple,
  type StepOptions,
} from "./interactive-grid-sim";

/*
 * A grid of cells behind content that lights up around the pointer and fades
 * out behind it; a press sends a ripple across it, and `idle` lets the odd
 * ripple start by itself so the surface is never quite still.
 *
 * Drawn through the dither engine (useDitherCanvas): DPR capped, paused
 * off-screen and in hidden tabs, colours from theme tokens. It only runs a
 * frame loop while something is moving — a lit cell, a ripple, or idle mode —
 * and at rest it costs nothing. Under reduced motion the highlight follows the
 * pointer directly, with no trail and no ripples.
 */

const interactiveGridVariants = cva("relative isolate overflow-hidden", {
  variants: {
    /** Fades the grid out so it sits inside a section. */
    fade: {
      none: "",
      edges:
        "[&>[data-slot=interactive-grid-canvas]]:[mask-image:radial-gradient(ellipse_at_center,var(--color-foreground)_40%,transparent_85%)]",
      bottom:
        "[&>[data-slot=interactive-grid-canvas]]:[mask-image:linear-gradient(to_bottom,var(--color-foreground)_40%,transparent)]",
    },
  },
  defaultVariants: { fade: "none" },
});

interface GridState {
  layout: GridLayout;
  key: string;
  energy: Float32Array;
  ripples: Ripple[];
  pointer: { x: number; y: number } | null;
  untilIdle: number;
  seed: number;
}

/**
 * One pass over the cells: every cell at rest, or only the lit ones, sized up
 * and as opaque as their energy. Dots at rest go into one path and one fill.
 */
function drawCells(
  ctx: CanvasRenderingContext2D,
  grid: GridState,
  size: number,
  shape: "square" | "dot",
  tint: string,
  lit: boolean,
) {
  const { cols, rows, pitch, offsetX, offsetY } = grid.layout;
  const half = size / 2;
  ctx.fillStyle = tint;
  ctx.globalAlpha = 1;
  if (shape === "dot" && !lit) ctx.beginPath();
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const energy = grid.energy[row * cols + col] ?? 0;
      if (lit && energy <= 0) continue;
      const x = offsetX + col * pitch;
      const y = offsetY + row * pitch;
      const grow = lit ? 1 + energy * 0.9 : 1;
      if (lit) ctx.globalAlpha = energy;
      if (shape === "dot") {
        if (lit) ctx.beginPath();
        ctx.moveTo(x + half * grow, y);
        ctx.arc(x, y, half * grow, 0, Math.PI * 2);
        if (lit) ctx.fill();
      } else {
        ctx.fillRect(x - half * grow, y - half * grow, size * grow, size * grow);
      }
    }
  }
  if (shape === "dot" && !lit) ctx.fill();
}

export interface InteractiveGridProps
  extends ComponentPropsWithRef<"div">, VariantProps<typeof interactiveGridVariants> {
  /** Distance between cells, in CSS pixels. Default 28. */
  cell?: number;
  /** Each cell's size as a share of the pitch, 0.1–1. Default 0.18. */
  cellSize?: number;
  /** Squares or dots. Default "square". */
  shape?: "square" | "dot";
  /** Resting cell colour: a token or any CSS colour. Default "border". */
  color?: string;
  /** Lit cell colour. Default "primary". */
  accent?: string;
  /** How far the pointer's light reaches, in CSS pixels. Default 140. */
  radius?: number;
  /** How quickly lit cells fade, 0–1. Default 0.9. */
  decay?: number;
  /** Respond to the pointer and to presses. Default true. */
  interactive?: boolean;
  /** Start a ripple now and then by itself. Default false. */
  idle?: boolean;
}

/** A grid behind content that lights up around the pointer and ripples on a press. */
export function InteractiveGrid({
  cell = 28,
  cellSize = 0.18,
  shape = "square",
  color = "border",
  accent = "primary",
  radius = 140,
  decay = 0.9,
  interactive = true,
  idle = false,
  fade,
  className,
  children,
  onPointerMove,
  onPointerLeave,
  onPointerDown,
  ...props
}: InteractiveGridProps) {
  const state = useRef<GridState | null>(null);

  const draw: DitherDraw = (ctx, frame) => {
    const { width, height, delta } = frame;
    const key = `${String(width)}x${String(height)}:${String(cell)}`;
    if (!state.current || state.current.key !== key) {
      const layout = layoutInteractiveGrid(width, height, cell);
      state.current = {
        layout,
        key,
        energy: new Float32Array(layout.cols * layout.rows),
        ripples: state.current?.ripples ?? [],
        pointer: state.current?.pointer ?? null,
        untilIdle: state.current?.untilIdle ?? 1.2,
        seed: state.current?.seed ?? 1,
      };
    }
    const grid = state.current;
    const instant = frame.reducedMotion;

    if (instant) grid.ripples.length = 0;
    else ageRipples(grid.ripples, delta);

    if (idle && frame.animated) {
      grid.untilIdle -= delta;
      if (grid.untilIdle <= 0) {
        grid.seed = (grid.seed * 16807) % 2147483647;
        const pick = grid.seed / 2147483647;
        grid.ripples.push({
          x: pick * width,
          y: ((pick * 7.31) % 1) * height,
          age: 0,
          strength: 0.55,
        });
        grid.untilIdle = 2.2 + ((pick * 13.7) % 1) * 2.4;
      }
    }

    const alive = stepInteractiveGrid(grid.energy, grid.layout, {
      pointer: interactive ? grid.pointer : null,
      radius,
      ripples: grid.ripples,
      decay,
      delta,
      instant,
    });

    const size = Math.max(1, grid.layout.pitch * Math.min(1, Math.max(0.1, cellSize)));

    // Resting cells in one colour, then the lit ones over them in the accent.
    drawCells(ctx, grid, size, shape, frame.color(color), false);
    drawCells(ctx, grid, size, shape, frame.color(accent), true);

    return alive || grid.ripples.length > 0;
  };

  const { canvasRef, redraw, reducedMotion } = useDitherCanvas(draw, { animate: idle });

  const local = (event: PointerEvent<HTMLDivElement>) => {
    const box = canvasRef.current?.getBoundingClientRect();
    if (!box) return null;
    return { x: event.clientX - box.left, y: event.clientY - box.top };
  };

  return (
    <div
      data-slot="interactive-grid"
      data-interactive={interactive || undefined}
      {...props}
      className={cn(interactiveGridVariants({ fade }), className)}
      onPointerMove={(event) => {
        onPointerMove?.(event);
        if (!interactive || !state.current) return;
        state.current.pointer = local(event);
        redraw();
      }}
      onPointerLeave={(event) => {
        onPointerLeave?.(event);
        if (state.current) state.current.pointer = null;
        redraw();
      }}
      onPointerDown={(event) => {
        onPointerDown?.(event);
        const point = local(event);
        if (!interactive || reducedMotion || !state.current || !point) return;
        state.current.ripples.push({ ...point, age: 0, strength: 1 });
        redraw();
      }}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        data-slot="interactive-grid-canvas"
        className="pointer-events-none absolute inset-0 block size-full"
      />
      <div data-slot="interactive-grid-content" className="relative z-10 h-full">
        {children}
      </div>
    </div>
  );
}

export { interactiveGridVariants };
