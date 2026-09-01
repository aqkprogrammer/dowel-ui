import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type { ComponentPropsWithRef } from "react";

import { focusRing, iconSlot } from "@/lib/styles";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  cn(
    "inline-flex w-fit shrink-0 items-center justify-center gap-1 rounded-full border font-medium whitespace-nowrap",
    "[&_svg:not([class*='size-'])]:size-3",
    focusRing,
    iconSlot,
  ),
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        outline: "border-border-strong bg-transparent text-foreground",
        destructive: "border-transparent bg-destructive text-destructive-foreground",
        success: "border-transparent bg-success text-success-foreground",
        warning: "border-transparent bg-warning text-warning-foreground",
        info: "border-transparent bg-info text-info-foreground",
      },
      size: {
        sm: "h-5 px-1.5 text-2xs",
        md: "h-6 px-2 text-xs",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  },
);

export interface BadgeProps
  extends ComponentPropsWithRef<"span">, VariantProps<typeof badgeVariants> {
  asChild?: boolean;
}

/**
 * Compact status or category marker.
 *
 * Colour alone never carries the meaning: the label text must say what the
 * badge means, so the monochrome theme and colour-blind users lose nothing.
 */
export function Badge({ className, variant, size, asChild = false, ...props }: BadgeProps) {
  const Comp = asChild ? Slot.Root : "span";
  return <Comp className={cn(badgeVariants({ variant, size }), className)} {...props} />;
}

export { badgeVariants };
