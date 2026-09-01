"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { Tabs as TabsPrimitive } from "radix-ui";
import type { ComponentPropsWithRef } from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/**
 * Switches between panels of related content.
 *
 * Tabs are for alternate views of the same subject, not for steps in a process
 * — a user can leave a tab and come back with nothing lost. Activation is
 * automatic on arrow keys by default; pass `activationMode="manual"` when
 * revealing a panel is expensive.
 */
export const Tabs = TabsPrimitive.Root;

const tabsListVariants = cva("inline-flex items-center", {
  variants: {
    variant: {
      /** Pill track. Reads as a segmented control. */
      solid: "gap-1 rounded-lg bg-muted p-1",
      /** Underlined. Reads as page-level navigation between views. */
      underline: "gap-4 border-b border-border",
    },
  },
  defaultVariants: {
    variant: "solid",
  },
});

const tabsTriggerVariants = cva(
  cn(
    "inline-flex items-center justify-center gap-2 text-sm font-medium whitespace-nowrap",
    "transition-colors duration-[var(--duration-fast)]",
    "disabled:pointer-events-none disabled:opacity-55",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    focusRing,
  ),
  {
    variants: {
      variant: {
        solid: cn(
          "h-7 rounded-md px-3 text-muted-foreground",
          "hover:text-foreground",
          "data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs",
        ),
        underline: cn(
          "-mb-px h-9 border-b-2 border-transparent px-0.5 text-muted-foreground",
          "hover:text-foreground",
          "data-[state=active]:border-primary data-[state=active]:text-foreground",
        ),
      },
    },
    defaultVariants: {
      variant: "solid",
    },
  },
);

export interface TabsListProps
  extends
    ComponentPropsWithRef<typeof TabsPrimitive.List>,
    VariantProps<typeof tabsListVariants> {}

export function TabsList({ className, variant, ...props }: TabsListProps) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant ?? "solid"}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  );
}

export interface TabsTriggerProps
  extends
    ComponentPropsWithRef<typeof TabsPrimitive.Trigger>,
    VariantProps<typeof tabsTriggerVariants> {}

export function TabsTrigger({ className, variant, ...props }: TabsTriggerProps) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(tabsTriggerVariants({ variant }), className)}
      {...props}
    />
  );
}

export type TabsContentProps = ComponentPropsWithRef<typeof TabsPrimitive.Content>;

export function TabsContent({ className, ...props }: TabsContentProps) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("mt-4 outline-none", focusRing, className)}
      {...props}
    />
  );
}

export { tabsListVariants, tabsTriggerVariants };
