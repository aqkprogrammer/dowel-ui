"use client";

import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";
import type { ComponentPropsWithRef } from "react";

import { mirrorForDirection } from "@/lib/styles";
import { cn } from "@/lib/utils";

/**
 * A menu of actions revealed from a trigger.
 *
 * Actions, not navigation and not form state: a menu item does something. For a
 * list of links use a nav, and for a value the user picks from use Select
 * (Phase 3) — the roles differ and assistive technology treats them differently.
 */
export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
export const DropdownMenuGroup = DropdownMenuPrimitive.Group;
export const DropdownMenuPortal = DropdownMenuPrimitive.Portal;
export const DropdownMenuSub = DropdownMenuPrimitive.Sub;
export const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

/** Shared surface styling for the root menu and every submenu. */
const menuSurface = cn(
  "z-[var(--z-popover)] min-w-[8rem] overflow-x-hidden overflow-y-auto rounded-lg border border-border",
  "bg-popover p-1 text-popover-foreground shadow-lg outline-none",
  "max-h-[var(--radix-dropdown-menu-content-available-height)]",
  "origin-[var(--radix-dropdown-menu-content-transform-origin)]",
  "data-[state=closed]:animate-float-out data-[state=open]:animate-float-in",
);

/** Shared item styling. Highlight follows data-highlighted, which the primitive
 * drives from both pointer and keyboard, so the two never disagree. */
const menuItem = cn(
  "relative flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none select-none",
  "transition-colors duration-[var(--duration-instant)]",
  "data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground",
  "data-[disabled]:pointer-events-none data-[disabled]:opacity-55",
  "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
);

export type DropdownMenuContentProps = ComponentPropsWithRef<
  typeof DropdownMenuPrimitive.Content
>;

export function DropdownMenuContent({
  className,
  sideOffset = 6,
  ...props
}: DropdownMenuContentProps) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        data-slot="dropdown-menu-content"
        sideOffset={sideOffset}
        className={cn(menuSurface, className)}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

export interface DropdownMenuItemProps extends ComponentPropsWithRef<
  typeof DropdownMenuPrimitive.Item
> {
  /** Styles the item as destructive. Pair with a label that says what is destroyed. */
  variant?: "default" | "destructive";
  /** Indents the item to align with items that have a leading indicator. */
  inset?: boolean;
}

export function DropdownMenuItem({
  className,
  variant = "default",
  inset,
  ...props
}: DropdownMenuItemProps) {
  return (
    <DropdownMenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-variant={variant}
      className={cn(
        menuItem,
        inset && "ps-8",
        variant === "destructive" &&
          "text-destructive data-[highlighted]:bg-destructive/10 data-[highlighted]:text-destructive",
        className,
      )}
      {...props}
    />
  );
}

/** Tick shown by checkbox and radio items. Decorative: the state is already in
 * aria-checked, so announcing it twice would be noise. */
function ItemIndicator({ radio = false }: { radio?: boolean }) {
  return (
    <span className="pointer-events-none absolute start-2 grid size-4 place-items-center">
      <DropdownMenuPrimitive.ItemIndicator>
        {radio ? (
          <span className="size-2 rounded-full bg-current" />
        ) : (
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-3.5">
            <path
              d="m5 13 4 4L19 7"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
  );
}

export function DropdownMenuCheckboxItem({
  className,
  children,
  ...props
}: ComponentPropsWithRef<typeof DropdownMenuPrimitive.CheckboxItem>) {
  return (
    <DropdownMenuPrimitive.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
      className={cn(menuItem, "ps-8", className)}
      {...props}
    >
      <ItemIndicator />
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  );
}

export function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: ComponentPropsWithRef<typeof DropdownMenuPrimitive.RadioItem>) {
  return (
    <DropdownMenuPrimitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      className={cn(menuItem, "ps-8", className)}
      {...props}
    >
      <ItemIndicator radio />
      {children}
    </DropdownMenuPrimitive.RadioItem>
  );
}

export interface DropdownMenuLabelProps extends ComponentPropsWithRef<
  typeof DropdownMenuPrimitive.Label
> {
  inset?: boolean;
}

export function DropdownMenuLabel({ className, inset, ...props }: DropdownMenuLabelProps) {
  return (
    <DropdownMenuPrimitive.Label
      data-slot="dropdown-menu-label"
      className={cn(
        "px-2 py-1.5 text-xs font-medium text-muted-foreground",
        inset && "ps-8",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuSeparator({
  className,
  ...props
}: ComponentPropsWithRef<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn("-mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  );
}

/** Keyboard hint. aria-hidden because the shortcut is decoration here — bind it
 * for real at the application level. */
export function DropdownMenuShortcut({ className, ...props }: ComponentPropsWithRef<"span">) {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      aria-hidden="true"
      className={cn("ms-auto text-2xs tracking-wide text-muted-foreground", className)}
      {...props}
    />
  );
}

export interface DropdownMenuSubTriggerProps extends ComponentPropsWithRef<
  typeof DropdownMenuPrimitive.SubTrigger
> {
  inset?: boolean;
}

export function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: DropdownMenuSubTriggerProps) {
  return (
    <DropdownMenuPrimitive.SubTrigger
      data-slot="dropdown-menu-sub-trigger"
      className={cn(menuItem, "data-[state=open]:bg-accent", inset && "ps-8", className)}
      {...props}
    >
      {children}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className={cn("ms-auto size-3.5", mirrorForDirection)}
      >
        <path
          d="m9 18 6-6-6-6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </DropdownMenuPrimitive.SubTrigger>
  );
}

export function DropdownMenuSubContent({
  className,
  ...props
}: ComponentPropsWithRef<typeof DropdownMenuPrimitive.SubContent>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.SubContent
        data-slot="dropdown-menu-sub-content"
        className={cn(menuSurface, className)}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}
