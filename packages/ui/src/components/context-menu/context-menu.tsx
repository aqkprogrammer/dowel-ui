"use client";

// Ported from SmoothUI Context Menu (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import { ContextMenu as ContextMenuPrimitive } from "radix-ui";
import type { ComponentPropsWithRef } from "react";

import { mirrorForDirection } from "@/lib/styles";
import { cn } from "@/lib/utils";

/**
 * A menu of actions opened at the pointer by a secondary click or a long press.
 *
 * The parts and their props mirror DropdownMenu exactly, so a menu can move
 * between the two by renaming its imports. It is never the only way to reach
 * an action: a context menu is invisible until summoned, so what it offers
 * should also live somewhere visible. Keyboard users open it with Shift+F10
 * or the Menu key, which needs the trigger to be focusable.
 *
 * The source's spring is CSS: the surface pops from the pointer with a slight
 * overshoot, and its items drop in with a 20ms stagger. Both are decoration
 * and stop under reduced motion; closing uses the shared quick float-out.
 */
export const ContextMenu = ContextMenuPrimitive.Root;
export const ContextMenuTrigger = ContextMenuPrimitive.Trigger;
export const ContextMenuGroup = ContextMenuPrimitive.Group;
export const ContextMenuPortal = ContextMenuPrimitive.Portal;
export const ContextMenuSub = ContextMenuPrimitive.Sub;
export const ContextMenuRadioGroup = ContextMenuPrimitive.RadioGroup;

const PREFIX = "dowel-context-menu";

/** Stagger delays for the first dozen entries; later ones arrive with the twelfth. */
const STAGGER = Array.from(
  { length: 11 },
  (_, i) =>
    `[data-slot$=context-menu-content]>:nth-child(${String(i + 2)}){animation-delay:calc(${String((i + 1) * 20)}ms * var(--motion-scale))}`,
).join("\n");

const STYLES = `
@keyframes ${PREFIX}-in{from{opacity:0;transform:translateY(-4px) scale(.95)}}
@keyframes ${PREFIX}-item-in{from{opacity:0;transform:translateY(-4px)}}
${STAGGER}
[data-slot$=context-menu-content]>:nth-child(n+13){animation-delay:calc(240ms * var(--motion-scale))}
`;

/** Shared surface styling for the root menu and every submenu. The keyframe
 * names are spelled out because Tailwind reads class names from the source. */
const menuSurface = cn(
  "z-[var(--z-popover)] min-w-[8rem] overflow-x-hidden overflow-y-auto rounded-lg border border-border",
  "bg-popover p-1 text-popover-foreground shadow-lg outline-none",
  "max-h-[var(--radix-context-menu-content-available-height)]",
  "origin-[var(--radix-context-menu-content-transform-origin)]",
  "data-[state=closed]:animate-float-out",
  "data-[state=open]:animate-[dowel-context-menu-in_calc(250ms*var(--motion-scale))_var(--ease-overshoot)]",
  "data-[state=open]:[&>*]:animate-[dowel-context-menu-item-in_calc(250ms*var(--motion-scale))_var(--ease-overshoot)_both]",
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

function Styles() {
  return (
    <style href={PREFIX} precedence="dowel">
      {STYLES}
    </style>
  );
}

export type ContextMenuContentProps = ComponentPropsWithRef<
  typeof ContextMenuPrimitive.Content
>;

export function ContextMenuContent({ className, ...props }: ContextMenuContentProps) {
  return (
    <>
      <Styles />
      <ContextMenuPrimitive.Portal>
        <ContextMenuPrimitive.Content
          data-slot="context-menu-content"
          className={cn(menuSurface, className)}
          {...props}
        />
      </ContextMenuPrimitive.Portal>
    </>
  );
}

export interface ContextMenuItemProps extends ComponentPropsWithRef<
  typeof ContextMenuPrimitive.Item
> {
  /** Styles the item as destructive. Pair with a label that says what is destroyed. */
  variant?: "default" | "destructive";
  /** Indents the item to align with items that have a leading indicator. */
  inset?: boolean;
}

export function ContextMenuItem({
  className,
  variant = "default",
  inset,
  ...props
}: ContextMenuItemProps) {
  return (
    <ContextMenuPrimitive.Item
      data-slot="context-menu-item"
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
      <ContextMenuPrimitive.ItemIndicator>
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
      </ContextMenuPrimitive.ItemIndicator>
    </span>
  );
}

export function ContextMenuCheckboxItem({
  className,
  children,
  ...props
}: ComponentPropsWithRef<typeof ContextMenuPrimitive.CheckboxItem>) {
  return (
    <ContextMenuPrimitive.CheckboxItem
      data-slot="context-menu-checkbox-item"
      className={cn(menuItem, "ps-8", className)}
      {...props}
    >
      <ItemIndicator />
      {children}
    </ContextMenuPrimitive.CheckboxItem>
  );
}

export function ContextMenuRadioItem({
  className,
  children,
  ...props
}: ComponentPropsWithRef<typeof ContextMenuPrimitive.RadioItem>) {
  return (
    <ContextMenuPrimitive.RadioItem
      data-slot="context-menu-radio-item"
      className={cn(menuItem, "ps-8", className)}
      {...props}
    >
      <ItemIndicator radio />
      {children}
    </ContextMenuPrimitive.RadioItem>
  );
}

export interface ContextMenuLabelProps extends ComponentPropsWithRef<
  typeof ContextMenuPrimitive.Label
> {
  inset?: boolean;
}

export function ContextMenuLabel({ className, inset, ...props }: ContextMenuLabelProps) {
  return (
    <ContextMenuPrimitive.Label
      data-slot="context-menu-label"
      className={cn(
        "px-2 py-1.5 text-xs font-medium text-muted-foreground",
        inset && "ps-8",
        className,
      )}
      {...props}
    />
  );
}

export function ContextMenuSeparator({
  className,
  ...props
}: ComponentPropsWithRef<typeof ContextMenuPrimitive.Separator>) {
  return (
    <ContextMenuPrimitive.Separator
      data-slot="context-menu-separator"
      className={cn("-mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  );
}

/** Keyboard hint. aria-hidden because the shortcut is decoration here — bind it
 * for real at the application level. */
export function ContextMenuShortcut({ className, ...props }: ComponentPropsWithRef<"span">) {
  return (
    <span
      data-slot="context-menu-shortcut"
      aria-hidden="true"
      className={cn("ms-auto text-2xs tracking-wide text-muted-foreground", className)}
      {...props}
    />
  );
}

export interface ContextMenuSubTriggerProps extends ComponentPropsWithRef<
  typeof ContextMenuPrimitive.SubTrigger
> {
  inset?: boolean;
}

export function ContextMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: ContextMenuSubTriggerProps) {
  return (
    <ContextMenuPrimitive.SubTrigger
      data-slot="context-menu-sub-trigger"
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
    </ContextMenuPrimitive.SubTrigger>
  );
}

export function ContextMenuSubContent({
  className,
  ...props
}: ComponentPropsWithRef<typeof ContextMenuPrimitive.SubContent>) {
  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.SubContent
        data-slot="context-menu-sub-content"
        className={cn(menuSurface, className)}
        {...props}
      />
    </ContextMenuPrimitive.Portal>
  );
}
