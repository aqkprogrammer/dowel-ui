// Original design.
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentPropsWithRef, CSSProperties, ElementType } from "react";

import { cn } from "@/lib/utils";

/*
 * A label whose letters roll over on hover or focus: each slides out and an
 * identical one slides in behind it, one letter after the next — for a nav
 * link, a button, a footer item.
 *
 * It responds to its own hover and focus, or to its parent's, so it works
 * inside a link or a button with no wiring. The real text is one run in a
 * visually hidden copy, so a screen reader reads the word, not its letters;
 * the rolling letters are aria-hidden. CSS only, server-rendered. Under
 * reduced motion the swap is instant, which, as the letters are the same,
 * shows nothing at all.
 */

const letterSwapVariants = cva("relative inline-flex", {
  variants: {
    /** Which way the letters roll. */
    direction: {
      up: "[--letter-swap-from:100%] [--letter-swap-to:-100%]",
      down: "[--letter-swap-from:-100%] [--letter-swap-to:100%]",
    },
  },
  defaultVariants: { direction: "up" },
});

/** The state that makes the letters roll: its own hover or focus, or its parent's. */
const ACTIVE =
  "[[data-slot=letter-swap]:hover_&]:translate-y-(--letter-swap-to) [[data-slot=letter-swap]:focus-visible_&]:translate-y-(--letter-swap-to) [:hover>[data-slot=letter-swap]_&]:translate-y-(--letter-swap-to) [:focus-visible>[data-slot=letter-swap]_&]:translate-y-(--letter-swap-to)";

/** Elements a letter-swap label renders as. */
export type LetterSwapElement = "span" | "p" | "strong" | "em";

export interface LetterSwapProps
  extends
    Omit<ComponentPropsWithRef<"span">, "children">,
    VariantProps<typeof letterSwapVariants> {
  /** The label. Plain text: it is split into letters. */
  children: string;
  /** The element to render. Default "span". */
  as?: LetterSwapElement;
  /** Delay between one letter and the next, in milliseconds. Default 22. */
  stagger?: number;
  /** Length of each letter's roll, in milliseconds. Default 320. */
  duration?: number;
}

/** A label whose letters roll over, one after another, on hover or focus. */
export function LetterSwap({
  children,
  as: Component = "span",
  direction,
  stagger = 22,
  duration = 320,
  className,
  style,
  ...props
}: LetterSwapProps) {
  const Element = Component as ElementType;
  // By code point, so an accented letter or most emoji stay whole.
  const letters = Array.from(children);

  return (
    <Element
      data-slot="letter-swap"
      className={cn(letterSwapVariants({ direction }), className)}
      style={
        {
          "--letter-swap-duration": `calc(${String(Math.max(0, duration))}ms * var(--motion-scale, 1))`,
          ...style,
        } as CSSProperties
      }
      {...props}
    >
      <span className="sr-only">{children}</span>
      <span aria-hidden="true" data-slot="letter-swap-letters" className="inline-flex">
        {letters.map((letter, index) => {
          const glyph = letter === " " ? " " : letter;
          return (
            <span key={index} className="relative inline-block overflow-hidden">
              <span
                className={cn(
                  "inline-block transition-transform duration-(--letter-swap-duration) ease-(--ease-out-quint)",
                  ACTIVE,
                )}
                style={{
                  transitionDelay: `calc(${String(index * Math.max(0, stagger))}ms * var(--motion-scale, 1))`,
                }}
              >
                {glyph}
              </span>
              <span
                className={cn(
                  "absolute inset-0 inline-block translate-y-(--letter-swap-from) transition-transform duration-(--letter-swap-duration) ease-(--ease-out-quint)",
                  "[:focus-visible>[data-slot=letter-swap]_&]:translate-y-0 [:hover>[data-slot=letter-swap]_&]:translate-y-0 [[data-slot=letter-swap]:focus-visible_&]:translate-y-0 [[data-slot=letter-swap]:hover_&]:translate-y-0",
                )}
                style={{
                  transitionDelay: `calc(${String(index * Math.max(0, stagger))}ms * var(--motion-scale, 1))`,
                }}
              >
                {glyph}
              </span>
            </span>
          );
        })}
      </span>
    </Element>
  );
}

export { letterSwapVariants };
