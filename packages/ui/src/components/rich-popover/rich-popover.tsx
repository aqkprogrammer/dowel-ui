"use client";

// Ported from SmoothUI Rich Popover (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import { cva, type VariantProps } from "class-variance-authority";
import { useId, type ReactElement, type ReactNode } from "react";

import {
  Popover,
  PopoverArrow,
  PopoverContent,
  PopoverTrigger,
  type PopoverContentProps,
} from "@/components/popover";
import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A popover card for a reference in running text — a video, an article, a
 * release — with a heading (optionally a link), a description, a meta chip and
 * one call to action. The source's spring (blur, scale, rise) is a hoisted
 * keyframe; placement, focus and dismissal are Dowel's Popover.
 */

const STYLES = `
@keyframes dowel-rich-popover-in {
  from { opacity: 0; scale: 0.95; filter: blur(8px); translate: 0 var(--rich-popover-rise, 5px); }
  to { opacity: 1; scale: 1; filter: blur(0); translate: 0 0; }
}
@keyframes dowel-rich-popover-out {
  to { opacity: 0; scale: 0.95; filter: blur(8px); translate: 0 var(--rich-popover-rise, 5px); }
}
[data-slot="rich-popover-content"][data-side="bottom"] { --rich-popover-rise: -5px; }
[data-slot="rich-popover-content"][data-side="left"],
[data-slot="rich-popover-content"][data-side="right"] { --rich-popover-rise: 0px; }
[data-slot="rich-popover-content"][data-state="open"] {
  animation: dowel-rich-popover-in calc(220ms * var(--motion-scale)) var(--ease-out-quint) both;
}
[data-slot="rich-popover-content"][data-state="closed"] {
  animation: dowel-rich-popover-out calc(130ms * var(--motion-scale)) var(--ease-in-quint) both;
}
`;

const richPopoverVariants = cva(
  "w-auto max-w-xs origin-[var(--radix-popover-content-transform-origin)] rounded-2xl px-4 py-3 shadow-xl",
  {
    variants: {
      tone: {
        default: "border border-border bg-popover text-popover-foreground",
        /** The source's black card. */
        inverted: "border border-foreground bg-foreground text-background",
      },
    },
    defaultVariants: {
      tone: "default",
    },
  },
);

const iconClass = "size-3.5 shrink-0";

function ExternalIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
      className={cn(iconClass, "opacity-70")}
    >
      <path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={iconClass}>
      <path d="M7 4v16l13-8z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
      className={iconClass}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export interface RichPopoverProps
  extends Omit<PopoverContentProps, "children">, VariantProps<typeof richPopoverVariants> {
  /** The element that opens it. Must accept a ref — a button, or an inline span with a role. */
  trigger: ReactElement;
  /** The card's heading, which also names it. */
  heading: ReactNode;
  /** Makes the heading a link, opened in a new tab. */
  headingHref?: string;
  /** A leading mark beside the heading (a logo, a type icon). Decorative. */
  icon?: ReactNode;
  description?: ReactNode;
  /** A small chip — a duration, a date. */
  meta?: ReactNode;
  /** The call to action's label. Without it there is no action. */
  actionLabel?: ReactNode;
  /** Makes the action a link, opened in a new tab. */
  actionHref?: string;
  onActionClick?: () => void;
  /** The action's icon. A play glyph by default. */
  actionIcon?: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/** A popover card for an inline reference: heading, description, meta and an action. */
export function RichPopover({
  className,
  trigger,
  heading,
  headingHref,
  icon,
  description,
  meta,
  actionLabel,
  actionHref,
  onActionClick,
  actionIcon = <PlayIcon />,
  open,
  defaultOpen,
  onOpenChange,
  tone,
  side = "top",
  ...props
}: RichPopoverProps) {
  const headingId = useId();
  const inverted = tone === "inverted";
  const link = cn("inline-flex items-center gap-1 rounded-sm hover:underline", focusRing);
  const action = cn(
    "inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium transition-colors duration-[var(--duration-fast)]",
    inverted
      ? "bg-background text-foreground hover:bg-background/90"
      : "bg-primary text-primary-foreground hover:bg-primary-hover",
    focusRing,
  );

  return (
    <Popover open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      <style href="dowel-rich-popover" precedence="dowel">
        {STYLES}
      </style>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        side={side}
        aria-labelledby={headingId}
        {...props}
        data-slot="rich-popover-content"
        className={cn(richPopoverVariants({ tone }), className)}
      >
        <div id={headingId} className="flex items-center gap-2 text-sm font-medium">
          {icon ? (
            <span aria-hidden="true" className="flex shrink-0 [&_svg]:size-4">
              {icon}
            </span>
          ) : null}
          {headingHref ? (
            <a href={headingHref} target="_blank" rel="noopener noreferrer" className={link}>
              <span>{heading}</span>
              <ExternalIcon />
            </a>
          ) : (
            <span>{heading}</span>
          )}
        </div>
        {description ? (
          <p className="mt-3 text-base leading-relaxed text-balance opacity-90">
            {description}
          </p>
        ) : null}
        {meta || actionLabel ? (
          <div className="mt-4 flex items-center justify-between gap-3">
            {meta ? (
              <span
                data-slot="rich-popover-meta"
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs",
                  inverted ? "bg-background/10" : "bg-muted text-muted-foreground",
                )}
              >
                <ClockIcon /> {meta}
              </span>
            ) : (
              <span />
            )}
            {actionLabel ? (
              actionHref ? (
                <a
                  href={actionHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={action}
                >
                  {actionIcon} {actionLabel}
                </a>
              ) : (
                <button type="button" className={action} onClick={onActionClick}>
                  {actionIcon} {actionLabel}
                </button>
              )
            ) : null}
          </div>
        ) : null}
        <PopoverArrow className={cn(inverted && "fill-foreground stroke-foreground")} />
      </PopoverContent>
    </Popover>
  );
}

export { richPopoverVariants };
