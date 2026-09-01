import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentPropsWithRef } from "react";

import { cn } from "@/lib/utils";

const alertVariants = cva(
  cn(
    "relative grid w-full grid-cols-[0_1fr] items-start gap-y-1 rounded-lg border px-4 py-3 text-sm",
    "has-[>svg]:grid-cols-[calc(var(--size-icon-md))_1fr] has-[>svg]:gap-x-3",
    "[&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current",
  ),
  {
    variants: {
      variant: {
        default: "border-border bg-card text-card-foreground",
        destructive:
          "border-destructive/30 bg-destructive/8 text-foreground [&>svg]:text-destructive",
        success: "border-success/30 bg-success/8 text-foreground [&>svg]:text-success",
        warning: "border-warning/35 bg-warning/10 text-foreground [&>svg]:text-warning",
        info: "border-info/30 bg-info/8 text-foreground [&>svg]:text-info",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

/**
 * How urgently the alert should interrupt a screen reader.
 *
 * - `off` (default): a static notice already present when the page rendered.
 * - `polite`: appeared in response to something the user did; announce at the
 *   next pause.
 * - `assertive`: an error that must interrupt whatever is being read.
 */
export type AlertLive = "off" | "polite" | "assertive";

export interface AlertProps
  extends ComponentPropsWithRef<"div">, VariantProps<typeof alertVariants> {
  live?: AlertLive;
}

/**
 * A callout that draws attention to a message.
 *
 * `live` defaults to `off` rather than always rendering role="alert". A live
 * region that exists on first paint announces itself for no reason and trains
 * users to ignore it; opt in when the alert actually appears in response to
 * something.
 */
export function Alert({ className, variant, live = "off", ...props }: AlertProps) {
  const role = live === "assertive" ? "alert" : live === "polite" ? "status" : undefined;

  return (
    <div
      data-slot="alert"
      role={role}
      aria-live={live === "off" ? undefined : live}
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

export function AlertTitle({ className, ...props }: ComponentPropsWithRef<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn("col-start-2 font-medium tracking-tight", className)}
      {...props}
    />
  );
}

export function AlertDescription({ className, ...props }: ComponentPropsWithRef<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "col-start-2 text-sm text-muted-foreground [&_p]:leading-relaxed",
        className,
      )}
      {...props}
    />
  );
}

export { alertVariants };
