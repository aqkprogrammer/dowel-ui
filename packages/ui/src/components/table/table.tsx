import type { ComponentPropsWithRef } from "react";

import { cn } from "@/lib/utils";

/**
 * Semantic table primitives.
 *
 * A real `<table>`, not a grid of divs: screen readers announce row and column
 * position, header association and table dimensions from the native elements,
 * and none of that can be recovered with ARIA after the fact.
 *
 * The wrapper scrolls horizontally and is focusable, because a table that
 * overflows its container is otherwise unreachable by keyboard.
 */
/**
 * Arbitrary `data-*` attributes.
 *
 * TypeScript accepts `data-*` written directly on JSX, but not inside an object
 * literal typed as HTML attributes — so without this, `containerProps` could not
 * carry a test id or a styling hook.
 */
type DataAttributes = Record<`data-${string}`, string | number | boolean | undefined>;

export interface TableProps extends ComponentPropsWithRef<"table"> {
  /** Props for the scrolling wrapper around the table. */
  containerProps?: ComponentPropsWithRef<"div"> & DataAttributes;
}

export function Table({ className, containerProps, ...props }: TableProps) {
  const { className: containerClassName, ...restContainer } = containerProps ?? {};

  return (
    <div
      data-slot="table-container"
      // tabIndex 0 with a role and label makes an overflowing table scrollable
      // by keyboard. Without it, the columns past the edge are unreachable.
      tabIndex={0}
      role="region"
      aria-label={props["aria-label"] ?? "Table"}
      className={cn("relative w-full overflow-x-auto", containerClassName)}
      {...restContainer}
    >
      <table
        data-slot="table"
        className={cn("w-full caption-bottom border-collapse text-sm", className)}
        {...props}
      />
    </div>
  );
}

export function TableHeader({ className, ...props }: ComponentPropsWithRef<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("[&_tr]:border-b [&_tr]:border-border", className)}
      {...props}
    />
  );
}

export function TableBody({ className, ...props }: ComponentPropsWithRef<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  );
}

export function TableFooter({ className, ...props }: ComponentPropsWithRef<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn("border-t border-border bg-muted/40 font-medium", className)}
      {...props}
    />
  );
}

export function TableRow({ className, ...props }: ComponentPropsWithRef<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b border-border transition-colors duration-[var(--duration-instant)]",
        "hover:bg-muted/50 data-[state=selected]:bg-accent",
        className,
      )}
      {...props}
    />
  );
}

export function TableHead({ className, ...props }: ComponentPropsWithRef<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "h-10 px-3 text-left align-middle text-xs font-medium whitespace-nowrap text-muted-foreground",
        "[&:has([role=checkbox])]:w-px [&:has([role=checkbox])]:pr-0",
        className,
      )}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: ComponentPropsWithRef<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "px-3 py-2.5 align-middle",
        "[&:has([role=checkbox])]:w-px [&:has([role=checkbox])]:pr-0",
        className,
      )}
      {...props}
    />
  );
}

/**
 * A caption describing the table.
 *
 * Rendered below the table but announced as its accessible name, which is why
 * it belongs here rather than as a heading above.
 */
export function TableCaption({ className, ...props }: ComponentPropsWithRef<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}
