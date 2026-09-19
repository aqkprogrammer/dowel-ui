// Ported from the SmoothUI Grid Loader and AI Loader (MIT, © 2024 Eduardo Calvo)
// and amicro's MatrixGridLoader (MIT, © 2026 Syed Subhan Uddin). See
// THIRD_PARTY_NOTICES.md.
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentPropsWithRef, CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

/*
 * Same shape as every loader family (ADR 0014): geometry in `em`, colour from
 * `currentColor`, keyframes in the hoisted <style>, every duration and delay
 * through --motion-scale-indicator, and `direction: ltr` on the root.
 *
 * SmoothUI's preset patterns are 3×3 on/off matrices; each is a `variant` here.
 * Several of its presets share a matrix, and since the matrix is all that
 * differs between presets they render identically. Each matrix is stored once
 * in PATTERNS; the other SmoothUI names stay available as variants through
 * ALIASES, which resolve to the canonical pattern:
 *
 *   solo-center  ← also breathing, ripple-in
 *   corners      ← also corners-only, corners-sync
 *   plus-hollow  ← also diamond
 *   plus-full    ← also cross, heartbeat
 *   frame        ← also frame-sync, border, ripple-out
 *   checkerboard ← also sparkle, x-shape
 *   stripes-h    ← also rows-alt
 *   sparse-1     ← also twinkle
 *   line-diag-2  ← also sparse-3
 *   line-h-top   ← also edge-cw
 *   duo-v        ← also rain
 *
 * `L-*` and `T-*` are lower-cased. SmoothUI's `sequence` mode, which cycled an
 * array of patterns on a timer, is the `sequence` variant: its docs demo
 * (corners → plus-hollow → frame) done as three stacked layers taking turns.
 */

const PREFIX = "dowel-grid-loader";

/** A delay or duration in seconds, scaled for reduced motion. */
function scaled(seconds: number): string {
  return `calc(${String(seconds)}s * var(--motion-scale-indicator, 1))`;
}

const EASE = "cubic-bezier(0.645, 0.045, 0.355, 1)";

const STYLES = `
.${PREFIX}{direction:ltr;position:relative;display:inline-grid;flex-shrink:0;color:inherit}
.${PREFIX} [data-part]{display:block;border-radius:0.25em;background:currentColor;animation-iteration-count:infinite;animation-timing-function:${EASE};animation-duration:var(--dur);animation-delay:var(--delay,0s)}
.${PREFIX}[data-rounded] [data-part=cell]{border-radius:9999px}
.${PREFIX}[data-glow] [data-part=cell]{box-shadow:0 0 0.32em currentColor,0 0 0.64em color-mix(in oklab,currentColor 25%,transparent),0 0 1.28em color-mix(in oklab,currentColor 12.5%,transparent)}
.${PREFIX} [data-part=empty]{background:transparent;animation:none}
.${PREFIX} [data-part=layer]{position:absolute;inset:0;display:grid;background:transparent;border-radius:0;animation-timing-function:linear}
@keyframes ${PREFIX}-pulse{0%,100%{opacity:.4;transform:scale(.95)}50%{opacity:1;transform:scale(1)}}
@keyframes ${PREFIX}-stagger{0%,100%{opacity:0;transform:scale(.8)}20%,80%{opacity:1;transform:scale(1)}}
@keyframes ${PREFIX}-step{0%,33.332%{opacity:1}33.333%,100%{opacity:0}}
@keyframes ${PREFIX}-fade{0%,100%{opacity:.2}50%{opacity:1}}
@keyframes ${PREFIX}-blink{0%{opacity:.25}50%{opacity:.55}75%{opacity:.8}100%{opacity:1}}
`;

/** SmoothUI's presets, as the nine cells of the 3×3 grid read row by row. */
const PATTERNS = {
  "solo-center": "000010000",
  "solo-tl": "100000000",
  "solo-tr": "001000000",
  "solo-bl": "000000100",
  "solo-br": "000000001",
  "line-h-top": "111000000",
  "line-h-mid": "000111000",
  "line-h-bot": "000000111",
  "line-v-left": "100100100",
  "line-v-mid": "010010010",
  "line-v-right": "001001001",
  "line-diag-1": "100010001",
  "line-diag-2": "001010100",
  corners: "101000101",
  "plus-hollow": "010101010",
  "plus-full": "010111010",
  "l-tl": "110100000",
  "l-tr": "011001000",
  "l-bl": "000100110",
  "l-br": "000001011",
  "t-top": "111010000",
  "t-bot": "000010111",
  "t-left": "100110100",
  "t-right": "001011001",
  "duo-h": "000110000",
  "duo-v": "010010000",
  "duo-diag": "100010000",
  frame: "111101111",
  "sparse-1": "100001010",
  "sparse-2": "010100001",
  "wave-lr": "110110110",
  "wave-rl": "011011011",
  "wave-tb": "111111000",
  "wave-bt": "000111111",
  "diagonal-tl": "110110000",
  "diagonal-tr": "011011000",
  "diagonal-bl": "000110110",
  "diagonal-br": "000011011",
  checkerboard: "101010101",
  "stripes-h": "111000111",
  "stripes-v": "101101101",
  "spiral-cw": "111001001",
  "spiral-ccw": "111100100",
  snake: "110010000",
  "snake-rev": "000010011",
  "rain-rev": "000010010",
  waterfall: "110000000",
  chaos: "101010100",
} as const;

type Pattern = keyof typeof PATTERNS;

/**
 * SmoothUI names that share a matrix with a canonical pattern. They are real
 * variants (so every source name works) but render their canonical pattern.
 */
const ALIASES = {
  breathing: "solo-center",
  "ripple-in": "solo-center",
  "corners-only": "corners",
  "corners-sync": "corners",
  diamond: "plus-hollow",
  cross: "plus-full",
  heartbeat: "plus-full",
  "frame-sync": "frame",
  border: "frame",
  "ripple-out": "frame",
  sparkle: "checkerboard",
  "x-shape": "checkerboard",
  "rows-alt": "stripes-h",
  twinkle: "sparse-1",
  "sparse-3": "line-diag-2",
  "edge-cw": "line-h-top",
  rain: "duo-v",
} as const satisfies Record<string, Pattern>;

type Alias = keyof typeof ALIASES;

/** Each alias variant and the canonical pattern it renders. */
export const gridLoaderAliases: Readonly<Record<Alias, Pattern>> = ALIASES;

/** SmoothUI's `speed` presets: one pulse, or one stagger pass, in seconds. */
const SPEEDS = { slow: 1.5, normal: 0.8, fast: 0.4 } as const;

export type GridLoaderMode = "pulse" | "stagger";
export type GridLoaderSpeed = keyof typeof SPEEDS;

interface RenderOptions {
  /** Seconds per cycle, from `speed`. */
  cycle: number;
  mode: GridLoaderMode;
}

type Variant = {
  /** Root layout, inline: the hoisted stylesheet outranks Tailwind utilities. */
  root: CSSProperties;
  render: (options: RenderOptions) => ReactNode;
};

type AnimatedStyle = CSSProperties & Record<`--${string}`, string>;

/** A cell, with its keyframe, duration and delay. */
function cell(
  key: number | string,
  size: string,
  animation: string,
  duration: number,
  delay: number,
  extra: CSSProperties = {},
): ReactNode {
  const style: AnimatedStyle = {
    width: size,
    height: size,
    animationName: `${PREFIX}-${animation}`,
    "--dur": scaled(duration),
    "--delay": scaled(delay),
    ...extra,
  };
  return <span key={key} data-part="cell" style={style} />;
}

/** An inactive cell: holds its place in the grid and draws nothing. */
function empty(key: number | string, size: string): ReactNode {
  return <span key={key} data-part="empty" style={{ width: size, height: size }} />;
}

/** SmoothUI geometry: a 32px grid at md, three 10px cells and 1px gaps. */
const CELL = "1.25em";
const GRID: CSSProperties = { gridTemplateColumns: `repeat(3, ${CELL})`, gap: "0.125em" };

/**
 * One pattern's cells. `pulse` breathes every lit cell together; `stagger`
 * reveals them one by one in reading order, each offset by cycle ÷ (lit + 2).
 */
function cells(pattern: string, { cycle, mode }: RenderOptions): ReactNode[] {
  const lit = [...pattern].filter((bit) => bit === "1").length;
  let order = 0;
  return [...pattern].map((bit, index) => {
    if (bit !== "1") return empty(index, CELL);
    if (mode === "pulse") return cell(index, CELL, "pulse", cycle, 0);
    const delay = (order++ * cycle) / (lit + 2);
    return cell(index, CELL, "stagger", cycle, delay);
  });
}

/** SmoothUI's docs demo sequence: each pattern holds for one pulse cycle. */
const SEQUENCE: Pattern[] = ["corners", "plus-hollow", "frame"];

/** SmoothUI AI Loader's diagonal wave order, in eighths of its 1.2s cycle. */
const THINKING_DELAYS = [0, 1, 2, 1, 2, 3, 2, 3, 4];
const THINKING_CYCLE = 1.2;

/** amicro's 2×2 matrix, in DOM order (TL, TR, BL, BR); it fills clockwise. */
const MATRIX_DELAYS = [0.2, 0.4, 0.8, 0.6];

const VARIANTS = {
  ...(Object.fromEntries(
    Object.entries(PATTERNS).map(([name, pattern]): [string, Variant] => [
      name,
      { root: GRID, render: (options) => cells(pattern, options) },
    ]),
  ) as Record<Pattern, Variant>),
  ...(Object.fromEntries(
    Object.entries(ALIASES).map(([name, target]): [string, Variant] => [
      name,
      { root: GRID, render: (options) => cells(PATTERNS[target], options) },
    ]),
  ) as Record<Alias, Variant>),
  sequence: {
    root: { width: "4em", height: "4em" },
    render: (options) =>
      SEQUENCE.map((name, step) => (
        <span
          key={name}
          data-part="layer"
          style={
            {
              ...GRID,
              animationName: `${PREFIX}-step`,
              "--dur": scaled(options.cycle * SEQUENCE.length),
              // Negative, so every layer is mid-rotation from the first frame.
              "--delay": scaled(-((SEQUENCE.length - step) % SEQUENCE.length) * options.cycle),
            } as AnimatedStyle
          }
        >
          {cells(PATTERNS[name], { ...options, mode: "pulse" })}
        </span>
      )),
  },
  thinking: {
    root: { gridTemplateColumns: "repeat(3, 0.75em)", gap: "0.25em" },
    render: () =>
      THINKING_DELAYS.map((step, index) =>
        cell(index, "0.75em", "fade", THINKING_CYCLE, (step * THINKING_CYCLE) / 8),
      ),
  },
  matrix: {
    root: { gridTemplateColumns: "repeat(2, 1.75em)", gap: "0.25em" },
    render: () =>
      MATRIX_DELAYS.map((delay, index) =>
        cell(index, "1.75em", "blink", 0.8, delay, {
          opacity: 0,
          borderRadius: "0.333em",
          animationTimingFunction: "ease-in-out",
        }),
      ),
  },
} satisfies Record<string, Variant>;

export type GridLoaderVariant = keyof typeof VARIANTS;

/** Every variant, in catalogue order. Stories and tests iterate this. */
export const gridLoaderVariantNames = Object.keys(VARIANTS) as GridLoaderVariant[];

const gridLoaderVariants = cva("", {
  variants: {
    size: {
      sm: "text-[0.25rem]",
      md: "text-[0.375rem]",
      lg: "text-[0.5rem]",
      xl: "text-[0.625rem]",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

export interface GridLoaderProps
  extends
    Omit<ComponentPropsWithRef<"span">, "children">,
    VariantProps<typeof gridLoaderVariants> {
  /** Which pattern to play. */
  variant?: GridLoaderVariant;
  /**
   * How the lit cells of a pattern move: together (`pulse`) or one by one in
   * reading order (`stagger`). `sequence`, `thinking` and `matrix` have their
   * own motion and ignore it.
   */
  mode?: GridLoaderMode;
  /**
   * Cycle length: `slow` 1.5s, `normal` 0.8s, `fast` 0.4s — still scaled by the
   * indicator motion scale. `thinking` and `matrix` keep their own tempo.
   */
  speed?: GridLoaderSpeed;
  /** Circular cells instead of rounded squares. */
  rounded?: boolean;
  /** A soft halo around each lit cell. Reads best on a dark surface. */
  glow?: boolean;
  /**
   * Announced to assistive technology while the loader is visible.
   *
   * Omit it when the loader sits inside something that already reports its
   * busy state — announcing twice is worse than not announcing at all.
   */
  label?: string;
}

/** An indeterminate loading indicator made of a grid of cells, in 68 variants. */
export function GridLoader({
  className,
  size,
  variant = "plus-hollow",
  mode = "pulse",
  speed = "normal",
  rounded = false,
  glow = false,
  label,
  style,
  ...props
}: GridLoaderProps) {
  const spec: Variant = VARIANTS[variant];

  return (
    <>
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      <span
        aria-hidden="true"
        data-slot="grid-loader"
        data-variant={variant}
        data-rounded={rounded ? "" : undefined}
        data-glow={glow ? "" : undefined}
        // Exempt from the reduced-motion blanket: a loader that stops says the
        // application has hung. It is slowed instead — see ADR 0014.
        data-motion="indicator"
        className={cn(PREFIX, gridLoaderVariants({ size }), className)}
        style={{ ...spec.root, ...style }}
        {...props}
      >
        {spec.render({ cycle: SPEEDS[speed], mode })}
      </span>
      {label ? (
        <span role="status" className="sr-only">
          {label}
        </span>
      ) : null}
    </>
  );
}

export { gridLoaderVariants };
