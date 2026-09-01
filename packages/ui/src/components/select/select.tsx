"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { Select as SelectPrimitive } from "radix-ui";
import type { ComponentPropsWithRef, ReactNode } from "react";

import { focusRing, invalidStyles } from "@/lib/styles";
import { cn } from "@/lib/utils";

/**
 * Picks one value from a list.
 *
 * For a short, known list. Past roughly a dozen options people want to type
 * rather than scroll — reach for Combobox there. Unlike a native `<select>`,
 * the options are real elements, so they can carry icons and descriptions.
 */
export const Select = SelectPrimitive.Root;
export const SelectGroup = SelectPrimitive.Group;
export const SelectValue = SelectPrimitive.Value;

const selectTriggerVariants = cva(
  cn(
    "flex w-full items-center justify-between gap-2 rounded-md border border-input bg-background",
    "whitespace-nowrap text-foreground shadow-xs",
    "transition-[border-color,box-shadow] duration-[var(--duration-fast)]",
    "data-[placeholder]:text-muted-foreground",
    "focus-visible:border-ring",
    "disabled:cursor-not-allowed disabled:opacity-55",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
    "*:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2",
    focusRing,
    invalidStyles,
  ),
  {
    variants: {
      triggerSize: {
        sm: "h-8 px-2.5 text-sm",
        md: "h-9 px-3 text-sm",
        lg: "h-10 px-3.5 text-base",
      },
    },
    defaultVariants: {
      triggerSize: "md",
    },
  },
);

export interface SelectTriggerProps
  extends
    ComponentPropsWithRef<typeof SelectPrimitive.Trigger>,
    VariantProps<typeof selectTriggerVariants> {}

export function SelectTrigger({
  className,
  triggerSize,
  children,
  ...props
}: SelectTriggerProps) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      className={cn(selectTriggerVariants({ triggerSize }), className)}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-4 opacity-60">
          <path
            d="m7 10 5 5 5-5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

/** Scroll affordance shown only when the list overflows. Decorative. */
function ScrollButton({
  direction,
  className,
  ...props
}: {
  direction: "up" | "down";
} & ComponentPropsWithRef<typeof SelectPrimitive.ScrollUpButton>) {
  const Comp =
    direction === "up" ? SelectPrimitive.ScrollUpButton : SelectPrimitive.ScrollDownButton;

  return (
    <Comp
      data-slot={`select-scroll-${direction}`}
      className={cn("flex cursor-default items-center justify-center py-1", className)}
      {...props}
    >
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-4 opacity-60">
        <path
          d={direction === "up" ? "m7 14 5-5 5 5" : "m7 10 5 5 5-5"}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </Comp>
  );
}

export type SelectContentProps = ComponentPropsWithRef<typeof SelectPrimitive.Content>;

export function SelectContent({
  className,
  children,
  position = "popper",
  sideOffset = 6,
  ...props
}: SelectContentProps) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        position={position}
        sideOffset={position === "popper" ? sideOffset : undefined}
        className={cn(
          "relative z-[var(--z-popover)] max-h-[var(--radix-select-content-available-height)]",
          "min-w-32 overflow-x-hidden overflow-y-auto rounded-lg border border-border bg-popover",
          "p-1 text-popover-foreground shadow-lg",
          "origin-[var(--radix-select-content-transform-origin)]",
          "data-[state=closed]:animate-float-out data-[state=open]:animate-float-in",
          position === "popper" && "w-full min-w-[var(--radix-select-trigger-width)]",
          className,
        )}
        {...props}
      >
        <ScrollButton direction="up" />
        <SelectPrimitive.Viewport className="p-0">{children}</SelectPrimitive.Viewport>
        <ScrollButton direction="down" />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

export interface SelectItemProps extends ComponentPropsWithRef<typeof SelectPrimitive.Item> {
  /**
   * What the trigger shows once this option is chosen.
   *
   * The primitive clones the item's text into the trigger, so a rich option —
   * a name with a description under it — would otherwise drag all of that into
   * a one-line trigger. Give the label here and the rest as children.
   */
  label?: ReactNode;
}

export function SelectItem({ className, label, children, ...props }: SelectItemProps) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "relative flex w-full cursor-default items-center gap-2 rounded-md py-1.5 pr-8 pl-2 text-sm outline-none select-none",
        "transition-colors duration-[var(--duration-instant)]",
        "data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-55",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      {label === undefined ? (
        <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      ) : (
        <>
          <SelectPrimitive.ItemText>{label}</SelectPrimitive.ItemText>
          {children}
        </>
      )}
      {/* Decorative: selection is already announced through aria-selected. */}
      <span className="absolute right-2 grid size-4 place-items-center">
        <SelectPrimitive.ItemIndicator>
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-3.5">
            <path
              d="m5 13 4 4L19 7"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </SelectPrimitive.ItemIndicator>
      </span>
    </SelectPrimitive.Item>
  );
}

export function SelectLabel({
  className,
  ...props
}: ComponentPropsWithRef<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      data-slot="select-label"
      className={cn("px-2 py-1.5 text-xs font-medium text-muted-foreground", className)}
      {...props}
    />
  );
}

export function SelectSeparator({
  className,
  ...props
}: ComponentPropsWithRef<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn("-mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  );
}

export { selectTriggerVariants };
