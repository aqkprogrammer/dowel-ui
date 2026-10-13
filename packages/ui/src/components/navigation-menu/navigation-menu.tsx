"use client";

// Original design, on the Radix NavigationMenu primitive.
import { cva } from "class-variance-authority";
import { NavigationMenu as NavigationMenuPrimitive } from "radix-ui";
import type { ComponentPropsWithRef } from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * Site navigation with menus that open from the top bar — a short list of
 * links under "Product", or a full mega menu of columns, a featured card and
 * a footer.
 *
 * Radix does the hard parts: hover intent, keyboard (arrows along the bar,
 * Tab into an open panel, Escape to close), focus that returns to the
 * trigger, and one shared viewport that resizes between panels. This file is
 * the styling and the parts. Panels grow from their trigger with the theme's
 * float animations, which reduced motion collapses.
 */

export type NavigationMenuProps = ComponentPropsWithRef<typeof NavigationMenuPrimitive.Root>;

/** The bar and its menus. Renders its own viewport, under the bar, for the open panel. */
export function NavigationMenu({ className, children, ...props }: NavigationMenuProps) {
  return (
    <NavigationMenuPrimitive.Root
      data-slot="navigation-menu"
      className={cn(
        "relative z-10 flex max-w-max flex-1 items-center justify-center",
        className,
      )}
      {...props}
    >
      {children}
      <NavigationMenuViewport />
    </NavigationMenuPrimitive.Root>
  );
}

export function NavigationMenuList({
  className,
  ...props
}: ComponentPropsWithRef<typeof NavigationMenuPrimitive.List>) {
  return (
    <NavigationMenuPrimitive.List
      data-slot="navigation-menu-list"
      className={cn("group flex flex-1 list-none items-center justify-center gap-1", className)}
      {...props}
    />
  );
}

export function NavigationMenuItem({
  className,
  ...props
}: ComponentPropsWithRef<typeof NavigationMenuPrimitive.Item>) {
  return (
    <NavigationMenuPrimitive.Item
      data-slot="navigation-menu-item"
      className={cn("relative", className)}
      {...props}
    />
  );
}

/** The look of a top-level trigger or link, exported so a plain link in the bar can match. */
export const navigationMenuTriggerStyle = cva([
  "group inline-flex h-9 items-center justify-center gap-1 rounded-md px-3 text-sm font-medium",
  "text-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
  "data-[active]:text-primary data-[state=open]:bg-accent/60",
  focusRing,
]);

export function NavigationMenuTrigger({
  className,
  children,
  ...props
}: ComponentPropsWithRef<typeof NavigationMenuPrimitive.Trigger>) {
  return (
    <NavigationMenuPrimitive.Trigger
      data-slot="navigation-menu-trigger"
      className={cn(navigationMenuTriggerStyle(), className)}
      {...props}
    >
      {children}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="size-3.5 transition-transform duration-(--duration-normal) group-data-[state=open]:rotate-180"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </NavigationMenuPrimitive.Trigger>
  );
}

/** A panel's content. Lay it out freely: a list of links, or a mega menu grid. */
export function NavigationMenuContent({
  className,
  ...props
}: ComponentPropsWithRef<typeof NavigationMenuPrimitive.Content>) {
  return (
    <NavigationMenuPrimitive.Content
      data-slot="navigation-menu-content"
      className={cn("start-0 top-0 w-full p-2 md:absolute md:w-auto", className)}
      {...props}
    />
  );
}

/** A link in the bar or in a panel. Marks itself active with `active`, which sets aria-current. */
export function NavigationMenuLink({
  className,
  ...props
}: ComponentPropsWithRef<typeof NavigationMenuPrimitive.Link>) {
  return (
    <NavigationMenuPrimitive.Link
      data-slot="navigation-menu-link"
      className={cn(
        "block rounded-md p-3 text-sm leading-snug text-foreground no-underline transition-colors outline-none select-none",
        "hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent data-[active]:bg-accent/50",
        focusRing,
        className,
      )}
      {...props}
    />
  );
}

/**
 * The open panel's container, under the bar. Rendered by NavigationMenu for
 * you; export it only to place it elsewhere.
 */
export function NavigationMenuViewport({
  className,
  ...props
}: ComponentPropsWithRef<typeof NavigationMenuPrimitive.Viewport>) {
  return (
    <div className="absolute start-0 top-full flex justify-center">
      <NavigationMenuPrimitive.Viewport
        data-slot="navigation-menu-viewport"
        className={cn(
          "relative mt-2 h-(--radix-navigation-menu-viewport-height) w-full overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-lg",
          "origin-top md:w-(--radix-navigation-menu-viewport-width)",
          "transition-[width,height] duration-(--duration-normal) ease-(--ease-out-quint)",
          "data-[state=closed]:animate-float-out data-[state=open]:animate-float-in",
          className,
        )}
        {...props}
      />
    </div>
  );
}

/** The small arrow under the open trigger. Optional. */
export function NavigationMenuIndicator({
  className,
  ...props
}: ComponentPropsWithRef<typeof NavigationMenuPrimitive.Indicator>) {
  return (
    <NavigationMenuPrimitive.Indicator
      data-slot="navigation-menu-indicator"
      className={cn(
        "top-full z-10 flex h-2 items-end justify-center overflow-hidden",
        "data-[state=hidden]:animate-overlay-out data-[state=visible]:animate-overlay-in",
        className,
      )}
      {...props}
    >
      <div className="relative top-[60%] size-2 rotate-45 rounded-ss-sm border-s border-t border-border bg-popover" />
    </NavigationMenuPrimitive.Indicator>
  );
}
