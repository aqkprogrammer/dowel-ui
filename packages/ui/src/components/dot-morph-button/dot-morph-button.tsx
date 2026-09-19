// Ported from SmoothUI Dot Morph Button (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import { cva, type VariantProps } from "class-variance-authority";

import { Button, type ButtonProps } from "@/components/button";
import { cn } from "@/lib/utils";

/*
 * The source morphs the dot with a JavaScript spring on mouseenter, and only
 * on devices that can hover. Here it is a CSS transition keyed off the
 * button's own state:
 *
 * - `group-hover` is already gated behind `@media (hover: hover)` in Tailwind
 *   4, which is the source's hover-device check for free — a tap never leaves
 *   the dot stuck half-morphed.
 * - Keyboard focus morphs it too. A hover-only affordance is one keyboard
 *   users never see.
 * - The overshooting ease stands in for the spring (stiffness 600, damping 22).
 *
 * The dot sits in a slot as wide as the resting dot, so narrowing into a pill
 * never nudges the label. Sizes are in em, keeping the source's proportions
 * (16px dot → 12 × 28px pill against 24px text) at any font size.
 */

const dotMorphButtonVariants = cva("", {
  variants: {
    /** Colour of the dot. The source used its brand colour, hence `primary`. */
    tone: {
      current: "",
      primary: "text-primary",
      success: "text-success",
      warning: "text-warning",
      destructive: "text-destructive",
      info: "text-info",
    },
  },
  defaultVariants: {
    tone: "primary",
  },
});

const morph = cn(
  "block h-[0.65em] w-[0.65em] rounded-full bg-current",
  "transition-[width,height] duration-[var(--duration-normal)] ease-[var(--ease-overshoot)]",
  "group-hover/dot-morph:h-[1.15em] group-hover/dot-morph:w-[0.5em]",
  "group-focus-visible/dot-morph:h-[1.15em] group-focus-visible/dot-morph:w-[0.5em]",
);

export interface DotMorphButtonProps
  extends Omit<ButtonProps, "asChild">, VariantProps<typeof dotMorphButtonVariants> {}

/**
 * A pill button led by a dot that stretches into a bar on hover and focus.
 *
 * The dot is decoration and hidden from assistive technology; the button's
 * name is its label.
 */
export function DotMorphButton({
  className,
  tone,
  variant = "outline",
  children,
  ...props
}: DotMorphButtonProps) {
  return (
    <Button
      data-slot="dot-morph-button"
      variant={variant}
      className={cn("group/dot-morph rounded-full", className)}
      {...props}
    >
      <span
        data-slot="dot-morph-button-dot"
        aria-hidden="true"
        className={cn(
          "inline-grid h-[1.15em] w-[0.65em] shrink-0 place-items-center",
          dotMorphButtonVariants({ tone }),
        )}
      >
        <span className={morph} />
      </span>
      {children}
    </Button>
  );
}

export { dotMorphButtonVariants };
