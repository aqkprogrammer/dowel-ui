// Original design.

/*
 * The pure half of InteractiveGrid: a field of cells, each with an energy from
 * 0 to 1 that the pointer raises, ripples sweep through, and time drains. No
 * canvas and no DOM, so it is tested directly. Everything works in place on
 * one Float32Array — the frame loop allocates nothing.
 */

export interface GridLayout {
  cols: number;
  rows: number;
  /** Distance between cell centres, in CSS pixels. */
  pitch: number;
  /** Offset of the first cell centre, centring the grid in the box. */
  offsetX: number;
  offsetY: number;
}

export interface Ripple {
  x: number;
  y: number;
  /** Seconds since it started. */
  age: number;
  /** Strength, 0–1. */
  strength: number;
}

/** The most cells the grid will draw, however large the box. */
export const INTERACTIVE_GRID_MAX_CELLS = 4000;

/** Speed a ripple's ring travels, in CSS pixels per second. */
export const RIPPLE_SPEED = 420;
/** A ripple's life, in seconds. */
export const RIPPLE_LIFE = 1.6;
/** Width of a ripple's ring, in CSS pixels. */
const RIPPLE_WIDTH = 46;

/**
 * Columns and rows for a box. The pitch grows when the cells would exceed the
 * cap, so a 4K hero draws the same number of cells as a laptop one.
 */
export function layoutInteractiveGrid(width: number, height: number, cell: number): GridLayout {
  if (width <= 0 || height <= 0)
    return { cols: 0, rows: 0, pitch: cell, offsetX: 0, offsetY: 0 };
  let pitch = Math.max(6, cell);
  const area = width * height;
  if (area / (pitch * pitch) > INTERACTIVE_GRID_MAX_CELLS) {
    pitch = Math.sqrt(area / INTERACTIVE_GRID_MAX_CELLS);
  }
  const cols = Math.max(1, Math.ceil(width / pitch));
  const rows = Math.max(1, Math.ceil(height / pitch));
  return {
    cols,
    rows,
    pitch,
    offsetX: (width - (cols - 1) * pitch) / 2,
    offsetY: (height - (rows - 1) * pitch) / 2,
  };
}

/** Smooth falloff: 1 at the centre, 0 at `radius`, with no hard edge. */
export function falloff(distance: number, radius: number): number {
  if (radius <= 0 || distance >= radius) return 0;
  const t = 1 - distance / radius;
  return t * t * (3 - 2 * t);
}

/** How strongly a ripple's ring touches a point `distance` from its centre. */
export function rippleAt(ripple: Ripple, distance: number): number {
  if (ripple.age >= RIPPLE_LIFE) return 0;
  const ring = ripple.age * RIPPLE_SPEED;
  const off = Math.abs(distance - ring);
  if (off >= RIPPLE_WIDTH) return 0;
  const fade = 1 - ripple.age / RIPPLE_LIFE;
  return falloff(off, RIPPLE_WIDTH) * fade * ripple.strength;
}

export interface StepOptions {
  /** Pointer position, or null when it is away. */
  pointer: { x: number; y: number } | null;
  /** Pointer influence radius, in CSS pixels. */
  radius: number;
  ripples: readonly Ripple[];
  /** Fraction of energy lost per second, 0–1 (1 drains almost at once). */
  decay: number;
  delta: number;
  /** Jump straight to the target, with no trail: reduced motion. */
  instant: boolean;
}

/**
 * Advances every cell one frame, in place. A cell rises to whatever is
 * touching it (the pointer, a ripple) and otherwise drains. Returns whether
 * any cell still holds energy, so the loop can stop when the grid is at rest.
 */
export function stepInteractiveGrid(
  energy: Float32Array,
  layout: GridLayout,
  { pointer, radius, ripples, decay, delta, instant }: StepOptions,
): boolean {
  const keep = instant ? 0 : (1 - Math.min(0.999, Math.max(0, decay))) ** delta;
  let alive = false;
  for (let row = 0; row < layout.rows; row += 1) {
    const y = layout.offsetY + row * layout.pitch;
    for (let col = 0; col < layout.cols; col += 1) {
      const index = row * layout.cols + col;
      const x = layout.offsetX + col * layout.pitch;
      let target = 0;
      if (pointer) target = falloff(Math.hypot(x - pointer.x, y - pointer.y), radius);
      for (const ripple of ripples) {
        const touch = rippleAt(ripple, Math.hypot(x - ripple.x, y - ripple.y));
        if (touch > target) target = touch;
      }
      const drained = (energy[index] ?? 0) * keep;
      const next = target > drained ? target : drained < 0.002 ? 0 : drained;
      energy[index] = next;
      if (next > 0) alive = true;
    }
  }
  return alive;
}

/** Ages ripples in place and drops the finished ones. */
export function ageRipples(ripples: Ripple[], delta: number): void {
  let write = 0;
  for (const ripple of ripples) {
    ripple.age += delta;
    if (ripple.age < RIPPLE_LIFE) ripples[write++] = ripple;
  }
  ripples.length = write;
}
