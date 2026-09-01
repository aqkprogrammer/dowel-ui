import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentPropsWithRef } from "react";

import { cn } from "@/lib/utils";

const emptyStateVariants = cva("flex flex-col items-center justify-center gap-3 text-center", {
  variants: {
    size: {
      sm: "px-4 py-8",
      md: "px-6 py-12",
      lg: "px-8 py-20",
    },
    bordered: {
      true: "rounded-xl border border-dashed border-border",
      false: "",
    },
  },
  defaultVariants: {
    size: "md",
    bordered: false,
  },
});

export interface EmptyStateProps
  extends ComponentPropsWithRef<"div">, VariantProps<typeof emptyStateVariants> {}

/**
 * Shown where content would be, when there is none.
 *
 * An empty state should say why it is empty and what to do next. "No results"
 * after a search and "nothing here yet" on a new account are different
 * messages, and the second one is where a call to action belongs.
 */
export function EmptyState({ className, size, bordered, ...props }: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn(emptyStateVariants({ size, bordered }), className)}
      {...props}
    />
  );
}

/** Decorative by default — the title carries the meaning. */
export function EmptyStateIcon({ className, ...props }: ComponentPropsWithRef<"div">) {
  return (
    <div
      data-slot="empty-state-icon"
      aria-hidden="true"
      className={cn(
        "grid size-11 place-items-center rounded-full bg-muted text-muted-foreground",
        "[&_svg:not([class*='size-'])]:size-5",
        className,
      )}
      {...props}
    />
  );
}

export function EmptyStateTitle({ className, children, ...props }: ComponentPropsWithRef<"p">) {
  return (
    <p
      data-slot="empty-state-title"
      className={cn("text-base font-medium text-foreground", className)}
      {...props}
    >
      {children}
    </p>
  );
}

export function EmptyStateDescription({ className, ...props }: ComponentPropsWithRef<"p">) {
  return (
    <p
      data-slot="empty-state-description"
      className={cn("max-w-sm text-sm text-balance text-muted-foreground", className)}
      {...props}
    />
  );
}

export function EmptyStateActions({ className, ...props }: ComponentPropsWithRef<"div">) {
  return (
    <div
      data-slot="empty-state-actions"
      className={cn("mt-1 flex flex-wrap items-center justify-center gap-2", className)}
      {...props}
    />
  );
}

export { emptyStateVariants };
