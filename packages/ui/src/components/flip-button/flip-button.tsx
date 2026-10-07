"use client";

// Original design (pattern inspired by Animate UI Flip Button; no code referenced).
import { cva, type VariantProps } from "class-variance-authority";
import { useState, type ComponentPropsWithRef, type MouseEvent, type ReactNode } from "react";

import { buttonVariants } from "@/components/button";
import { disabledStyles, focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A button with two faces that turns over in 3D.
 *
 * Both faces are ordinary Button surfaces (`buttonVariants`), stacked in one
 * grid cell inside a card with `transform-style: preserve-3d`; the back face
 * is pre-rotated half a turn and both hide their backs, so turning the card
 * shows one face at a time and the button is always as wide as the wider one.
 *
 * The turn is a real spring: a `linear()` easing sampled from a damped spring
 * that overshoots by about a tenth of a turn and settles, with the overshoot
 * token as the fallback where `linear()` is unsupported. It is CSS, so the
 * reduced-motion blanket turns it into an instant swap.
 *
 * - `trigger="hover"` turns over while hovered (on hover devices) or keyboard
 *   focused, and back again after. It is not a state, so it is not announced.
 * - `trigger="press"` is a toggle: each press turns it over, exposed as
 *   `aria-pressed`. Controllable through `flipped`.
 *
 * The accessible name is the front face — the back is aria-hidden — so a
 * screen reader hears "Follow, toggle button, pressed" rather than a name that
 * changes under it. Pass `aria-label` when the front has no text.
 */

const PREFIX = "dowel-flip-button";

/** A damped spring (stiffness 170, damping 15), sampled over 900ms. */
const SPRING =
  "linear(0,0.058,0.198,0.377,0.562,0.731,0.871,0.977,1.048,1.09,1.108,1.108,1.096,1.078,1.058,1.038,1.021,1.008,0.998,0.992,0.989,0.988,0.989,0.99,0.993,0.995,0.997,0.999,1,1.001,1.001,1.001,1)";

const STYLES = `
[data-slot=flip-button-card]{transition-property:transform;transition-duration:calc(900ms * var(--motion-scale, 1));transition-timing-function:var(--ease-overshoot)}
@supports (transition-timing-function:linear(0,1)){[data-slot=flip-button-card]{transition-timing-function:${SPRING}}}
`;

const flipButtonVariants = cva(
  cn(
    "group/flip relative inline-grid shrink-0 select-none perspective-normal",
    "transition-[scale] duration-[var(--duration-fast)] ease-[var(--ease-out-quint)] motion-safe:active:scale-[0.97]",
    focusRing,
    disabledStyles,
  ),
  {
    variants: {
      /** `y` turns like a card on a table; `x` tumbles over its top edge. */
      axis: {
        y: "",
        x: "",
      },
      /** `hover` turns while hovered or focused; `press` toggles on each press. */
      trigger: {
        hover: "",
        press: "",
      },
      /** Matches the faces' corners, so the focus ring follows them. */
      size: {
        sm: "rounded-md",
        md: "rounded-md",
        lg: "rounded-lg",
        icon: "rounded-md",
        "icon-sm": "rounded-md",
      },
      shape: {
        default: "",
        pill: "rounded-full",
        square: "rounded-none",
      },
    },
    defaultVariants: {
      axis: "y",
      trigger: "hover",
      size: "md",
      shape: "default",
    },
  },
);

/** The card's turned state, per axis. Literal so Tailwind can see it. */
const TURNED = {
  y: {
    state: "group-data-[state=back]/flip:rotate-y-180",
    hover: "group-hover/flip:rotate-y-180 group-focus-visible/flip:rotate-y-180",
    back: "rotate-y-180",
  },
  x: {
    state: "group-data-[state=back]/flip:rotate-x-180",
    hover: "group-hover/flip:rotate-x-180 group-focus-visible/flip:rotate-x-180",
    back: "rotate-x-180",
  },
} as const;

type FaceVariant = NonNullable<VariantProps<typeof buttonVariants>["variant"]>;

export interface FlipButtonProps
  extends
    Omit<ComponentPropsWithRef<"button">, "children">,
    VariantProps<typeof flipButtonVariants> {
  /** The face shown at rest. Names the button. Falls back to `children`. */
  front?: ReactNode;
  /** The face shown once turned over. Decorative: it is aria-hidden. */
  back: ReactNode;
  /** The front face, when `front` is not given. */
  children?: ReactNode;
  /** Button surface for the front face. */
  variant?: FaceVariant;
  /** Button surface for the back face. Defaults to `secondary`. */
  backVariant?: FaceVariant;
  /** Controlled turned-over state. Works with either trigger. */
  flipped?: boolean;
  /** Initial turned-over state when uncontrolled (`trigger="press"`). */
  defaultFlipped?: boolean;
  /** Called with the new state when a press turns the button. */
  onFlippedChange?: (flipped: boolean) => void;
  /** Classes for the front face. */
  frontClassName?: string;
  /** Classes for the back face. */
  backClassName?: string;
}

/** A button with a front and back face that turns over in 3D on hover, focus or press. */
export function FlipButton({
  className,
  front,
  back,
  children,
  variant = "primary",
  backVariant = "secondary",
  size,
  shape,
  axis,
  trigger,
  flipped: flippedProp,
  defaultFlipped = false,
  onFlippedChange,
  frontClassName,
  backClassName,
  onClick,
  type = "button",
  ...props
}: FlipButtonProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultFlipped);
  const controlled = flippedProp !== undefined;
  const isPress = trigger === "press";
  const flipped = controlled ? flippedProp : isPress && uncontrolled;
  const turn = TURNED[axis ?? "y"];

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    onClick?.(event);
    if (event.defaultPrevented || !isPress) return;
    if (!controlled) setUncontrolled(!flipped);
    onFlippedChange?.(!flipped);
  }

  const face = cn(
    "col-start-1 row-start-1 w-full backface-hidden",
    // The root presses; the faces only carry colour, size and shape.
    "transition-[background-color,border-color,color,box-shadow]",
  );

  return (
    <button
      type={type}
      data-slot="flip-button"
      data-state={flipped ? "back" : "front"}
      data-axis={axis ?? "y"}
      data-trigger={trigger ?? "hover"}
      aria-pressed={isPress ? flipped : undefined}
      className={cn(flipButtonVariants({ axis, trigger, size, shape }), className)}
      onClick={handleClick}
      {...props}
    >
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      <span
        data-slot="flip-button-card"
        className={cn("grid transform-3d", turn.state, isPress ? "" : turn.hover)}
      >
        <span
          data-slot="flip-button-front"
          className={cn(
            buttonVariants({ variant, size, shape, press: "none" }),
            face,
            frontClassName,
          )}
        >
          {front ?? children}
        </span>
        <span
          data-slot="flip-button-back"
          aria-hidden="true"
          className={cn(
            buttonVariants({ variant: backVariant, size, shape, press: "none" }),
            face,
            turn.back,
            backClassName,
          )}
        >
          {back}
        </span>
      </span>
    </button>
  );
}

export { flipButtonVariants };
