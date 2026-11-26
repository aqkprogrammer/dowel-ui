"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { useEffect, useRef, type ComponentPropsWithRef } from "react";

import { ShimmerText } from "@/components/shimmer-text";
import { cn } from "@/lib/utils";

/*
 * An AI "thinking" pill: a 9×9 LED dot matrix beside a shimmering label, in a
 * black capsule. The matrix plays one of eight rhythms:
 *
 * - life    Conway's Game of Life on a wrapping grid; births flash white.
 * - ring    a ring breathes out from the centre, sparks circling it, and back.
 * - orbit   four sparks spiral into the centre, burst out as a diamond, open
 *           into a ring and orbit again.
 * - face    two arcs swing between a frown, braces round a cursor, and a smile.
 * - spiral  a comet winds the square spiral from the corner into the centre.
 * - arrow   a spark runs in from the left, a bar sweeps out, a cross glows.
 * - ribbon  a snake runs a crossed ribbon path end to end and back.
 * - glider  a single Game of Life glider crawling across the grid.
 *
 * Each rhythm is a small function of time that writes a level per dot: 0 is
 * an unlit LED, ~0.62 the tone, 1 white-hot. Trails come from a shared decay
 * buffer: a dot lit by a moving head keeps its peak, then cools from white to
 * the tone and fades. A canvas draws the grid with an additive glow.
 *
 * It is an indicator: it only says "still working", so rather than freezing
 * under reduced motion it runs at the pace set by --motion-scale-indicator
 * (half speed). It runs only while on screen and the tab is visible, and
 * paints its first frame synchronously so a static capture is never blank.
 *
 * The capsule is black in both themes, like a status light. The five tones
 * are fixed LED colours; the label's grey and the capsule's black are custom
 * properties (`--dot-matrix-loader-*`) on the root.
 */

const P = "dowel-dot-matrix-loader";
const N = 9;
const CELLS = N * N;
const MID = (N - 1) / 2;
const TAU = Math.PI * 2;
/** The tone's level. Above it a dot runs from the tone to white. */
const TONE = 0.62;

export const DOT_MATRIX_LOADER_PATTERNS = [
  "life",
  "ring",
  "orbit",
  "face",
  "spiral",
  "arrow",
  "ribbon",
  "glider",
] as const;
export type DotMatrixLoaderPattern = (typeof DOT_MATRIX_LOADER_PATTERNS)[number];

export const DOT_MATRIX_LOADER_TONES = ["ember", "azure", "amber", "violet", "rose"] as const;
export type DotMatrixLoaderTone = (typeof DOT_MATRIX_LOADER_TONES)[number];

type RGB = readonly [number, number, number];

/** LED colours, sampled from lit dots. Unlit dots are the tone at 16%. */
const TONES: Record<DotMatrixLoaderTone, RGB> = {
  ember: [255, 86, 52],
  azure: [72, 150, 255],
  amber: [255, 146, 38],
  violet: [146, 104, 255],
  rose: [232, 72, 108],
};
const HOT: RGB = [255, 250, 244];

/** Each rhythm's own tone, used when `tone` is not given. */
const DEFAULT_TONE: Record<DotMatrixLoaderPattern, DotMatrixLoaderTone> = {
  life: "ember",
  ring: "azure",
  orbit: "amber",
  face: "violet",
  spiral: "azure",
  arrow: "amber",
  ribbon: "violet",
  glider: "rose",
};

const STYLES = `
.${P}{direction:ltr;--dot-matrix-loader-bg:#050506;--dot-matrix-loader-text:#9a9aa0;
background:var(--dot-matrix-loader-bg);
box-shadow:0 calc(var(--u) * 1.4) calc(var(--u) * 3.2) calc(var(--u) * -0.6) #000000b3,inset 0 0 0 1px #ffffff0a}
`;

/* ---------------------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------------------- */

const idx = (x: number, y: number) => y * N + x;
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const easeIn = (k: number) => k * k * k;
const easeOut = (k: number) => 1 - (1 - k) ** 3;
const easeInOut = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2);
const wrap = (n: number, m: number) => ((n % m) + m) % m;

/** A dot's distance from the centre, its angle (y down: 90° is the bottom), its Manhattan distance. */
const POLAR = Array.from({ length: CELLS }, (_, i) => {
  const dx = (i % N) - MID;
  const dy = Math.floor(i / N) - MID;
  return { d: Math.hypot(dx, dy), a: Math.atan2(dy, dx), m: Math.abs(dx) + Math.abs(dy) };
});
const polar = (i: number) => POLAR[i] ?? { d: 0, a: 0, m: 0 };

/** The smallest angle between two angles, in radians. */
const angleGap = (a: number, b: number) => Math.abs(wrap(a - b + Math.PI, TAU) - Math.PI);

/**
 * Per-dot peaks that cool over time. Lighting a dot sets its peak if that is
 * brighter than what is there now; a white peak holds briefly, drops to the
 * tone and fades, which is what reads as a comet's tail.
 */
class Trail {
  peak = new Float32Array(CELLS);
  age = new Float32Array(CELLS).fill(99);
  constructor(
    private tau: number,
    private hot = 0.05,
  ) {}
  level(i: number) {
    const peak = this.peak[i] ?? 0;
    const age = this.age[i] ?? 99;
    if (peak > TONE) {
      if (age < this.hot) return peak;
      return TONE * Math.exp(-(age - this.hot) / this.tau);
    }
    return peak * Math.exp(-age / this.tau);
  }
  light(i: number, level: number) {
    if (i < 0 || i >= CELLS) return;
    if (level >= this.level(i)) {
      this.peak[i] = level;
      this.age[i] = 0;
    }
  }
  /** Light the dot nearest a point. */
  point(x: number, y: number, level: number) {
    const cx = Math.round(x);
    const cy = Math.round(y);
    if (cx >= 0 && cx < N && cy >= 0 && cy < N) this.light(idx(cx, cy), level);
  }
  tick(dt: number) {
    for (let i = 0; i < CELLS; i++) this.age[i] = (this.age[i] ?? 0) + dt;
  }
  write(out: Float32Array) {
    for (let i = 0; i < CELLS; i++) out[i] = Math.max(out[i] ?? 0, this.level(i));
  }
}

/** A seeded generator, so a given instance replays the same soup. */
function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** One Game of Life generation on a wrapping grid. */
function lifeStep(cells: Uint8Array): Uint8Array {
  const next = new Uint8Array(CELLS);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx || dy) n += cells[idx(wrap(x + dx, N), wrap(y + dy, N))] ?? 0;
        }
      }
      const alive = cells[idx(x, y)] === 1;
      next[idx(x, y)] = n === 3 || (alive && n === 2) ? 1 : 0;
    }
  }
  return next;
}

/* ---------------------------------------------------------------------------
 * The eight rhythms. Each is a stepper: (time, dt, out) => void, writing a
 * level per dot into `out`, which arrives zeroed.
 * ------------------------------------------------------------------------- */

type Stepper = (t: number, dt: number, out: Float32Array) => void;

const GLIDER = [
  [1, 0],
  [2, 1],
  [0, 2],
  [1, 2],
  [2, 2],
] as const;

/** Game of Life: births flash white, the living glow, the dead cool off. */
function life(seed: number, options: { interval: number; glider: boolean }): Stepper {
  const random = mulberry(seed);
  const trail = new Trail(options.glider ? 0.32 : 0.22, options.glider ? 0.08 : 0.04);
  let cells: Uint8Array = new Uint8Array(CELLS);
  let history: string[] = [];
  let clock = 0;
  let generations = 0;

  const seedGrid = () => {
    cells = new Uint8Array(CELLS);
    if (options.glider) {
      for (const [x, y] of GLIDER) cells[idx(x, y)] = 1;
    } else {
      for (let i = 0; i < CELLS; i++) cells[i] = random() < 0.34 ? 1 : 0;
    }
    for (let i = 0; i < CELLS; i++) if (cells[i]) trail.light(i, 1);
    history = [];
    generations = 0;
  };
  seedGrid();

  return (_t, dt, out) => {
    trail.tick(dt);
    clock += dt;
    while (clock >= options.interval) {
      clock -= options.interval;
      const next = lifeStep(cells);
      for (let i = 0; i < CELLS; i++) if (next[i] && !cells[i]) trail.light(i, 1);
      cells = next;
      generations += 1;
      const key = cells.join("");
      const population = cells.reduce((sum, c) => sum + c, 0);
      // A soup that dies, freezes or settles into a blinker is reseeded.
      if (!options.glider && (population < 4 || history.includes(key) || generations > 60)) {
        seedGrid();
      }
      history = [key, ...history].slice(0, 4);
    }
    const living = options.glider ? 1 : TONE;
    for (let i = 0; i < CELLS; i++) if (cells[i]) trail.light(i, living);
    trail.write(out);
  };
}

/** A ring breathes out from the centre with two sparks circling it, then back in. */
const ring: Stepper = (t, _dt, out) => {
  const period = 2.4;
  const ph = wrap(t, period);
  let r: number;
  if (ph < 0.5) r = 3.9 * easeOut(ph / 0.5);
  else if (ph < 1.55) r = 3.75 + 0.15 * Math.cos(((ph - 0.5) / 1.05) * TAU);
  else r = 3.9 * (1 - easeInOut((ph - 1.55) / 0.85));
  const spin = (t / 1.4) * TAU;
  for (let i = 0; i < CELLS; i++) {
    const { d, a } = polar(i);
    const band = clamp01(1 - Math.abs(d - r) / 0.75);
    const spark = Math.max(0, Math.cos(a - spin), Math.cos(a - spin - Math.PI)) ** 6;
    let v = band * (TONE * 0.9 + 0.4 * spark);
    if (d < r - 0.7) v = Math.max(v, 0.12);
    if (d === 0) v = Math.max(v, r < 1 ? 1 - r * 0.3 : 0.34);
    out[i] = v;
  }
};

/** Four sparks spiral in, burst out as a diamond, open into a ring, orbit. */
function orbit(): Stepper {
  const trail = new Trail(0.14);
  const period = 1.8;
  return (t, dt, out) => {
    trail.tick(dt);
    const ph = wrap(t, period);
    const w = TAU * 0.7;
    const spin = ph >= 1.3 ? w * (ph - 1.3) : w * (ph + period - 1.3);
    const sparks = (radius: number) => {
      for (let k = 0; k < 4; k++) {
        const a = spin + (k * Math.PI) / 2;
        trail.point(MID + Math.cos(a) * radius, MID + Math.sin(a) * radius, 1);
      }
    };
    if (ph < 0.55) {
      sparks(3.7 * (1 - easeIn(ph / 0.55)));
    } else if (ph < 0.75) {
      trail.light(idx(MID, MID), 1);
    } else if (ph < 1.15) {
      const m = 3 * easeOut((ph - 0.75) / 0.4);
      for (let i = 0; i < CELLS; i++) {
        const md = polar(i).m;
        if (md <= m + 0.01) trail.light(i, Math.abs(md - Math.round(m)) < 0.5 ? 0.95 : 0.72);
      }
    } else if (ph < 1.3) {
      for (let i = 0; i < CELLS; i++) if (polar(i).m === 3) trail.light(i, TONE);
      sparks(3);
    } else {
      for (let i = 0; i < CELLS; i++) if (Math.abs(polar(i).d - 3.6) < 0.5) out[i] = 0.3;
      sparks(3.6);
    }
    trail.write(out);
  };
}

/** Two arcs swing round the centre: frown, braces round a cursor, smile, and back. */
const face: Stepper = (t, _dt, out) => {
  const period = 1.6;
  const ph = wrap(t, period);
  // s runs -1 (frown) through 0 (braces) to 1 (smile), pausing briefly at 0.
  const swing = (k: number) => {
    if (k < 0.43) return -1 + easeInOut(k / 0.43);
    if (k < 0.57) return 0;
    return easeInOut((k - 0.57) / 0.43);
  };
  let s: number;
  if (ph < 0.45) s = -1;
  else if (ph < 0.8) s = swing((ph - 0.45) / 0.35);
  else if (ph < 1.25) s = 1;
  else s = -swing((ph - 1.25) / 0.35);
  const deg = Math.PI / 180;
  const left = Math.PI - 52 * deg * s;
  const right = 52 * deg * s;
  const half = 45 * deg;
  for (let i = 0; i < CELLS; i++) {
    const { d, a } = polar(i);
    if (d === 0) {
      out[i] = 0.45 + 0.55 * (1 - Math.abs(s));
      continue;
    }
    if (d < 2.6 || d > 4.75) continue;
    if (angleGap(a, left) < half || angleGap(a, right) < half) out[i] = d < 3.7 ? 1 : TONE;
  }
};

/** The square spiral, from the top-left corner into the centre. */
const SPIRAL: number[] = (() => {
  const order: number[] = [];
  let [r0, c0, r1, c1] = [0, 0, N - 1, N - 1];
  while (r0 <= r1 && c0 <= c1) {
    for (let c = c0; c <= c1; c++) order.push(idx(c, r0));
    for (let r = r0 + 1; r <= r1; r++) order.push(idx(c1, r));
    if (r0 < r1) for (let c = c1 - 1; c >= c0; c--) order.push(idx(c, r1));
    if (c0 < c1) for (let r = r1 - 1; r > r0; r--) order.push(idx(c0, r));
    r0++;
    c0++;
    r1--;
    c1--;
  }
  return order;
})();

/** A comet winds the spiral into the centre, and the next sets off as it lands. */
const spiral: Stepper = (t, _dt, out) => {
  const speed = 20;
  const length = 14;
  const head = wrap(t * speed, CELLS);
  SPIRAL.forEach((cell, k) => {
    const behind = wrap(head - k, CELLS);
    if (behind < 1) out[cell] = 1;
    else if (behind < length)
      out[cell] = 0.12 + 0.76 * (1 - (behind - 1) / (length - 1)) ** 1.3;
  });
};

/** A spark runs in from the left, a bar sweeps out to the right, a cross glows. */
function arrow(): Stepper {
  const trail = new Trail(0.3);
  const period = 1.35;
  return (t, dt, out) => {
    trail.tick(dt);
    const ph = wrap(t, period);
    if (ph < 0.5) {
      const x = 3.6 * easeIn(ph / 0.5);
      for (let c = 0; c < Math.round(x); c++) trail.light(idx(c, MID), 0.5);
      trail.point(x, MID, 1);
    } else if (ph < 0.85) {
      const c = Math.round(4 + 4 * easeOut((ph - 0.5) / 0.35));
      for (let r = 1; r <= 7; r++) trail.light(idx(c, r), r === 1 || r === 7 ? 0.8 : 1);
      for (let x = 0; x < c; x++) trail.light(idx(x, MID), TONE);
    } else if (ph < 1.15) {
      trail.light(idx(N - 1, MID), 1);
    }
    trail.write(out);
  };
}

/** A crossed ribbon: up the rising diagonal, round the top, down the falling one. */
const RIBBON: number[] = (
  [
    [0, 8],
    [1, 7],
    [2, 6],
    [3, 5],
    [4, 4],
    [5, 3],
    [6, 2],
    [7, 2],
    [8, 1],
    [7, 0],
    [6, 0],
    [5, 0],
    [4, 0],
    [3, 0],
    [2, 0],
    [1, 0],
    [0, 1],
    [1, 2],
    [2, 2],
    [3, 3],
    [4, 4],
    [5, 5],
    [6, 6],
    [7, 7],
    [8, 8],
  ] as const
).map(([x, y]) => idx(x, y));

/** A snake runs the ribbon end to end, and back. */
function ribbon(): Stepper {
  const trail = new Trail(0.62, 0.06);
  const pass = 1.25;
  const dwell = 0.12;
  const last = RIBBON.length - 1;
  return (t, dt, out) => {
    trail.tick(dt);
    const ph = wrap(t, 2 * (pass + dwell));
    const forward = ph < pass + dwell;
    const leg = forward ? ph : ph - pass - dwell;
    const at = easeInOut(Math.min(1, leg / pass)) * last;
    const cell = RIBBON[Math.round(forward ? at : last - at)];
    if (cell !== undefined) trail.light(cell, 1);
    trail.write(out);
  };
}

function createStepper(pattern: DotMatrixLoaderPattern, seed: number): Stepper {
  switch (pattern) {
    case "life":
      return life(seed, { interval: 0.14, glider: false });
    case "glider":
      return life(seed, { interval: 0.25, glider: true });
    case "ring":
      return ring;
    case "orbit":
      return orbit();
    case "face":
      return face;
    case "spiral":
      return spiral;
    case "arrow":
      return arrow();
    case "ribbon":
      return ribbon();
  }
}

/* ---------------------------------------------------------------------------
 * Drawing
 * ------------------------------------------------------------------------- */

const mix = (a: RGB, b: RGB, k: number): RGB => [
  a[0] + (b[0] - a[0]) * k,
  a[1] + (b[1] - a[1]) * k,
  a[2] + (b[2] - a[2]) * k,
];
const rgba = ([r, g, b]: RGB, alpha = 1) =>
  `rgba(${String(Math.round(r))},${String(Math.round(g))},${String(Math.round(b))},${String(alpha)})`;

function paint(ctx: CanvasRenderingContext2D, levels: Float32Array, tone: RGB, size: number) {
  const pitch = size / N;
  const unlit = mix([0, 0, 0], tone, 0.16);
  ctx.clearRect(0, 0, size, size);
  ctx.globalCompositeOperation = "source-over";
  for (let i = 0; i < CELLS; i++) {
    const v = clamp01(levels[i] ?? 0);
    const colour =
      v <= TONE ? mix(unlit, tone, v / TONE) : mix(tone, HOT, (v - TONE) / (1 - TONE));
    ctx.fillStyle = rgba(colour);
    ctx.beginPath();
    ctx.arc(((i % N) + 0.5) * pitch, (Math.floor(i / N) + 0.5) * pitch, pitch * 0.39, 0, TAU);
    ctx.fill();
  }
  // The glow: soft discs added over the lit dots.
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < CELLS; i++) {
    const v = levels[i] ?? 0;
    if (v < 0.3) continue;
    const x = ((i % N) + 0.5) * pitch;
    const y = (Math.floor(i / N) + 0.5) * pitch;
    const radius = pitch * (0.7 + 0.5 * v);
    const glow = ctx.createRadialGradient(x, y, pitch * 0.2, x, y, radius);
    glow.addColorStop(0, rgba(tone, 0.32 * v));
    glow.addColorStop(1, rgba(tone, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
  ctx.globalCompositeOperation = "source-over";
}

/** The indicator pace: 1 normally, 2 (half speed) under reduced motion. */
function indicatorScale(node: Element): number {
  const raw = Number.parseFloat(
    window.getComputedStyle(node).getPropertyValue("--motion-scale-indicator"),
  );
  return Number.isFinite(raw) && raw > 0 ? raw : 1;
}

/* ---------------------------------------------------------------------------
 * Component
 * ------------------------------------------------------------------------- */

const dotMatrixLoaderVariants = cva(
  cn(
    "inline-flex shrink-0 items-center rounded-full select-none",
    "h-[calc(var(--u)*10.8)] gap-[calc(var(--u)*2.2)]",
    "ps-[calc(var(--u)*2.3)] pe-[calc(var(--u)*11)]",
  ),
  {
    variants: {
      size: {
        sm: "[--u:3.5px]",
        md: "[--u:5px]",
        lg: "[--u:7px]",
      },
    },
    defaultVariants: { size: "md" },
  },
);

export interface DotMatrixLoaderProps
  extends
    Omit<ComponentPropsWithRef<"span">, "children">,
    VariantProps<typeof dotMatrixLoaderVariants> {
  /** Which rhythm the matrix plays. */
  pattern?: DotMatrixLoaderPattern;
  /** The LED colour. Each rhythm has its own when this is not given. */
  tone?: DotMatrixLoaderTone;
  /** Visible text beside the matrix. Also what is announced. Pass "" to hide it. */
  label?: string;
  /** Announced when there is no visible label. */
  srLabel?: string;
  /** Sweep a light band across the label. On by default. */
  shimmer?: boolean;
  /** Seeds the `life` soup, so two pills side by side differ. */
  seed?: number;
}

/** The dot pitch, in pixels, per size. */
const PITCH = { sm: 3.5, md: 5, lg: 7 } as const;

/** An AI thinking indicator: an animated LED dot matrix and a label in a black pill. */
export function DotMatrixLoader({
  className,
  size,
  pattern = "ring",
  tone,
  label = "Thinking",
  srLabel = "Loading",
  shimmer = true,
  seed = 7,
  ...props
}: DotMatrixLoaderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const resolvedTone = tone ?? DEFAULT_TONE[pattern];
  const matrixSize = PITCH[size ?? "md"] * N;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let ctx: CanvasRenderingContext2D | null;
    try {
      ctx = canvas.getContext("2d");
    } catch {
      ctx = null;
    }
    if (!ctx) return;
    const context = ctx;

    const step = createStepper(pattern, seed);
    const levels = new Float32Array(CELLS);
    const rgb = TONES[resolvedTone];
    let scale = indicatorScale(canvas);
    let time = 0;
    let last: number | null = null;
    let raf = 0;
    let onScreen = true;
    const visible = () => onScreen && !document.hidden;

    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = Math.round(matrixSize * dpr);
    canvas.height = Math.round(matrixSize * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);

    function frame(now: number) {
      raf = 0;
      // Clamped so a long pause (a background tab) does not jump the rhythm.
      const dt = last === null ? 0 : Math.min(Math.max((now - last) / 1000, 0), 1 / 15) / scale;
      last = now;
      time += dt;
      levels.fill(0);
      step(time, dt, levels);
      paint(context, levels, rgb, matrixSize);
      if (visible()) raf = requestAnimationFrame(frame);
    }
    const request = () => {
      if (!raf && visible()) raf = requestAnimationFrame(frame);
    };

    let intersection: IntersectionObserver | undefined;
    if (typeof IntersectionObserver === "function") {
      intersection = new IntersectionObserver((entries) => {
        for (const entry of entries) onScreen = entry.isIntersecting;
        last = null;
        request();
      });
      intersection.observe(canvas);
    }
    const onVisibility = () => {
      last = null;
      request();
    };
    document.addEventListener("visibilitychange", onVisibility);
    const motion =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : null;
    const onMotion = () => {
      scale = indicatorScale(canvas);
    };
    motion?.addEventListener("change", onMotion);

    frame(performance.now());

    return () => {
      cancelAnimationFrame(raf);
      intersection?.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      motion?.removeEventListener("change", onMotion);
    };
  }, [pattern, seed, resolvedTone, matrixSize]);

  return (
    <>
      <style href={P} precedence="dowel">
        {STYLES}
      </style>
      <span
        role="status"
        data-slot="dot-matrix-loader"
        data-pattern={pattern}
        data-tone={resolvedTone}
        data-motion="indicator"
        className={cn(P, dotMatrixLoaderVariants({ size }), className)}
        {...props}
      >
        <canvas
          ref={canvasRef}
          data-part="matrix"
          aria-hidden="true"
          className="block shrink-0"
          style={{ width: matrixSize, height: matrixSize }}
        />
        {label ? (
          <span
            data-slot="dot-matrix-loader-label"
            className="text-[calc(var(--u)*4.7)] leading-none font-medium tracking-[-0.01em] whitespace-nowrap"
          >
            {shimmer ? (
              <ShimmerText
                duration={1800}
                repeatDelay={600}
                baseColor="var(--dot-matrix-loader-text)"
                shineColor={`color-mix(in oklab, ${rgba(HOT)} 78%, ${rgba(TONES[resolvedTone])})`}
              >
                {label}
              </ShimmerText>
            ) : (
              <span style={{ color: "var(--dot-matrix-loader-text)" }}>{label}</span>
            )}
          </span>
        ) : (
          <span className="sr-only">{srLabel}</span>
        )}
      </span>
    </>
  );
}

export { dotMatrixLoaderVariants };
