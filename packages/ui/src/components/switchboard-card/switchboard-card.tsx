"use client";

// Ported from SmoothUI Switchboard Card (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentPropsWithRef,
  type ReactNode,
} from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A feature card whose illustration is a grid of tiny lights: either a fixed
 * pattern (a word, a logo) lit steadily, or random lights that flicker
 * off → medium → high → off on a timer.
 *
 * The flicker is decoration, so it follows the rules for decoration: it stops
 * while the card is off-screen or the tab is hidden, and under reduced motion
 * it never starts — the grid shows one still frame instead. That frame comes
 * from a seeded generator rather than Math.random, so the server and the
 * client render the same lights and hydration never disagrees.
 *
 * Light colours are the primary token mixed with transparency; unlit lights
 * are the current text colour, so the inverted variant needs no extra rules.
 */

export type SwitchboardLightState = "off" | "medium" | "high";

const switchboardCardVariants = cva(
  cn(
    "group/switchboard relative flex min-h-72 w-full flex-col overflow-hidden rounded-xl border p-6 text-start",
    "transition-[border-color,background-color] duration-[var(--duration-fast)] ease-[var(--ease-out-quint)]",
    focusRing,
  ),
  {
    variants: {
      /** `inverted` is the source's "next" variant: a foreground gradient with background-coloured text. */
      variant: {
        default: "border-border bg-card text-card-foreground hover:border-border-strong",
        inverted: cn(
          "border-transparent text-background",
          "bg-[linear-gradient(110deg,var(--color-foreground),color-mix(in_oklab,var(--color-foreground)_78%,var(--color-background)))]",
        ),
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const LIGHT: Record<SwitchboardLightState, string> = {
  off: "size-0.5 bg-[color-mix(in_oklab,currentColor_35%,transparent)]",
  medium: cn(
    "size-0.5 bg-primary",
    "shadow-[0_0_2px_1px_color-mix(in_oklab,var(--color-primary)_40%,transparent),0_0_4px_1.5px_color-mix(in_oklab,var(--color-primary)_25%,transparent)]",
  ),
  high: cn(
    "size-[3px] bg-primary",
    "shadow-[0_0_2px_1px_color-mix(in_oklab,var(--color-primary)_60%,transparent),0_0_4px_1.5px_color-mix(in_oklab,var(--color-primary)_35%,transparent),0_0_6px_2px_color-mix(in_oklab,var(--color-primary)_20%,transparent)]",
  ),
};

const NEXT: Record<SwitchboardLightState, SwitchboardLightState> = {
  off: "medium",
  medium: "high",
  high: "off",
};

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeToMotionPreference(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => {
    query.removeEventListener("change", onChange);
  };
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeToMotionPreference,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );
}

/** mulberry32: a tiny deterministic generator for the still frame. */
function seeded(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Indices lit by a flat (row-major) or two-dimensional pattern of 0s and 1s. */
function litIndices(
  pattern: number[] | number[][],
  columns: number,
  rows: number,
): Set<number> {
  const lit = new Set<number>();
  pattern.forEach((entry, index) => {
    if (Array.isArray(entry)) {
      if (index >= rows) return;
      entry.forEach((cell, column) => {
        if (cell === 1 && column < columns) lit.add(index * columns + column);
      });
    } else if (entry === 1 && index < columns * rows) {
      lit.add(index);
    }
  });
  return lit;
}

export interface SwitchboardCardProps
  extends
    Omit<ComponentPropsWithRef<"div">, "title">,
    VariantProps<typeof switchboardCardVariants> {
  /** The card's heading. */
  heading: ReactNode;
  /** Supporting text under the heading. */
  description?: ReactNode;
  /** The heading element, so the card fits the page's outline. */
  headingAs?: "h2" | "h3" | "h4" | "p";
  /** Lights per row. */
  columns?: number;
  /** Rows of lights. */
  rows?: number;
  /**
   * Lights to hold on: a flat row-major array or a `[row][column]` grid, where
   * 1 is lit. Takes precedence over `randomLights`.
   */
  gridPattern?: number[] | number[][];
  /** Flicker random lights instead of showing a pattern. */
  randomLights?: boolean;
  /** Milliseconds between flicker steps. */
  interval?: number;
  /** Seed for the still frame shown under reduced motion. */
  seed?: number;
  /**
   * Describes the illustration when it means something (a pattern spelling a
   * word). Without it the lights are decorative and hidden from assistive technology.
   */
  illustrationLabel?: string;
  /** Makes the whole card a link. */
  href?: string;
  /** Renders the child element (a router link, a button) as the card. */
  asChild?: boolean;
}

/** A feature card illustrated by a grid of lights — a lit pattern, or random flicker. */
export function SwitchboardCard({
  className,
  heading,
  description,
  headingAs: Heading = "h3",
  columns = 18,
  rows = 5,
  gridPattern,
  randomLights = false,
  interval = 200,
  seed = 1,
  illustrationLabel,
  href,
  asChild = false,
  variant = "default",
  children,
  ...props
}: SwitchboardCardProps) {
  const total = columns * rows;
  const flickering = randomLights && !gridPattern;
  const reduceMotion = usePrefersReducedMotion();
  const grid = useRef<HTMLDivElement>(null);

  const [flicker, setFlicker] = useState<SwitchboardLightState[]>(() =>
    Array.from({ length: total }, () => "off"),
  );

  const lights = useMemo<SwitchboardLightState[]>(() => {
    if (gridPattern) {
      const lit = litIndices(gridPattern, columns, rows);
      return Array.from({ length: total }, (_, index) => (lit.has(index) ? "high" : "off"));
    }
    if (flickering && reduceMotion) {
      const random = seeded(seed);
      return Array.from({ length: total }, () => (random() < 0.15 ? "high" : "off"));
    }
    if (flickering) {
      return flicker.length === total ? flicker : Array.from({ length: total }, () => "off");
    }
    return Array.from({ length: total }, () => "off");
  }, [gridPattern, columns, rows, total, flickering, reduceMotion, seed, flicker]);

  useEffect(() => {
    if (!flickering || reduceMotion) return;
    const element = grid.current;
    let onScreen = true;
    const observer =
      typeof IntersectionObserver === "undefined" || !element
        ? undefined
        : new IntersectionObserver(([entry]) => {
            onScreen = entry?.isIntersecting ?? true;
          });
    if (element) observer?.observe(element);

    const timer = setInterval(() => {
      if (!onScreen || document.hidden) return;
      setFlicker((previous) => {
        const next: SwitchboardLightState[] =
          previous.length === total
            ? [...previous]
            : Array.from({ length: total }, () => "off");
        const steps = Math.max(1, Math.floor(total * 0.2));
        for (let step = 0; step < steps; step++) {
          const index = Math.floor(Math.random() * total);
          next[index] = NEXT[next[index] ?? "off"];
        }
        return next;
      });
    }, interval);

    return () => {
      clearInterval(timer);
      observer?.disconnect();
    };
  }, [flickering, reduceMotion, total, interval]);

  // Every root takes a div's attributes; only the ref's element type differs,
  // which TypeScript cannot reconcile across the union.
  const Root = (asChild ? Slot.Root : href ? "a" : "div") as "div";
  const link = asChild || !href ? {} : { href };

  return (
    <Root
      data-slot="switchboard-card"
      data-variant={variant}
      {...link}
      className={cn(switchboardCardVariants({ variant }), className)}
      {...props}
    >
      {asChild ? <Slot.Slottable>{children}</Slot.Slottable> : null}
      <div
        data-slot="switchboard-card-illustration"
        role={illustrationLabel ? "img" : undefined}
        aria-label={illustrationLabel}
        aria-hidden={illustrationLabel ? undefined : true}
        className="flex flex-1 items-center"
      >
        <div
          ref={grid}
          data-slot="switchboard-card-lights"
          data-animated={flickering && !reduceMotion ? "" : undefined}
          className="grid h-20 w-full items-center justify-items-center"
          style={{
            gridTemplateColumns: `repeat(${String(columns)}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${String(rows)}, minmax(0, 1fr))`,
          }}
        >
          {lights.map((state, index) => (
            <span
              // Grid positions are fixed and never reorder, so the index is the identity.
              key={`light-${String(index)}`}
              data-slot="switchboard-card-light"
              data-state={state}
              className={cn(
                "block rounded-full transition-[background-color,box-shadow,width,height] duration-[var(--duration-normal)] ease-[var(--ease-out-quint)]",
                LIGHT[state],
              )}
            />
          ))}
        </div>
      </div>
      <Heading
        data-slot="switchboard-card-heading"
        className={cn(
          "mt-auto pt-4 text-xl leading-8 font-semibold tracking-tight",
          variant === "inverted" && "text-2xl",
        )}
      >
        {heading}
      </Heading>
      {description != null ? (
        <p
          data-slot="switchboard-card-description"
          className={cn(
            "mt-1 text-sm leading-relaxed",
            variant === "inverted"
              ? "max-w-[80%] text-base opacity-85"
              : "text-muted-foreground",
          )}
        >
          {description}
        </p>
      ) : null}
      {asChild ? null : children}
    </Root>
  );
}

export { switchboardCardVariants };
