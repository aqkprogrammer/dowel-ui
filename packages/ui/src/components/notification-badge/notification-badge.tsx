// Ported from SmoothUI Notification Badge (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentPropsWithRef, ReactNode } from "react";

import { Badge, type BadgeProps } from "@/components/badge";
import { NumberFlow } from "@/components/number-flow";
import { cn } from "@/lib/utils";

/*
 * A Badge pinned to the corner of whatever it wraps. The styling is Badge's —
 * this only adds placement, the dot/count/status shapes, and motion:
 *
 * - The count rolls digit by digit through NumberFlow, in the direction the
 *   number moved, where the source slid the whole value with a spring.
 * - Appearing and disappearing are CSS transitions: the badge stays mounted
 *   with data-state="hidden" (so it can shrink away) and pops in from
 *   `starting:` styles, instead of AnimatePresence.
 * - The ping ring is a hoisted keyframe on the motion scale, and is not
 *   rendered at all under reduced motion.
 *
 * All of it is decoration; none of it is an indicator.
 */

const PREFIX = "dowel-notification-badge";

const STYLES = `@keyframes ${PREFIX}-ping{75%,100%{transform:scale(2);opacity:0}}
[data-slot=notification-badge-ping]{animation:${PREFIX}-ping calc(1s * var(--motion-scale, 1)) cubic-bezier(0,0,.2,1) infinite}`;

const notificationBadgeVariants = cva(
  cn(
    "isolate transition-[scale,opacity] duration-[var(--duration-normal)] ease-[var(--ease-overshoot)]",
    "data-[state=hidden]:scale-0 data-[state=hidden]:opacity-0 starting:scale-0 starting:opacity-0",
  ),
  {
    variants: {
      /** The shape: a bare dot, a number, or a presence indicator. */
      variant: {
        dot: "size-2.5 border-0 p-0",
        count: "h-5 min-w-5 px-1 text-2xs tabular-nums",
        status: "size-3 border-0 p-0 ring-2 ring-background",
      },
      /** Which corner of the wrapped element it sits on. Logical, so it mirrors in RTL. */
      position: {
        "top-end": "absolute -end-1 -top-1",
        "top-start": "absolute -start-1 -top-1",
        "bottom-end": "absolute -end-1 -bottom-1",
        "bottom-start": "absolute -start-1 -bottom-1",
        inline: "relative",
      },
    },
    defaultVariants: {
      variant: "dot",
      position: "top-end",
    },
  },
);

export type NotificationBadgeStatus = "online" | "offline" | "busy" | "away";

/** Presence colours, from Badge's semantic variants. */
const STATUS: Record<
  NotificationBadgeStatus,
  { tone: NonNullable<BadgeProps["variant"]>; className?: string; label: string }
> = {
  online: { tone: "success", label: "Online" },
  away: { tone: "warning", label: "Away" },
  busy: { tone: "destructive", label: "Busy" },
  offline: { tone: "secondary", className: "bg-muted-foreground", label: "Offline" },
};

export interface NotificationBadgeProps
  extends
    Omit<ComponentPropsWithRef<"span">, "children">,
    VariantProps<typeof notificationBadgeVariants> {
  /** The element the badge is pinned to. Without it the badge renders inline. */
  children?: ReactNode;
  /** The number shown by the `count` variant. */
  count?: number;
  /** Counts above this show as "max+". */
  max?: number;
  /** Show the `count` variant at zero instead of hiding it. */
  showZero?: boolean;
  /** Presence for the `status` variant. */
  status?: NotificationBadgeStatus;
  /** Badge colour for `dot` and `count`. `status` takes its colour from the status. */
  tone?: BadgeProps["variant"];
  /** A ring that pulses outward from the badge. Not rendered under reduced motion. */
  ping?: boolean;
  /**
   * Screen-reader text for the badge. Defaults to "3 notifications", "More than
   * 99 notifications", "New" for a dot and the status name for a status.
   */
  label?: string;
  /** Announce changes politely. Off by default: most badges should not interrupt. */
  live?: boolean;
  /** Classes for the badge itself; `className` goes to the wrapper. */
  badgeClassName?: string;
}

function defaultLabel(
  variant: NonNullable<NotificationBadgeProps["variant"]>,
  count: number,
  max: number,
  status: NotificationBadgeStatus,
): string {
  if (variant === "status") return STATUS[status].label;
  if (variant === "dot") return "New";
  if (count > max) return `More than ${String(max)} notifications`;
  return `${String(count)} ${count === 1 ? "notification" : "notifications"}`;
}

/** A dot, count or presence badge pinned to the corner of its child. */
export function NotificationBadge({
  className,
  children,
  variant = "dot",
  count = 0,
  max = 99,
  showZero = false,
  status = "online",
  tone = "default",
  ping = false,
  position,
  label,
  live = false,
  badgeClassName,
  ...props
}: NotificationBadgeProps) {
  const visible = variant !== "count" || count > 0 || showZero;
  const presence = variant === "status" ? STATUS[status] : undefined;
  const text = label ?? defaultLabel(variant ?? "dot", count, max, status);

  return (
    <span
      data-slot="notification-badge"
      className={cn("relative inline-flex shrink-0", className)}
      {...props}
    >
      {children}
      <Badge
        data-slot="notification-badge-indicator"
        data-variant={variant}
        data-state={visible ? "visible" : "hidden"}
        data-status={presence ? status : undefined}
        aria-hidden={visible ? undefined : true}
        aria-live={live ? "polite" : undefined}
        aria-atomic={live ? true : undefined}
        variant={presence?.tone ?? tone}
        size="sm"
        className={cn(
          notificationBadgeVariants({
            variant,
            position: position ?? (children == null ? "inline" : "top-end"),
          }),
          presence?.className,
          badgeClassName,
        )}
      >
        {ping && visible ? (
          <>
            <style href={PREFIX} precedence="dowel">
              {STYLES}
            </style>
            <span
              data-slot="notification-badge-ping"
              aria-hidden="true"
              className="absolute inset-0 -z-10 rounded-full bg-inherit opacity-75 motion-reduce:hidden"
            />
          </>
        ) : null}
        {variant === "count" ? (
          <span aria-hidden="true" className="inline-flex items-baseline leading-none">
            <NumberFlow value={Math.min(count, max)} />
            {count > max ? "+" : null}
          </span>
        ) : null}
        <span className="sr-only">{visible ? text : null}</span>
      </Badge>
    </span>
  );
}

export { notificationBadgeVariants };
