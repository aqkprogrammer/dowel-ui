"use client";

// Ported from SmoothUI Agent Avatar (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import { cva, type VariantProps } from "class-variance-authority";
import { useId, type ComponentPropsWithRef, type CSSProperties } from "react";

import { cn } from "@/lib/utils";

/*
 * A deterministic pixel avatar: the same seed always draws the same grid, so
 * an agent is recognisable across sessions without anyone uploading a picture.
 *
 * The source painted a canvas every frame. This draws SVG rects instead —
 * crisp at any size and density, rendered on the server with no layout shift,
 * and themable, because every colour is a token mixed at render time rather
 * than an HSL value baked into pixels. The shimmer is CSS: each cell pulses on
 * its own phase, offset along the diagonal so a wave sweeps across the grid,
 * and a few seeded cells sparkle. It is decoration, so reduced motion stops it
 * and leaves the resting grid.
 */

const PREFIX = "dowel-pixel-avatar";

/** Pulse period, from the source's 0.002 rad/ms. */
const PULSE_MS = 3142;
/** Whole-avatar breathing, from 0.0008 rad/ms. */
const BREATHE_MS = 7854;
const SPARKLE_MS = 1571;
const SPARKLE_CHANCE = 0.14;

function scaled(ms: number): string {
  return `calc(${ms.toFixed(0)}ms * var(--motion-scale, 1))`;
}

const STYLES = `
.${PREFIX}{display:inline-block;flex-shrink:0;vertical-align:middle;overflow:visible}
.${PREFIX}[data-animated] [data-slot=pixel-avatar-grid]{transform-box:fill-box;transform-origin:center;animation:${PREFIX}-breathe ${scaled(BREATHE_MS)} ease-in-out infinite}
.${PREFIX}[data-animated] [data-part=cell]{animation:${PREFIX}-pulse ${scaled(PULSE_MS)} ease-in-out infinite;animation-delay:var(--delay)}
.${PREFIX}[data-animated] [data-part=cell][data-sparkle]{animation-name:${PREFIX}-sparkle;animation-duration:${scaled(SPARKLE_MS)}}
@keyframes ${PREFIX}-pulse{0%,100%{opacity:var(--lo)}50%{opacity:var(--hi)}}
@keyframes ${PREFIX}-sparkle{0%,86%,100%{opacity:var(--lo)}93%{opacity:1}}
@keyframes ${PREFIX}-breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.03)}}
`;

/** Semantic hues an avatar can be built from. */
const TOKENS = ["primary", "info", "success", "warning", "destructive"] as const;

/** Simple deterministic string hash. */
function hashSeed(seed: string): number {
  let hash = 0;
  for (const char of seed) {
    hash = ((hash << 5) - hash + (char.codePointAt(0) ?? 0)) | 0;
  }
  return Math.abs(hash);
}

/** Seeded PRNG (mulberry32), so a seed always draws the same avatar. */
function createRng(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function percent(value: number): string {
  return `${value.toFixed(0)}%`;
}

/** Three colours in one family: the base token, shaded, tinted and blended. */
function generatePalette(hash: number): { colors: [string, string, string]; base: string } {
  const rng = createRng(hash);
  const index = Math.floor(rng() * TOKENS.length);
  const base = `var(--color-${TOKENS[index] ?? "primary"})`;
  const neighbour = `var(--color-${TOKENS[(index + 1 + Math.floor(rng() * 2)) % TOKENS.length] ?? "info"})`;
  return {
    base,
    colors: [
      base,
      `color-mix(in oklab, ${base} ${percent(62 + rng() * 20)}, var(--color-foreground))`,
      `color-mix(in oklab, ${base} ${percent(55 + rng() * 25)}, ${neighbour})`,
    ],
  };
}

interface Cell {
  x: number;
  y: number;
  color: number;
  /** Resting opacity, from the source's per-cell brightness (0.3–1). */
  lo: number;
  phase: number;
  sparkle: boolean;
}

function generateGrid(hash: number, cells: number): Cell[] {
  const rng = createRng(hash + 1);
  const grid: Cell[] = [];
  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      const brightness = 0.3 + rng() * 0.7;
      grid.push({
        x,
        y,
        color: Math.floor(rng() * 3),
        lo: 0.35 + brightness * 0.5,
        phase: rng(),
        sparkle: rng() < SPARKLE_CHANCE,
      });
    }
  }
  return grid;
}

const pixelAvatarVariants = cva("", {
  variants: {
    shape: {
      circle: "rounded-full",
      square: "rounded-[22%]",
    },
  },
  defaultVariants: {
    shape: "circle",
  },
});

export interface PixelAvatarProps
  extends
    Omit<ComponentPropsWithRef<"svg">, "children">,
    VariantProps<typeof pixelAvatarVariants> {
  /** Any string — a name, an id. The same seed always draws the same avatar. */
  seed: string;
  /** Rendered size. A number is pixels; a string is any CSS length. */
  size?: number | string;
  /** Pixels per side. */
  cells?: number;
  /** Shimmer, sparkle and breathe. Stops under reduced motion either way. */
  animated?: boolean;
  /** Replaces the three token-derived colours with any CSS colours. */
  palette?: [string, string, string];
}

/** A deterministic, gently animated pixel avatar generated from a seed. */
export function PixelAvatar({
  className,
  seed,
  size = 64,
  cells = 6,
  animated = true,
  shape = "circle",
  palette,
  style,
  ...props
}: PixelAvatarProps) {
  const clipId = `${PREFIX}-${useId().replace(/:/g, "")}`;
  const count = Math.max(2, Math.round(cells));
  const hash = hashSeed(seed);
  const generated = generatePalette(hash);
  const colors = palette ?? generated.colors;
  const base = palette?.[0] ?? generated.base;
  const grid = generateGrid(hash, count);
  const half = count / 2;
  const named = props["aria-label"] != null || props["aria-labelledby"] != null;
  const resolvedSize = typeof size === "number" ? `${String(size)}px` : size;

  return (
    <>
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      <svg
        viewBox={`0 0 ${String(count)} ${String(count)}`}
        data-slot="pixel-avatar"
        data-seed={seed}
        data-animated={animated ? "" : undefined}
        role={named ? "img" : undefined}
        aria-hidden={named ? undefined : true}
        className={cn(PREFIX, pixelAvatarVariants({ shape }), className)}
        style={{
          width: resolvedSize,
          height: resolvedSize,
          filter: `drop-shadow(0 0 calc(${resolvedSize} * .08) color-mix(in oklab, ${base} 45%, transparent))`,
          ...style,
        }}
        {...props}
      >
        <defs>
          <clipPath id={clipId}>
            {shape === "square" ? (
              <rect width={count} height={count} rx={count * 0.22} />
            ) : (
              <circle cx={half} cy={half} r={half} />
            )}
          </clipPath>
        </defs>
        <g clipPath={`url(#${clipId})`}>
          <rect
            data-slot="pixel-avatar-background"
            width={count}
            height={count}
            fill={`color-mix(in oklab, ${base} 22%, var(--color-background))`}
          />
          <g data-slot="pixel-avatar-grid" shapeRendering="crispEdges">
            {grid.map((cell) => {
              // One pulse keyframe, phased per cell and offset along the
              // diagonal: the source's pulse and wave in a single animation.
              const offset = ((cell.phase + (cell.x + cell.y) / 6) % 1) * PULSE_MS;
              return (
                <rect
                  key={`${String(cell.x)}-${String(cell.y)}`}
                  data-part="cell"
                  data-sparkle={cell.sparkle ? "" : undefined}
                  x={cell.x}
                  y={cell.y}
                  // A hair of overlap hides the seams antialiasing leaves.
                  width={1.02}
                  height={1.02}
                  fill={colors[cell.color]}
                  opacity={cell.lo}
                  style={
                    {
                      "--lo": cell.lo.toFixed(3),
                      "--hi": Math.min(1, cell.lo + 0.25).toFixed(3),
                      "--delay": `calc(${(-offset).toFixed(0)}ms * var(--motion-scale, 1))`,
                    } as CSSProperties
                  }
                />
              );
            })}
          </g>
        </g>
        <circle
          data-slot="pixel-avatar-ring"
          cx={half}
          cy={half}
          r={half - 0.04}
          fill="none"
          stroke={base}
          strokeOpacity={shape === "square" ? 0 : 0.2}
          strokeWidth={0.08}
        />
      </svg>
    </>
  );
}

export { pixelAvatarVariants };
