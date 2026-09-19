"use client";

// Ported from bencho Palette (MIT, © 2026 Lorenzo Cabra). See THIRD_PARTY_NOTICES.md.
import { cva, type VariantProps } from "class-variance-authority";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
} from "react";

import { Button } from "@/components/button";
import { cn } from "@/lib/utils";

/*
 * A row of swatches and a refresh button. Pressing it shrinks the swatches to
 * round blobs that melt together through a goo filter, swaps the colours at
 * the smallest point, and pops them back out as rectangles.
 *
 * Colours are data, shown through inline style. The source generated OKLCH
 * ramps from numbers; this library's token audit forbids colour functions in
 * component source (literal or templated), so the default generator composes
 * semantic tokens instead: a light-to-dark ramp walking between two
 * neighbouring hue tokens, mixed toward the background at the light end and
 * the foreground at the dark end — exactly the "one hue family" ramp the
 * source produces, and it follows the theme. A consumer who wants free OKLCH
 * palettes passes `generate` (the story shows one).
 *
 * The morph is phase-driven CSS (melt → pop → idle) on data-phase; only the
 * blur of the goo filter is tweened in JS, because an SVG filter attribute
 * cannot be transitioned. Reduced motion swaps the colours at once.
 */

export interface PaletteColor {
  /** Any CSS colour: shown as the swatch's background. */
  value: string;
  /** Announced and used as the swatch's accessible name. */
  name: string;
}

export type PaletteGenerate = (count: number, random: () => number) => PaletteColor[];

/** Hue tokens in wheel order, so neighbours make a family. */
const HUES = ["destructive", "warning", "success", "info", "primary"] as const;

/**
 * The default generator: a light-to-dark ramp between two neighbouring hue
 * tokens. Every colour is a color-mix of semantic tokens.
 */
export const generateTokenPalette: PaletteGenerate = (count, random) => {
  const start = Math.floor(random() * HUES.length);
  const from = HUES[start] ?? "info";
  const to = HUES[(start + 1) % HUES.length] ?? "success";
  const depth = 30 + Math.round(random() * 25);
  return Array.from({ length: count }, (_, index) => {
    const t = count === 1 ? 0.5 : index / (count - 1);
    const hue = `color-mix(in oklch, var(--color-${to}) ${String(Math.round(t * 100))}%, var(--color-${from}))`;
    // Lighter than the hue toward the start, darker toward the end.
    const toward = t < 0.5 ? "background" : "foreground";
    const amount = Math.round(Math.abs(0.5 - t) * 2 * depth);
    const value = `color-mix(in oklab, ${hue} ${String(100 - amount)}%, var(--color-${toward}))`;
    const tone = t < 0.25 ? "pale " : t > 0.75 ? "deep " : "";
    const family = t < 0.2 ? from : t > 0.8 ? to : `${from}–${to}`;
    return { value, name: `${tone}${family}` };
  });
};

/** A tiny seeded PRNG, so the first palette is the same on server and client. */
function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function reducedMotion(): boolean {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** Timeline of one press, in milliseconds. */
const MELT = 300;
const SETTLE = 1000;

const paletteGeneratorVariants = cva("flex w-[18.75rem] max-w-full gap-1.5", {
  variants: {
    /** A hairline ring on both slabs — the source's Stroke switch. */
    stroke: {
      true: "[&>[data-slab]]:shadow-[inset_0_0_0_1px_var(--color-border)]",
      false: "",
    },
  },
  defaultVariants: { stroke: false },
});

const slab = cn(
  "rounded-[calc(var(--palette-generator-radius)+10px)] bg-card p-2.5 text-card-foreground",
  "transition-[scale] duration-[var(--duration-normal)] ease-[var(--ease-overshoot)]",
);

export interface PaletteGeneratorProps
  extends
    Omit<ComponentPropsWithRef<"div">, "defaultValue" | "onChange">,
    VariantProps<typeof paletteGeneratorVariants> {
  /** Controlled palette. */
  colors?: PaletteColor[];
  /** Initial palette when uncontrolled. Defaults to a generated one. */
  defaultColors?: PaletteColor[];
  /** Called with each new palette. */
  onColorsChange?: (colors: PaletteColor[]) => void;
  /** Swatches per palette. */
  count?: number;
  /** Makes a palette. Defaults to `generateTokenPalette`. */
  generate?: PaletteGenerate;
  /** How deep the shrink and melt go, 0–100. */
  morph?: number;
  /** Swatch corner radius in pixels; the slabs are 10px rounder. */
  radius?: number;
  /** The refresh button's accessible name. */
  generateLabel?: string;
  /** Names the swatch list. */
  paletteLabel?: string;
}

/** Swatches that melt together and pop back out in a new palette. */
export function PaletteGenerator({
  className,
  stroke,
  colors: colorsProp,
  defaultColors,
  onColorsChange,
  count = 4,
  generate = generateTokenPalette,
  morph = 50,
  radius = 14,
  generateLabel = "Generate a new palette",
  paletteLabel = "Palette",
  style,
  ...props
}: PaletteGeneratorProps) {
  const filterId = `dowel-palette-goo-${useId().replace(/[^a-zA-Z0-9-]/g, "")}`;
  const [uncontrolled, setUncontrolled] = useState(
    () => defaultColors ?? generate(count, seeded(count)),
  );
  const colors = colorsProp ?? uncontrolled;
  const [phase, setPhase] = useState<"idle" | "melt" | "pop">("idle");
  const [presses, setPresses] = useState(0);
  const [announced, setAnnounced] = useState("");
  const blurRef = useRef<SVGFEGaussianBlurElement | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const frame = useRef(0);
  const depth = Math.min(100, Math.max(0, morph)) / 100;

  useEffect(
    () => () => {
      for (const timer of timers.current) clearTimeout(timer);
      cancelAnimationFrame(frame.current);
    },
    [],
  );

  /** Tweens the goo blur, since an SVG filter attribute cannot transition. */
  function tweenBlur(from: number, to: number, duration: number) {
    cancelAnimationFrame(frame.current);
    const started = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - started) / duration);
      blurRef.current?.setAttribute("stdDeviation", String(from + (to - from) * t));
      if (t < 1) frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
  }

  function swap() {
    const next = generate(count, Math.random);
    if (colorsProp === undefined) setUncontrolled(next);
    onColorsChange?.(next);
    setAnnounced(`New palette: ${next.map((color) => color.name).join(", ")}`);
  }

  function press() {
    setPresses((current) => current + 1);
    for (const timer of timers.current) clearTimeout(timer);
    timers.current = [];
    if (reducedMotion()) {
      swap();
      return;
    }
    const blur = 1 + 4 * depth;
    setPhase("melt");
    tweenBlur(0, blur, MELT - 50);
    timers.current.push(
      setTimeout(() => {
        swap();
        setPhase("pop");
        tweenBlur(blur, 0, SETTLE - MELT);
      }, MELT),
      setTimeout(() => {
        setPhase("idle");
      }, SETTLE),
    );
  }

  return (
    <div
      data-slot="palette-generator"
      data-phase={phase}
      className={cn(paletteGeneratorVariants({ stroke }), className)}
      style={
        {
          "--palette-generator-radius": `${String(radius)}px`,
          "--palette-generator-morph": String(depth),
          ...style,
        } as CSSProperties
      }
      {...props}
    >
      <svg width="0" height="0" aria-hidden="true" className="absolute">
        <defs>
          <filter id={filterId}>
            <feGaussianBlur ref={blurRef} in="SourceGraphic" stdDeviation="0" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 26 -13"
            />
          </filter>
        </defs>
      </svg>
      <div
        data-slab=""
        data-slot="palette-generator-swatches"
        className={cn(slab, "min-w-0 flex-1 in-data-[phase=melt]:scale-[0.965]")}
      >
        <ul
          aria-label={paletteLabel}
          className="flex h-[3.625rem] gap-1"
          style={phase === "idle" ? undefined : { filter: `url(#${filterId})` }}
        >
          {colors.map((color, index) => (
            <li key={index} className="grid min-w-0 flex-1 place-items-center">
              <span
                role="img"
                aria-label={color.name}
                data-slot="palette-generator-swatch"
                className={cn(
                  "block size-full rounded-[var(--palette-generator-radius)]",
                  "transition-[width,height,border-radius] duration-[var(--duration-normal)] ease-[var(--ease-out-quint)]",
                  "in-data-[phase=pop]:ease-[var(--ease-overshoot)]",
                  "in-data-[phase=melt]:h-[calc(100%-(100%-2.375rem)*var(--palette-generator-morph))]",
                  "in-data-[phase=melt]:w-[calc(100%-(100%-2.375rem)*var(--palette-generator-morph))]",
                  "in-data-[phase=melt]:rounded-[50%]",
                )}
                style={{ backgroundColor: color.value }}
              />
            </li>
          ))}
        </ul>
      </div>
      <div data-slab="" className={cn(slab, "shrink-0 motion-safe:active:scale-[0.94]")}>
        <Button
          variant="ghost"
          aria-label={generateLabel}
          data-slot="palette-generator-refresh"
          className={cn(
            "h-[3.625rem] w-[1.875rem] rounded-[var(--palette-generator-radius)] p-0 text-muted-foreground",
            "hover:bg-transparent hover:text-[color-mix(in_oklab,var(--color-muted-foreground)_45%,var(--color-card))]",
          )}
          onClick={press}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="size-[1.125rem] transition-[rotate] duration-[var(--duration-slower)] ease-[var(--ease-out-quint)]"
            style={{ rotate: `${String(presses * 180)}deg` }}
          >
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8M21 3v5h-5M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16M8 16H3v5" />
          </svg>
        </Button>
      </div>
      <span role="status" aria-live="polite" className="sr-only">
        {announced}
      </span>
    </div>
  );
}

export { paletteGeneratorVariants };
