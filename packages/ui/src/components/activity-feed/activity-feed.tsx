import { Slot } from "radix-ui";
import type { ComponentPropsWithRef } from "react";

import { cn } from "@/lib/utils";

/**
 * A chronological list of events.
 *
 * An ordered list underneath, because the order is the meaning: a screen reader
 * announces the position and count, and "3 of 12" is information a row of divs
 * cannot convey. The connecting line is drawn with a pseudo-element rather than
 * a real node so it never appears in the accessibility tree.
 */
export function ActivityFeed({ className, ...props }: ComponentPropsWithRef<"ol">) {
  return <ol data-slot="activity-feed" className={cn("flex flex-col", className)} {...props} />;
}

export interface ActivityItemProps extends ComponentPropsWithRef<"li"> {
  /** Draws no connecting line below. Set this on the last item. */
  last?: boolean;
}

export function ActivityItem({ className, last, ...props }: ActivityItemProps) {
  return (
    <li
      data-slot="activity-item"
      data-last={last || undefined}
      className={cn(
        "relative flex gap-3 pb-6 last:pb-0",
        // The rail is a pseudo-element on the item, so it is decorative by
        // construction rather than by remembering an aria-hidden.
        "before:absolute before:start-[0.6875rem] before:top-7 before:bottom-1 before:w-px before:bg-border",
        "last:before:hidden data-[last]:before:hidden",
        className,
      )}
      {...props}
    />
  );
}

export interface ActivityIndicatorProps extends ComponentPropsWithRef<"div"> {
  asChild?: boolean;
}

/** The marker on the rail. Decorative: the item's text says what happened. */
export function ActivityIndicator({ className, asChild, ...props }: ActivityIndicatorProps) {
  const Comp = asChild ? Slot.Root : "div";

  return (
    <Comp
      data-slot="activity-indicator"
      aria-hidden="true"
      className={cn(
        "relative z-[var(--z-base)] grid size-6 shrink-0 place-items-center rounded-full",
        "border border-border bg-background text-muted-foreground",
        "[&_svg:not([class*='size-'])]:size-3",
        className,
      )}
      {...props}
    />
  );
}

export function ActivityContent({ className, ...props }: ComponentPropsWithRef<"div">) {
  return (
    <div
      data-slot="activity-content"
      className={cn("flex min-w-0 flex-1 flex-col gap-1 pt-0.5", className)}
      {...props}
    />
  );
}

export function ActivityTitle({ className, ...props }: ComponentPropsWithRef<"p">) {
  return (
    <p
      data-slot="activity-title"
      className={cn("text-sm leading-snug text-foreground", className)}
      {...props}
    />
  );
}

export interface ActivityTimeProps extends ComponentPropsWithRef<"time"> {
  /** Machine-readable timestamp. Required — a relative label alone is ambiguous. */
  dateTime: string;
}

/**
 * When the event happened.
 *
 * `dateTime` is required rather than optional: "2 hours ago" is meaningless in
 * a page read a day later, or by anything parsing the feed, and a `<time>` with
 * no datetime is just a span.
 */
export function ActivityTime({ className, dateTime, ...props }: ActivityTimeProps) {
  return (
    <time
      data-slot="activity-time"
      dateTime={dateTime}
      className={cn("text-xs text-muted-foreground", className)}
      {...props}
    />
  );
}

export function ActivityDescription({ className, ...props }: ComponentPropsWithRef<"div">) {
  return (
    <div
      data-slot="activity-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}
