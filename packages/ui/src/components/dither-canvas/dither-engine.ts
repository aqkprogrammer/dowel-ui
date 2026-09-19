// Ported from amicro "Dither Charts" (MIT, © 2026 Syed Subhan Uddin). See THIRD_PARTY_NOTICES.md.

/*
 * The pure half of the dither engine: no React, no DOM beyond the canvas
 * context it is handed. Everything a dither chart needs to decide *how big a
 * cell is* lives here, so it can be unit-tested without a canvas.
 *
 * The technique, as amicro draws it: the plot is a grid of fixed cells
 * (~4.6 CSS px). Each cell is drawn as one small square, centred in the cell,
 * whose side is `cell × density`. Density is built from three ingredients —
 * a shape term (distance, fill level) eased with smoothstep, a time-based sum of
 * sines for shimmer, and a per-cell hash for jitter — and the region is clipped
 * to the shape's path. amicro's hash was `fract(sin(…) × 43758)` and two charts
 * used Math.random; this one is an integer hash, so a frame is the same on every
 * machine and every render (and a test can assert it).
 */

/** Default cell pitch in CSS pixels, as amicro's donut draws it. */
export const DITHER_CELL = 4.6;

/** Axis-aligned rectangle in CSS pixels. */
export interface DitherBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

/** Hermite ease between two edges; 0 below `edge0`, 1 above `edge1`. */
export function smoothstep(edge0: number, edge1: number, value: number): number {
  if (edge0 === edge1) return value < edge0 ? 0 : 1;
  const x = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return x * x * (3 - 2 * x);
}

/**
 * Deterministic per-cell hash in [0, 1).
 *
 * Coordinates are quantised to 1/100 px so the float noise in a cell's centre
 * never changes its jitter. `seed` gives a second, independent field (the
 * particle layer uses one) from the same cell.
 */
export function hash2(x: number, y: number, seed = 0): number {
  let h =
    Math.imul(Math.round(x * 100) | 0, 0x27d4eb2d) ^
    Math.imul(Math.round(y * 100) | 0, 0x165667b1);
  h = Math.imul(h ^ Math.imul(seed | 0, 0x9e3779b1), 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/**
 * amicro's shimmer: a sum of sines eased into 0..1. Pass the raw terms (each
 * in −1..1) so each chart keeps its own wave; with no terms — the reduced-motion
 * case — it is the neutral 0.5.
 */
export function shimmer(...waves: number[]): number {
  let sum = 0;
  for (const wave of waves) sum += wave;
  return smoothstep(-1.5, 1.5, sum);
}

/** The two-sine drift amicro's device donut and revenue fill share. */
export function drift(x: number, y: number, time: number): number {
  return shimmer(Math.sin(x * 0.05 + time), Math.sin(y * 0.05 + time * 0.7));
}

/**
 * The drawn square for one cell: centred, side `cell × density`, never larger
 * than the cell. Returns null when the density leaves nothing to draw.
 */
export function cellSquare(
  x: number,
  y: number,
  cell: number,
  density: number,
): [x: number, y: number, size: number] | null {
  const size = cell * clamp(density, 0, 1);
  if (size <= 0.05) return null;
  return [x + (cell - size) / 2, y + (cell - size) / 2, size];
}

/**
 * Visits every cell overlapping `bounds`, on a grid anchored at the canvas
 * origin. Anchoring matters: a grid anchored to each shape would swim as the
 * shape animates, and two shapes would not share cells.
 */
export function forEachCell(
  bounds: DitherBounds,
  cell: number,
  visit: (x: number, y: number) => void,
): void {
  if (cell <= 0 || bounds.width <= 0 || bounds.height <= 0) return;
  const x0 = Math.floor(bounds.x / cell) * cell;
  const y0 = Math.floor(bounds.y / cell) * cell;
  const x1 = bounds.x + bounds.width;
  const y1 = bounds.y + bounds.height;
  for (let x = x0; x < x1; x += cell) {
    for (let y = y0; y < y1; y += cell) visit(x, y);
  }
}

/**
 * Density function for one cell. `cx`/`cy` are the cell's centre and `x`/`y`
 * its top-left corner, both in CSS pixels. Return 0..1 — the fraction of the
 * cell the square covers; 0 or less skips the cell.
 */
export type DitherDensity = (cx: number, cy: number, x: number, y: number) => number;

export interface DitherFillOptions {
  /** Region to scan. Keep it tight: every cell in it runs `density`. */
  bounds: DitherBounds;
  density: DitherDensity;
  /** Cell pitch in CSS pixels. Defaults to DITHER_CELL. */
  cell?: number;
  /** Clip region — usually a Path2D from `makePath`. Omit to fill the bounds. */
  clip?: Path2D | null;
  /** Resolved colour (`frame.color("primary")`). Omit to keep the current fillStyle. */
  color?: string;
  /** Multiplies the current globalAlpha for this fill. */
  alpha?: number;
}

/**
 * Fills a region with dithered cells. Saves and restores the context, so the
 * clip, colour and alpha never leak into the next shape. Returns the number of
 * squares drawn.
 */
export function ditherFill(ctx: CanvasRenderingContext2D, options: DitherFillOptions): number {
  const cell = options.cell ?? DITHER_CELL;
  let drawn = 0;
  ctx.save();
  if (options.clip) ctx.clip(options.clip);
  if (options.color !== undefined) ctx.fillStyle = options.color;
  if (options.alpha !== undefined) ctx.globalAlpha *= clamp(options.alpha, 0, 1);
  forEachCell(options.bounds, cell, (x, y) => {
    const square = cellSquare(x, y, cell, options.density(x + cell / 2, y + cell / 2, x, y));
    if (!square) return;
    ctx.fillRect(square[0], square[1], square[2], square[2]);
    drawn += 1;
  });
  ctx.restore();
  return drawn;
}

/* Colour ------------------------------------------------------------------ */

/**
 * Turns a colour reference into a CSS value:
 * `"primary"` and `"--color-primary"` become `var(--color-primary)`; anything
 * else (`var(…)`, `color-mix(…)`, `currentColor`) is passed through.
 */
export function tokenToCss(token: string): string {
  if (token.startsWith("--")) return `var(${token})`;
  if (/^[a-z][a-z0-9-]*$/.test(token) && token !== "currentcolor" && token !== "transparent") {
    return `var(--color-${token})`;
  }
  return token;
}

/**
 * Resolves a colour token to a concrete value a canvas accepts, as seen from
 * `element` — so a theme scoped to a subtree applies. A hidden probe element
 * lets the browser do the resolving, which also settles `color-mix()` and
 * nested `var()`s that a canvas fillStyle would reject.
 */
export function resolveColor(element: Element, token: string): string {
  const css = tokenToCss(token);
  const doc = element.ownerDocument;
  const view = doc.defaultView;
  if (!view) return css;
  const host = element.parentElement ?? doc.body;
  const probe = doc.createElement("span");
  probe.style.display = "none";
  probe.style.color = css;
  host.appendChild(probe);
  const resolved = view.getComputedStyle(probe).color;
  probe.remove();
  if (resolved && !resolved.includes("var(")) return resolved;
  // No resolution (a detached element, or a DOM without CSS): fall back to the
  // custom property's own value, then to the expression itself.
  const name = /^var\((--[\w-]+)\)$/.exec(css)?.[1];
  const raw = name ? view.getComputedStyle(element).getPropertyValue(name).trim() : "";
  return raw || css;
}

/**
 * Default series colours: one hue — the theme's primary — stepped toward the
 * card surface, as amicro's monochrome ramp is. Status tokens (success,
 * warning, destructive) are deliberately absent: they mean state, not series.
 * Identity never rests on colour alone; every chart also names each series in
 * a legend, its readout and its data table.
 */
export const DITHER_PALETTE: readonly string[] = [
  "primary",
  "color-mix(in oklab, var(--color-primary) 72%, var(--color-card))",
  "color-mix(in oklab, var(--color-primary) 50%, var(--color-card))",
  "color-mix(in oklab, var(--color-primary) 34%, var(--color-card))",
  "color-mix(in oklab, var(--color-primary) 22%, var(--color-card))",
  "muted-foreground",
];

/** The colour for series `index`: its own if given, else the palette in order. */
export function seriesColor(index: number, color?: string): string {
  return color ?? DITHER_PALETTE[index % DITHER_PALETTE.length] ?? "primary";
}

/* Value animation ---------------------------------------------------------- */

export interface SpringConfig {
  stiffness?: number;
  damping?: number;
  mass?: number;
  /** Distance and speed below which the spring snaps to rest. */
  precision?: number;
}

export interface Spring {
  readonly value: number;
  readonly target: number;
  readonly velocity: number;
  /** Aims the spring at a new target; it moves on the next `step`. */
  set(target: number): void;
  /** Places the spring at rest on `value`. */
  jump(value: number): void;
  /** Advances by `dt` seconds. Returns true while still moving. */
  step(dt: number, reducedMotion?: boolean): boolean;
}

/** amicro's number spring (motion's useSpring at 190 / 27 / 0.7). */
export const DEFAULT_SPRING: Required<SpringConfig> = {
  stiffness: 190,
  damping: 27,
  mass: 0.7,
  precision: 0.001,
};

/**
 * A damped spring for canvas values. Integrated in fixed sub-steps, so a long
 * frame (a tab coming back into view) cannot make it explode. Under reduced
 * motion `step` jumps straight to the target: the settled value, drawn once.
 */
export function createSpring(initial: number, config: SpringConfig = {}): Spring {
  const { stiffness, damping, mass, precision } = { ...DEFAULT_SPRING, ...config };
  let value = initial;
  let target = initial;
  let velocity = 0;
  return {
    get value() {
      return value;
    },
    get target() {
      return target;
    },
    get velocity() {
      return velocity;
    },
    set(next) {
      target = next;
    },
    jump(next) {
      value = next;
      target = next;
      velocity = 0;
    },
    step(dt, reducedMotion = false) {
      if (reducedMotion) {
        value = target;
        velocity = 0;
        return false;
      }
      let remaining = clamp(dt, 0, 0.1);
      while (remaining > 0) {
        const h = Math.min(remaining, 1 / 240);
        const force = -stiffness * (value - target) - damping * velocity;
        velocity += (force / mass) * h;
        value += velocity * h;
        remaining -= h;
      }
      const scale = Math.max(1, Math.abs(target));
      if (
        Math.abs(value - target) < precision * scale &&
        Math.abs(velocity) < precision * scale
      ) {
        value = target;
        velocity = 0;
        return false;
      }
      return true;
    },
  };
}

export interface SpringList {
  readonly values: number[];
  /** Aims at new targets. A different length resamples the current values. */
  set(targets: readonly number[]): void;
  jump(targets: readonly number[]): void;
  step(dt: number, reducedMotion?: boolean): boolean;
}

/**
 * Resamples `values` to `length` points by nearest index, so a 7-point series
 * can morph into a 30-point one without a jump to zero (amicro's range switch).
 */
export function resample(values: readonly number[], length: number): number[] {
  if (length <= 0) return [];
  if (values.length === 0) return Array.from({ length }, () => 0);
  if (values.length === length) return [...values];
  return Array.from({ length }, (_, index) => {
    const t = length === 1 ? 0 : index / (length - 1);
    return values[Math.round(t * (values.length - 1))] ?? 0;
  });
}

/** A list of springs that animates an array of values together. */
export function createSprings(
  initial: readonly number[],
  config: SpringConfig = {},
): SpringList {
  let springs = initial.map((value) => createSpring(value, config));
  const list: SpringList = {
    get values() {
      return springs.map((spring) => spring.value);
    },
    set(targets) {
      if (targets.length !== springs.length) {
        springs = resample(list.values, targets.length).map((value) =>
          createSpring(value, config),
        );
      }
      targets.forEach((target, index) => springs[index]?.set(target));
    },
    jump(targets) {
      springs = targets.map((value) => createSpring(value, config));
    },
    step(dt, reducedMotion = false) {
      let moving = false;
      for (const spring of springs) moving = spring.step(dt, reducedMotion) || moving;
      return moving;
    },
  };
  return list;
}
