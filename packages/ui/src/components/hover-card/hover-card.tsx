"use client";

// Original design (pattern inspired by Animate UI Hover Card; no code referenced).
import { cva, type VariantProps } from "class-variance-authority";
import { HoverCard as HoverCardPrimitive } from "radix-ui";
import type { ComponentPropsWithRef } from "react";

import { cn } from "@/lib/utils";

/*
 * A card that previews what is behind a link when it is hovered or focused.
 *
 * It grows out of its trigger: the origin is the one Radix computes for the
 * side and alignment it settled on, so a single keyframe pair covers every
 * placement. The scale runs on the overshoot curve, so the card swells just
 * past full size and settles, while opacity and an 8px blur resolve on a
 * plain ease-out underneath it — two animations, because an overshooting
 * blur would go negative. Leaving is quicker and does not bounce.
 *
 * With `stagger` (or a `data-stagger` attribute) its direct children rise a
 * few pixels into place one after another, behind the card itself.
 *
 * Hover cards are for sighted pointer and keyboard users: Radix opens it when
 * the trigger is hovered or focused, but its content is not announced and is
 * skipped by the tab order. Never put the only copy of anything in it. Every
 * keyframe is on the motion scale, so under reduced motion it simply appears.
 */

const PREFIX = "dowel-hover-card";

/** A duration on the motion scale. */
function scaled(ms: number): string {
  return `calc(${String(ms)}ms * var(--motion-scale, 1))`;
}

const CONTENT = "[data-slot=hover-card-content]";
// The arrow's positioning wrapper is a direct child too; it must not rise.
const STAGGER_CHILD = `${CONTENT}[data-stagger][data-state=open]>:not(:has(>[data-slot=hover-card-arrow]))`;
const STAGGER_STEP_MS = 45;
const STAGGERED = 6;

const STYLES = `
@keyframes ${PREFIX}-grow{from{scale:.86}to{scale:1}}
@keyframes ${PREFIX}-focus{from{opacity:0;filter:blur(8px)}to{opacity:1;filter:blur(0)}}
@keyframes ${PREFIX}-out{to{opacity:0;scale:.94;filter:blur(4px)}}
@keyframes ${PREFIX}-rise{from{opacity:0;translate:0 .375rem}}
${CONTENT}[data-state=open]{animation:${PREFIX}-grow ${scaled(420)} var(--ease-overshoot) both,${PREFIX}-focus ${scaled(220)} var(--ease-out-quint) both}
${CONTENT}[data-state=closed]{animation:${PREFIX}-out ${scaled(130)} var(--ease-in-quint) both}
${STAGGER_CHILD}{animation:${PREFIX}-rise ${scaled(300)} var(--ease-out-quint) ${scaled(70)} both}
${Array.from(
  { length: STAGGERED - 1 },
  (_, i) =>
    `${STAGGER_CHILD}:nth-child(${String(i + 2)}){animation-delay:${scaled(70 + (i + 1) * STAGGER_STEP_MS)}}`,
).join("\n")}
${STAGGER_CHILD}:nth-child(n+${String(STAGGERED + 1)}){animation-delay:${scaled(70 + STAGGERED * STAGGER_STEP_MS)}}
`;

const hoverCardVariants = cva(
  cn(
    "z-[var(--z-popover)] rounded-xl border border-border bg-popover text-popover-foreground shadow-lg outline-none",
    "origin-[var(--radix-hover-card-content-transform-origin)]",
  ),
  {
    variants: {
      size: {
        sm: "w-56 p-3 text-sm",
        md: "w-72 p-4 text-sm",
        lg: "w-80 p-5 text-sm",
      },
    },
    defaultVariants: {
      size: "md",
    },
  },
);

export type HoverCardProps = ComponentPropsWithRef<typeof HoverCardPrimitive.Root>;

/** The root. Waits 400ms before opening and 200ms before closing, so passing over a link does not flash a card. */
export function HoverCard({ openDelay = 400, closeDelay = 200, ...props }: HoverCardProps) {
  return <HoverCardPrimitive.Root openDelay={openDelay} closeDelay={closeDelay} {...props} />;
}

export const HoverCardTrigger = HoverCardPrimitive.Trigger;
export const HoverCardPortal = HoverCardPrimitive.Portal;

export interface HoverCardContentProps
  extends
    ComponentPropsWithRef<typeof HoverCardPrimitive.Content>,
    VariantProps<typeof hoverCardVariants> {
  /** Brings the direct children in one after another, a few pixels below their place. */
  stagger?: boolean;
}

export function HoverCardContent({
  className,
  size,
  stagger = false,
  align = "center",
  sideOffset = 8,
  ...props
}: HoverCardContentProps) {
  return (
    <>
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      <HoverCardPrimitive.Portal>
        <HoverCardPrimitive.Content
          data-slot="hover-card-content"
          data-stagger={stagger ? "" : undefined}
          align={align}
          sideOffset={sideOffset}
          className={cn(hoverCardVariants({ size }), className)}
          {...props}
        />
      </HoverCardPrimitive.Portal>
    </>
  );
}

export function HoverCardArrow({
  className,
  ...props
}: ComponentPropsWithRef<typeof HoverCardPrimitive.Arrow>) {
  return (
    <HoverCardPrimitive.Arrow
      data-slot="hover-card-arrow"
      width={12}
      height={6}
      className={cn("fill-popover stroke-border", className)}
      {...props}
    />
  );
}

export { hoverCardVariants };
