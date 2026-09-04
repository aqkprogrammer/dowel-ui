import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentPropsWithRef } from "react";

import { focusRingInset, invalidStyles } from "@/lib/styles";
import { cn } from "@/lib/utils";

const inputVariants = cva(
  cn(
    "flex w-full min-w-0 rounded-md border border-input bg-background text-foreground shadow-xs",
    "transition-[border-color,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-out-quint)]",
    "placeholder:text-muted-foreground",
    "file:me-3 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
    "focus-visible:border-ring",
    "disabled:cursor-not-allowed disabled:opacity-55",
    focusRingInset,
    invalidStyles,
  ),
  {
    variants: {
      inputSize: {
        sm: "h-8 px-2.5 text-sm",
        md: "h-9 px-3 text-sm",
        lg: "h-10 px-3.5 text-base",
      },
    },
    defaultVariants: {
      inputSize: "md",
    },
  },
);

export interface InputProps
  extends ComponentPropsWithRef<"input">, VariantProps<typeof inputVariants> {}

/**
 * Single-line text field.
 *
 * The visual size prop is named `inputSize` rather than `size` because `size`
 * is a native `<input>` attribute with unrelated semantics (a character-count
 * width hint). Naming it apart keeps both available instead of shadowing one.
 *
 * Error styling is driven by the native `aria-invalid` attribute rather than a
 * bespoke prop, so form libraries wire it up without an adapter.
 */
export function Input({ className, inputSize, type = "text", ...props }: InputProps) {
  return (
    <input type={type} className={cn(inputVariants({ inputSize }), className)} {...props} />
  );
}

export { inputVariants };
