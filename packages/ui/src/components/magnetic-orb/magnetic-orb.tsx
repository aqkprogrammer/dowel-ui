"use client";

// Original design.
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentPropsWithRef, PointerEvent, ReactNode } from "react";

import { disabledStyles, focusRing, mirrorForDirection } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A round arrow button that is pulled toward the pointer.
 *
 * The orb sits in an invisible field a little larger than itself. While a
 * mouse moves through the field, the orb is offset toward it by `strength`
 * of the distance, and the arrow inside travels a little further again, so
 * the glyph leads the body like something on a spring. The offset is written
 * straight to CSS custom properties, so tracking the pointer never
 * re-renders. While tracking, the transition is short so the orb keeps up;
 * on leaving, it springs home through --ease-overshoot.
 *
 * Hovered, focused or pressed, the orb takes the accent colour with a soft
 * glow. The accent is `--magnetic-orb-accent`, defaulting to the primary
 * token, with `--magnetic-orb-accent-foreground` for the arrow on it, so
 * `className="[--magnetic-orb-accent:var(--color-info)]"` re-tints it.
 *
 * The glow is left off while focus is visible, so it never covers the focus
 * ring (both are box-shadows).
 *
 * Accessibility: it is a plain <button>. Icon-only, so it needs a name: the
 * default is "Continue", override it with aria-label. The pull is pointer
 * decoration only: it is skipped for touch and pen, and under reduced
 * motion. Every transition is on the motion scale.
 */

const PREFIX = "dowel-magnetic-orb";

const X = `--${PREFIX}-x`;
const Y = `--${PREFIX}-y`;

const STYLES = `
.${PREFIX}{translate:var(${X},0) var(${Y},0);transition:translate var(--duration-slower) var(--ease-overshoot),background-color var(--duration-normal) var(--ease-out-quint),color var(--duration-normal) var(--ease-out-quint),box-shadow var(--duration-normal) var(--ease-out-quint),scale var(--duration-fast) var(--ease-out-quint)}
.${PREFIX}[data-tracking]{transition-duration:var(--duration-fast),var(--duration-normal),var(--duration-normal),var(--duration-normal),var(--duration-fast);transition-timing-function:var(--ease-out-quint)}
.${PREFIX} [data-part=icon]{translate:calc(var(${X},0px) * .4) calc(var(${Y},0px) * .4);transition:translate var(--duration-slower) var(--ease-overshoot)}
.${PREFIX}[data-tracking] [data-part=icon]{transition-duration:var(--duration-fast)}
.${PREFIX}:is(:hover,:focus-visible,:active,[data-tracking]):not(:disabled){background-color:var(--magnetic-orb-accent,var(--color-primary));color:var(--magnetic-orb-accent-foreground,var(--color-primary-foreground))}
.${PREFIX}:is(:hover,:active,[data-tracking]):not(:disabled,:focus-visible){box-shadow:0 0 0 .35em color-mix(in oklab,var(--magnetic-orb-accent,var(--color-primary)) 18%,transparent),0 0 2.25em color-mix(in oklab,var(--magnetic-orb-accent,var(--color-primary)) 55%,transparent)}
`;

const magneticOrbVariants = cva(
  cn(
    PREFIX,
    "relative inline-grid shrink-0 cursor-pointer place-items-center rounded-full",
    "bg-foreground text-background shadow-md select-none active:scale-95",
    focusRing,
    disabledStyles,
  ),
  {
    variants: {
      size: {
        sm: "size-10 [&_svg]:size-4",
        md: "size-14 [&_svg]:size-5",
        lg: "size-20 [&_svg]:size-7",
      },
    },
    defaultVariants: { size: "md" },
  },
);

function Arrow() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={mirrorForDirection}
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

export interface MagneticOrbProps
  extends ComponentPropsWithRef<"button">, VariantProps<typeof magneticOrbVariants> {
  /** How far the orb follows the pointer, as a fraction of the distance (0–1). */
  strength?: number;
  /** How far beyond its edge the pull reaches, in pixels. */
  reach?: number;
  /** The glyph. Defaults to an arrow that mirrors in right-to-left layouts. */
  icon?: ReactNode;
  /** Classes for the invisible field the pointer is tracked in. */
  fieldClassName?: string;
}

/** A round arrow button pulled toward the pointer, glowing in the accent colour. */
export function MagneticOrb({
  className,
  fieldClassName,
  strength = 0.35,
  reach = 32,
  icon,
  size,
  type = "button",
  disabled,
  children,
  "aria-label": ariaLabel,
  ...props
}: MagneticOrbProps) {
  function target(field: HTMLElement): HTMLElement | null {
    return field.querySelector<HTMLElement>("[data-slot=magnetic-orb]");
  }

  function release(event: PointerEvent<HTMLSpanElement>) {
    const element = target(event.currentTarget);
    if (!element) return;
    delete element.dataset.tracking;
    element.style.setProperty(X, "0px");
    element.style.setProperty(Y, "0px");
  }

  function handleMove(event: PointerEvent<HTMLSpanElement>) {
    const element = target(event.currentTarget);
    if (!element || disabled || event.pointerType !== "mouse") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const field = event.currentTarget.getBoundingClientRect();
    const dx = event.clientX - (field.left + field.width / 2);
    const dy = event.clientY - (field.top + field.height / 2);
    const pull = Math.min(Math.max(strength, 0), 1);
    element.dataset.tracking = "";
    element.style.setProperty(X, `${String(dx * pull)}px`);
    element.style.setProperty(Y, `${String(dy * pull)}px`);
  }

  return (
    <span
      data-slot="magnetic-orb-field"
      className={cn("inline-grid place-items-center", fieldClassName)}
      style={{ padding: `${String(reach)}px` }}
      onPointerMove={handleMove}
      onPointerLeave={release}
    >
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      <button
        type={type}
        data-slot="magnetic-orb"
        disabled={disabled}
        aria-label={ariaLabel ?? (children ? undefined : "Continue")}
        className={cn(magneticOrbVariants({ size }), className)}
        {...props}
      >
        <span data-part="icon" className="grid place-items-center">
          {children ?? icon ?? <Arrow />}
        </span>
      </button>
    </span>
  );
}

export { magneticOrbVariants };
