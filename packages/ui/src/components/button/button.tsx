"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type { ComponentPropsWithRef, MouseEvent } from "react";

import { Spinner } from "@/components/spinner";
import { disabledStyles, focusRing, iconSlot } from "@/lib/styles";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  cn(
    "inline-flex shrink-0 items-center justify-center font-medium whitespace-nowrap select-none",
    "transition-[background-color,border-color,color,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-out-quint)]",
    focusRing,
    disabledStyles,
    iconSlot,
  ),
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active",
        secondary: "bg-secondary text-secondary-foreground hover:bg-accent active:bg-border",
        outline:
          "border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground active:bg-secondary",
        ghost:
          "text-foreground hover:bg-accent hover:text-accent-foreground active:bg-secondary",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 active:bg-destructive/80",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 gap-1.5 rounded-md px-3 text-sm",
        md: "h-9 gap-2 rounded-md px-4 text-sm",
        lg: "h-10 gap-2 rounded-lg px-5 text-base",
        icon: "size-9 rounded-md",
        "icon-sm": "size-8 rounded-md",
      },
    },
    compoundVariants: [
      // A link has no box, so box padding and height would only misalign it.
      { variant: "link", size: "sm", className: "h-auto px-0" },
      { variant: "link", size: "md", className: "h-auto px-0" },
      { variant: "link", size: "lg", className: "h-auto px-0" },
    ],
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends ComponentPropsWithRef<"button">, VariantProps<typeof buttonVariants> {
  /**
   * Renders the child element as the button instead of a `<button>`, keeping
   * every style and behaviour. Use it for links that should look like buttons.
   */
  asChild?: boolean;
  /**
   * Shows a spinner and suppresses activation.
   *
   * Unlike `disabled`, a loading button stays focusable: taking focus away from
   * the control a user just activated strands their keyboard position, and the
   * state is transient by definition. Activation is blocked via `aria-disabled`
   * plus a guarded click handler.
   */
  loading?: boolean;
}

/** Triggers an action or event. */
export function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  disabled,
  onClick,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    if (loading) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    onClick?.(event);
  }

  return (
    <Comp
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled}
      aria-disabled={loading || undefined}
      aria-busy={loading || undefined}
      data-loading={loading || undefined}
      onClick={handleClick}
      {...props}
    >
      {loading ? <Spinner size={size === "lg" ? "lg" : "sm"} /> : null}
      {/* Slottable marks which child Slot should merge into when asChild is set.
          Without it, adding the spinner would give Slot two children and break
          every `asChild` button the moment it started loading. */}
      <Slot.Slottable>{children}</Slot.Slottable>
    </Comp>
  );
}

export { buttonVariants };
