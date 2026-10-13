"use client";

// Original design.
import { cva, type VariantProps } from "class-variance-authority";
import {
  useCallback,
  type ComponentPropsWithRef,
  type CSSProperties,
  type ElementType,
} from "react";

import { useInView } from "@/hooks/use-in-view";
import { cn } from "@/lib/utils";

/*
 * A highlight drawn on behind words — a marker stroke, a thick underline, or
 * a line through — as they scroll into view, when hovered or focused, or
 * straight away.
 *
 * The text itself is never touched: the highlight is a background whose width
 * grows from the start of the reading direction, so it wraps across lines
 * with the text and draws right to left in a right-to-left page. Under
 * reduced motion it appears at once rather than drawing. It is emphasis, not
 * meaning: wrap the words in <mark> or <strong> (with `as`) when the emphasis
 * matters to the content.
 */

const highlightTextVariants = cva(
  [
    // A <mark> brings its own yellow and text colour; the highlight replaces both.
    "bg-transparent text-inherit",
    "[background-image:linear-gradient(var(--highlight-color),var(--highlight-color))] bg-no-repeat",
    "[box-decoration-break:clone] [-webkit-box-decoration-break:clone]",
    "transition-[background-size] delay-(--highlight-delay) duration-(--highlight-duration) ease-(--ease-out-quint)",
    "rtl:bg-right",
  ],
  {
    variants: {
      /** The stroke: behind the lower half of the words, beneath them, or through them. */
      variant: {
        marker:
          "rounded-[0.15em] [background-size:0%_0.6em] [background-position:0_88%] px-[0.1em] data-[drawn]:[background-size:100%_0.6em] rtl:[background-position:100%_88%]",
        underline:
          "[background-size:0%_0.12em] [background-position:0_100%] data-[drawn]:[background-size:100%_0.12em] rtl:[background-position:100%_100%]",
        strike:
          "[background-size:0%_0.09em] [background-position:0_58%] data-[drawn]:[background-size:100%_0.09em] rtl:[background-position:100%_58%]",
      },
    },
    defaultVariants: { variant: "marker" },
  },
);

/** Elements highlighted text renders as. Use `mark` or `strong` when the emphasis matters. */
export type HighlightTextElement = "span" | "mark" | "strong" | "em";

export interface HighlightTextProps
  extends
    Omit<ComponentPropsWithRef<"span">, "color">,
    VariantProps<typeof highlightTextVariants> {
  /** The element to render. Default "span". */
  as?: HighlightTextElement;
  /** When to draw: on scrolling into view, while hovered or focused, or at once. Default "view". */
  trigger?: "view" | "hover" | "always";
  /** Highlight colour: a token or any CSS colour. Default: a warm marker, or the primary colour for lines. */
  color?: string;
  /** Length of the draw, in milliseconds. Default 700. */
  duration?: number;
  /** Wait before drawing, in milliseconds. Default 0. */
  delay?: number;
}

function toCss(color: string): string {
  return /^[a-z][a-z0-9-]*$/.test(color) ? `var(--color-${color})` : color;
}

/** A marker, underline or strike drawn on behind words, in view, on hover or at once. */
export function HighlightText({
  as: Component = "span",
  variant,
  trigger = "view",
  color,
  duration = 700,
  delay = 0,
  className,
  style,
  ref,
  ...props
}: HighlightTextProps) {
  const Element = Component as ElementType;
  const look = variant ?? "marker";
  const { ref: inViewRef, inView } = useInView<HTMLElement>({
    once: true,
    initial: false,
    threshold: 0.6,
  });
  const setRefs = useCallback(
    (node: HTMLElement | null) => {
      inViewRef(node);
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [inViewRef, ref],
  );

  const tint = color
    ? toCss(color)
    : look === "marker"
      ? "color-mix(in oklab, var(--color-warning) 38%, transparent)"
      : "var(--color-primary)";
  const drawn = trigger === "always" || (trigger === "view" && inView);

  return (
    <Element
      ref={setRefs}
      data-slot="highlight-text"
      data-trigger={trigger}
      data-drawn={drawn || undefined}
      className={cn(
        highlightTextVariants({ variant: look }),
        // Hover and focus draw it too, whatever the trigger, so the keyboard sees what the mouse does.
        trigger === "hover" &&
          (look === "marker"
            ? "hover:[background-size:100%_0.6em] focus-visible:[background-size:100%_0.6em] [:focus-within>&]:[background-size:100%_0.6em]"
            : look === "underline"
              ? "hover:[background-size:100%_0.12em] focus-visible:[background-size:100%_0.12em] [:focus-within>&]:[background-size:100%_0.12em]"
              : "hover:[background-size:100%_0.09em] focus-visible:[background-size:100%_0.09em] [:focus-within>&]:[background-size:100%_0.09em]"),
        className,
      )}
      style={
        {
          "--highlight-color": tint,
          "--highlight-duration": `calc(${String(Math.max(0, duration))}ms * var(--motion-scale, 1))`,
          "--highlight-delay": `calc(${String(Math.max(0, delay))}ms * var(--motion-scale, 1))`,
          ...style,
        } as CSSProperties
      }
      {...props}
    />
  );
}

export { highlightTextVariants };
