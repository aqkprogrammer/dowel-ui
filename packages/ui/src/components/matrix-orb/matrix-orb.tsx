"use client";

// Original design (pattern inspired by Rare UI Matrix orb; no code referenced).
import { cva, type VariantProps } from "class-variance-authority";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentPropsWithRef,
} from "react";

import { cn } from "@/lib/utils";

/*
 * A voice-assistant orb drawn as a dot matrix: a square grid of dots clipped
 * to a circle, where every dot's size and opacity is one sample of a field.
 *
 * Each state is its own field over the disc (radius r, angle a, time t):
 *
 * - idle: a slow ripple travelling outward over a breathing floor.
 * - listening: a bloom whose reach follows `level` — lit dots inside it, a
 *   ring pattern running outward through them. With no `level` it follows a
 *   built-in, speech-like envelope.
 * - thinking: two comet arms orbiting a band of the disc, with a three-lobed
 *   core turning the other way.
 *
 * What is drawn is the sum of the three fields weighted by how far the orb is
 * into each state. On a change the weights ease exponentially toward the new
 * state (and the level toward its target, with a fast attack and slower
 * release), so the orb morphs between states and never jumps. The weights
 * always sum to one, which keeps the brightness steady through a blend.
 *
 * The grid is drawn on a 2D canvas, sized at DPR (capped at 2), in the root's
 * text colour — `tone` or `color` — so it follows the theme. The loop runs on
 * requestAnimationFrame only while the orb is on screen and the tab is
 * visible. Under reduced motion (or `--motion-scale` at zero) it draws one
 * still frame per state instead, and without a 2D context it draws nothing:
 * the root still carries the state as its accessible name.
 *
 * Accessibility: the root is role="img" named after the state (the caption
 * for that state, if there is one), so the orb reads as a single labelled
 * graphic that stays current. The visible caption is part of that image and
 * not read twice. A state change is announced only when `announce` is set,
 * through a polite status region that stays empty on first paint.
 */

const PREFIX = "dowel-matrix-orb";

const STYLES = `
@keyframes ${PREFIX}-caption-in{from{opacity:0;filter:blur(4px);translate:0 3px}}
[data-slot=matrix-orb-caption][data-enter]{animation:${PREFIX}-caption-in var(--duration-slow) var(--ease-out-quint) both}
`;

export type MatrixOrbState = "idle" | "listening" | "thinking";

const STATES: readonly MatrixOrbState[] = ["idle", "listening", "thinking"];

/** The accessible name for each state when no caption or aria-label is given. */
const DEFAULT_NAMES: Record<MatrixOrbState, string> = {
  idle: "Idle",
  listening: "Listening",
  thinking: "Thinking",
};

const matrixOrbVariants = cva("inline-flex flex-col items-center gap-3 align-middle", {
  variants: {
    /** The dot colour, as a theme token. `color` overrides it with any CSS colour. */
    tone: {
      primary: "text-primary",
      foreground: "text-foreground",
      muted: "text-muted-foreground",
    },
  },
  defaultVariants: { tone: "primary" },
});

const MAX_DPR = 2;
const TAU = Math.PI * 2;
/** Seconds for a state blend to get about two-thirds of the way. */
const STATE_EASE = 0.3;
/** Level smoothing: rises fast, falls slower, like a meter. */
const LEVEL_ATTACK = 0.05;
const LEVEL_RELEASE = 0.22;
/** The clock and bloom a still frame is drawn at. */
const STILL_TIME = 1.35;
const STILL_LEVEL = 0.55;
const MIN_DOTS = 5;
const MAX_DOTS = 64;

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
const DARK_SCHEME = "(prefers-color-scheme: dark)";

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** Hermite smoothstep; the edges may be given in either order. */
function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

interface Dot {
  /** Centre in CSS pixels. */
  x: number;
  y: number;
  /** Distance from the centre, 0–1. */
  r: number;
  /** Angle in radians, clockwise on screen. */
  a: number;
  /** Spherical shading: full at the centre, smaller toward the rim. */
  shade: number;
}

/** The dots of a `dots`-wide grid that fall inside the disc. */
function layoutDots(size: number, dots: number): Dot[] {
  const pitch = size / dots;
  const half = size / 2;
  const reach = half - pitch / 2;
  // A little past the rim, so each flat edge is a short run of dots rather
  // than a single one sticking out at the four compass points.
  const limit = reach > 0 ? 1 + (0.15 * pitch) / reach : 1;
  const found: Dot[] = [];
  for (let row = 0; row < dots; row += 1) {
    for (let col = 0; col < dots; col += 1) {
      const x = (col + 0.5) * pitch;
      const y = (row + 0.5) * pitch;
      const nx = reach > 0 ? (x - half) / reach : 0;
      const ny = reach > 0 ? (y - half) / reach : 0;
      const r = Math.hypot(nx, ny);
      if (r > limit + 1e-4) continue;
      found.push({
        x,
        y,
        r: Math.min(1, r),
        a: Math.atan2(ny, nx),
        shade: 0.6 + 0.4 * Math.sqrt(Math.max(0, 1 - r * r)),
      });
    }
  }
  return found;
}

type Weights = Record<MatrixOrbState, number>;

/** How lit a dot is, 0–1: the three state fields blended by their weights. */
function sample(dot: Dot, weights: Weights, t: number, level: number): number {
  let value = 0;
  if (weights.idle > 0.001) {
    const breathe = 0.5 + 0.5 * Math.sin(t * 1.15);
    const ripple = 0.5 + 0.5 * Math.sin(dot.r * 7.5 - t * 1.7);
    value += weights.idle * (0.2 + 0.18 * breathe + 0.3 * ripple * (1 - 0.45 * dot.r));
  }
  if (weights.listening > 0.001) {
    const reach = 0.16 + 0.92 * level;
    const body = 1 - smoothstep(reach - 0.14, reach + 0.2, dot.r);
    const rings = 0.5 + 0.5 * Math.sin(dot.r * 12 - t * 7.5);
    value += weights.listening * (0.12 + body * (0.62 + 0.26 * rings));
  }
  if (weights.thinking > 0.001) {
    const head = t * 2.3;
    // How far behind an arm's head this dot sits, 0 at the head.
    const behind = (offset: number) => (((head + offset - dot.a) % TAU) + TAU) % TAU;
    const tail = Math.max(Math.exp(-behind(0) * 1.5), Math.exp(-behind(Math.PI) * 1.5));
    const band = Math.exp(-(((dot.r - 0.64) / 0.3) ** 2));
    const core =
      Math.exp(-(((dot.r - 0.2) / 0.16) ** 2)) * (0.5 + 0.5 * Math.sin(dot.a * 3 + t * 3.2));
    value += weights.thinking * (0.1 + 0.78 * tail * band + 0.34 * core);
  }
  return clamp01(value * dot.shade);
}

/** A speech-like level, for listening without a live signal. */
function envelope(t: number): number {
  const syllables = 0.5 + 0.5 * Math.sin(t * 5.9) * Math.sin(t * 2.3 + 0.8);
  const phrase = 0.55 + 0.45 * Math.sin(t * 0.9);
  return clamp01(0.18 + 0.7 * syllables * phrase);
}

function subscribeToReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );
}

/** The theme's `--motion-scale` turned (nearly) to zero means no motion. */
function motionScaledOff(): boolean {
  const scale = Number.parseFloat(
    window.getComputedStyle(document.documentElement).getPropertyValue("--motion-scale"),
  );
  return Number.isFinite(scale) && scale < 0.01;
}

export interface MatrixOrbProps
  extends
    Omit<ComponentPropsWithRef<"div">, "children" | "color">,
    VariantProps<typeof matrixOrbVariants> {
  /** Which field the orb plays. Changes blend smoothly. */
  state?: MatrixOrbState;
  /**
   * How far the listening bloom reaches, 0–1 — a live input or output level.
   * Omit it for a built-in speech-like envelope.
   */
  level?: number;
  /** Diameter of the orb in pixels. */
  size?: number;
  /** Dots across the grid, 5–64. */
  dots?: number;
  /** Any CSS colour for the dots. Defaults to the `tone` token. */
  color?: string;
  /**
   * A caption under the orb for each state. A state's caption is also its
   * accessible name; states without one are named "Idle", "Listening" and
   * "Thinking".
   */
  labels?: Partial<Record<MatrixOrbState, string>>;
  /** Announce state changes through a polite live region. Off by default. */
  announce?: boolean;
}

/** A circular dot-matrix orb that ripples, blooms with a level, or orbits while thinking. */
export function MatrixOrb({
  className,
  tone,
  state = "idle",
  level,
  size = 120,
  dots = 17,
  color,
  labels,
  announce = false,
  style,
  "aria-label": ariaLabel,
  ...props
}: MatrixOrbProps) {
  const reduced = usePrefersReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const requestRef = useRef<() => void>(() => {});
  const gridDots = Math.round(Math.min(MAX_DOTS, Math.max(MIN_DOTS, dots)));
  const diameter = Math.max(1, size);
  const latest = useRef({
    state,
    level,
    size: diameter,
    dots: gridDots,
    reduced,
    colorKey: "",
  });

  // A caption enters with a short blur-in when the state changes — never on
  // first paint — and only a change is ever announced.
  const [seen, setSeen] = useState({ state, changed: false });
  if (seen.state !== state) setSeen({ state, changed: true });

  const caption = labels?.[state];
  const name = ariaLabel ?? caption ?? DEFAULT_NAMES[state];

  useLayoutEffect(() => {
    latest.current = {
      state,
      level,
      size: diameter,
      dots: gridDots,
      reduced,
      colorKey: `${color ?? ""}|${tone ?? ""}|${className ?? ""}`,
    };
    requestRef.current();
  });

  useEffect(() => {
    const node = canvasRef.current;
    if (!node) return;
    const canvas: HTMLCanvasElement = node;
    let context: CanvasRenderingContext2D | null;
    try {
      context = canvas.getContext("2d");
    } catch {
      context = null;
    }
    if (!context) return;
    const ctx = context;

    const weights: Weights = { idle: 0, listening: 0, thinking: 0 };
    weights[latest.current.state] = 1;
    let bloom = latest.current.level ?? 0;
    let time = 0;
    let last: number | null = null;
    let raf = 0;
    let onScreen = true;
    let scaledOff = motionScaledOff();
    let fill = "";
    let fillKey: string | null = null;
    let grid = { size: 0, dots: 0, dpr: 0, points: [] as Dot[] };

    const visible = () => onScreen && !document.hidden;

    function frame(now: number) {
      raf = 0;
      const props = latest.current;
      const still = props.reduced || scaledOff;
      const dt = still || last === null ? 0 : Math.min((now - last) / 1000, 1 / 15);
      last = still ? null : now;
      time += dt;

      const blend = still ? 1 : 1 - Math.exp(-dt / STATE_EASE);
      for (const key of STATES) {
        weights[key] += ((key === props.state ? 1 : 0) - weights[key]) * blend;
      }
      const target = still ? STILL_LEVEL : clamp01(props.level ?? envelope(time));
      const rate = target > bloom ? LEVEL_ATTACK : LEVEL_RELEASE;
      bloom += (target - bloom) * (still ? 1 : 1 - Math.exp(-dt / rate));

      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      if (grid.size !== props.size || grid.dots !== props.dots || grid.dpr !== dpr) {
        grid = {
          size: props.size,
          dots: props.dots,
          dpr,
          points: layoutDots(props.size, props.dots),
        };
        canvas.width = Math.max(1, Math.round(props.size * dpr));
        canvas.height = Math.max(1, Math.round(props.size * dpr));
      }
      if (fillKey !== props.colorKey) {
        fillKey = props.colorKey;
        fill = window.getComputedStyle(canvas).color || "currentColor";
      }

      const pitch = props.size / props.dots;
      const t = still ? STILL_TIME : time;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, props.size, props.size);
      ctx.fillStyle = fill;
      for (const dot of grid.points) {
        const lit = sample(dot, weights, t, bloom);
        ctx.globalAlpha = 0.16 + 0.84 * lit;
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, pitch * (0.1 + 0.34 * lit), 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      if (!still && visible()) raf = requestAnimationFrame(frame);
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

    // A theme switch changes the resolved colour and possibly the motion scale.
    const onTheme = () => {
      fillKey = null;
      scaledOff = motionScaledOff();
      request();
    };
    const theme = new MutationObserver(onTheme);
    theme.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme", "style"],
    });
    const scheme = window.matchMedia(DARK_SCHEME);
    scheme.addEventListener("change", onTheme);

    requestRef.current = request;
    // Paint the first frame now rather than on the next animation frame, which
    // never comes in a background tab, a print or a thumbnail capture — the orb
    // would otherwise be an empty box there.
    frame(performance.now());

    return () => {
      requestRef.current = () => {};
      if (raf) cancelAnimationFrame(raf);
      intersection?.disconnect();
      theme.disconnect();
      scheme.removeEventListener("change", onTheme);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const px = `${String(diameter)}px`;

  return (
    <>
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      <div
        data-slot="matrix-orb"
        data-state={state}
        role="img"
        aria-label={props["aria-labelledby"] ? undefined : name}
        className={cn(matrixOrbVariants({ tone }), className)}
        style={{ color, ...style }}
        {...props}
      >
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          data-slot="matrix-orb-canvas"
          className="block shrink-0"
          style={{ width: px, height: px }}
        />
        {caption ? (
          <span
            key={caption}
            aria-hidden="true"
            data-slot="matrix-orb-caption"
            data-enter={seen.changed ? "" : undefined}
            className="text-xs font-medium text-muted-foreground"
          >
            {caption}
          </span>
        ) : null}
      </div>
      {announce ? (
        <span role="status" aria-live="polite" className="sr-only">
          {seen.changed ? name : ""}
        </span>
      ) : null}
    </>
  );
}

export { matrixOrbVariants };
