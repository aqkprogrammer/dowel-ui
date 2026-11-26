"use client";

import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentPropsWithRef, CSSProperties } from "react";

import { cn } from "@/lib/utils";

/*
 * Three dots that swell and fade one after another: someone is typing.
 *
 * Each dot runs the same keyframe (small and dim, then full size and bright,
 * then back) on a one-second cycle, offset by a fraction of the cycle so the
 * pulse travels from the first dot to the last. The geometry is in `em`, so
 * `size` scales the whole indicator by changing one font size, and the colour
 * is `currentColor`.
 *
 * This is an indicator: it reports that something is still happening, so it
 * carries data-motion="indicator" and its timing runs through
 * --motion-scale-indicator. Under reduced motion it slows rather than freezes,
 * because a frozen typing indicator reads as a dropped connection.
 *
 * The root is role="status" with a visually hidden label ("Typing" by
 * default); the dots themselves are aria-hidden. `direction: ltr` keeps the
 * wave running the same way in right-to-left layouts, as a loader's travel is
 * not reading order.
 */

const P = "dowel-pulse-dots";

const t = (seconds: number) => `calc(${String(seconds)}s * var(--motion-scale-indicator, 1))`;

const CYCLE = 1;
const STAGGER = 0.16;

const STYLES = `
.${P}{direction:ltr}
.${P} [data-part=dot]{display:block;width:1em;height:1em;border-radius:9999px;background:currentColor;transform:scale(.62);opacity:.4;animation:${P}-pulse ${t(CYCLE)} cubic-bezier(.45,0,.55,1) infinite;animation-delay:var(--delay)}
@keyframes ${P}-pulse{0%,100%{transform:scale(.62);opacity:.4}40%{transform:scale(1);opacity:1}70%{transform:scale(.62);opacity:.4}}
`;

const pulseDotsVariants = cva("inline-flex shrink-0 items-center gap-[0.55em]", {
  variants: {
    size: {
      sm: "text-[0.375rem]",
      md: "text-[0.625rem]",
      lg: "text-[0.875rem]",
    },
  },
  defaultVariants: { size: "md" },
});

export interface PulseDotsProps
  extends
    Omit<ComponentPropsWithRef<"span">, "children">,
    VariantProps<typeof pulseDotsVariants> {
  /** Announced to assistive technology. Defaults to "Typing". */
  label?: string;
  /** How many dots. Defaults to three. */
  count?: number;
}

/** A typing indicator: three dots pulsing in scale and opacity, in sequence. */
export function PulseDots({
  className,
  size,
  label = "Typing",
  count = 3,
  ...props
}: PulseDotsProps) {
  return (
    <>
      <style href={P} precedence="dowel">
        {STYLES}
      </style>
      <span
        role="status"
        data-slot="pulse-dots"
        // An indicator: reduced motion slows it rather than stopping it.
        data-motion="indicator"
        className={cn(P, pulseDotsVariants({ size }), className)}
        {...props}
      >
        <span className="sr-only">{label}</span>
        {Array.from({ length: count }, (_, index) => (
          <span
            key={index}
            aria-hidden="true"
            data-part="dot"
            // The reduced-motion blanket matches each element, so the dots carry
            // the exemption too, not only the root.
            data-motion="indicator"
            style={{ "--delay": t(index * STAGGER) } as CSSProperties}
          />
        ))}
      </span>
    </>
  );
}

export { pulseDotsVariants };
