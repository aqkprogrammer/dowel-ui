"use client";

// Original design.
import { cva, type VariantProps } from "class-variance-authority";
import { useEffect, useState, type ComponentPropsWithRef, type CSSProperties } from "react";

import { cn } from "@/lib/utils";

/*
 * A word whose letters roll like a split-flap board, left to right.
 *
 * Every letter sits in its own clipped slot holding two glyphs: the one that
 * was there and the one arriving. On a roll the old glyph slides up and out
 * while the new one rises in from below, and each slot starts a beat after the
 * one before it, so the change travels across the word as a wave. A roll is
 * triggered when `text` changes and, with `loop`, every `interval` — rolling
 * the word into itself, which is the reference's idle shimmer. Slots are keyed
 * by a generation counter, so a new roll restarts the keyframes from scratch.
 * The stagger follows reading order, so in RTL the wave runs from the right.
 *
 * Accessibility: the word is plain text to a screen reader — a visually hidden
 * copy carries it, and the per-letter stage is aria-hidden, so it is never
 * spelled out letter by letter and the loop never announces anything. Under
 * reduced motion the global blanket snaps every roll to its final frame, and
 * the loop does not run at all.
 */

const PREFIX = "dowel-text-reveal";

/** A duration on the motion scale. */
function scaled(ms: number): string {
  return `calc(${String(ms)}ms * var(--motion-scale, 1))`;
}

const STYLES = `
@keyframes ${PREFIX}-out{from{transform:translateY(0)}to{transform:translateY(-110%)}}
@keyframes ${PREFIX}-in{from{transform:translateY(110%)}to{transform:translateY(0)}}
[data-slot=text-reveal-glyph][data-part=out]{animation:${PREFIX}-out var(--dur) var(--ease-in-out-quint) var(--delay) both}
[data-slot=text-reveal-glyph][data-part=in]{animation:${PREFIX}-in var(--dur) var(--ease-in-out-quint) var(--delay) both}
`;

const textRevealVariants = cva(
  "inline-block leading-none font-bold tracking-tight whitespace-pre text-foreground",
  {
    variants: {
      size: {
        sm: "text-xl",
        md: "text-3xl",
        lg: "text-5xl",
      },
    },
    defaultVariants: { size: "md" },
  },
);

export interface TextRevealProps
  extends
    Omit<ComponentPropsWithRef<"span">, "children">,
    VariantProps<typeof textRevealVariants> {
  /** The text to show. Changing it rolls the old letters out and the new ones in. */
  text: string;
  /** Roll the word into itself every `interval`, as an ambient flourish. */
  loop?: boolean;
  /** Milliseconds between rolls when looping. */
  interval?: number;
  /** Milliseconds between one letter starting and the next. */
  stagger?: number;
  /** Milliseconds each letter takes to roll. */
  duration?: number;
}

interface Roll {
  generation: number;
  from: string[];
  to: string[];
}

/** Splits by code point, so an emoji or accented letter stays one slot. */
function letters(text: string): string[] {
  return Array.from(text);
}

/** A word whose letters roll vertically in a staggered wave when it changes, or on a loop. */
export function TextReveal({
  className,
  size,
  text,
  loop = false,
  interval = 2000,
  stagger = 45,
  duration = 420,
  ...props
}: TextRevealProps) {
  const [roll, setRoll] = useState<Roll>(() => ({
    generation: 0,
    from: letters(text),
    to: letters(text),
  }));

  // A change of text starts a roll, derived during render.
  const current = roll.to.join("");
  if (current !== text) {
    setRoll({ generation: roll.generation + 1, from: roll.to, to: letters(text) });
  }

  useEffect(() => {
    if (!loop) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      setRoll((previous) => ({
        generation: previous.generation + 1,
        from: previous.to,
        to: previous.to,
      }));
    }, interval);
    return () => {
      window.clearInterval(timer);
    };
  }, [loop, interval]);

  const count = Math.max(roll.from.length, roll.to.length);
  const animate = roll.generation > 0;

  return (
    <span
      data-slot="text-reveal"
      className={cn(textRevealVariants({ size }), className)}
      {...props}
    >
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true" data-slot="text-reveal-stage" className="inline-flex">
        {Array.from({ length: count }, (_, index) => {
          const next = roll.to[index] ?? "";
          const previous = roll.from[index] ?? "";
          const style = {
            "--dur": scaled(duration),
            "--delay": scaled(index * stagger),
          } as CSSProperties;
          return (
            <span
              key={`${String(roll.generation)}-${String(index)}`}
              data-slot="text-reveal-letter"
              className="relative inline-block overflow-hidden py-[0.12em]"
              style={style}
            >
              {animate && previous ? (
                <span
                  data-slot="text-reveal-glyph"
                  data-part="out"
                  className="absolute inset-x-0 top-[0.12em] inline-block text-center"
                >
                  {previous}
                </span>
              ) : null}
              <span
                data-slot="text-reveal-glyph"
                data-part={animate ? "in" : "rest"}
                className="inline-block"
              >
                {next}
              </span>
            </span>
          );
        })}
      </span>
    </span>
  );
}

export { textRevealVariants };
