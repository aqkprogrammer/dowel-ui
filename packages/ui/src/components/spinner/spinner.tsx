import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentPropsWithRef } from "react";

import { cn } from "@/lib/utils";

const spinnerVariants = cva("animate-spin text-current", {
  variants: {
    size: {
      xs: "size-3",
      sm: "size-3.5",
      md: "size-4",
      lg: "size-5",
      xl: "size-6",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

export interface SpinnerProps
  extends Omit<ComponentPropsWithRef<"svg">, "children">, VariantProps<typeof spinnerVariants> {
  /**
   * Announced to assistive technology while the spinner is visible.
   *
   * Omit it when the spinner sits inside a control that already communicates
   * its busy state (a loading Button, for example) — announcing twice is worse
   * than not announcing at all.
   */
  label?: string;
}

/** Indeterminate loading indicator. */
export function Spinner({ className, size, label, ...props }: SpinnerProps) {
  return (
    <>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className={cn(spinnerVariants({ size }), className)}
        {...props}
      >
        <circle
          cx="12"
          cy="12"
          r="9.5"
          stroke="currentColor"
          strokeWidth="2.5"
          opacity="0.22"
        />
        <path
          d="M12 2.5a9.5 9.5 0 0 1 9.5 9.5"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
      {label ? (
        <span role="status" className="sr-only">
          {label}
        </span>
      ) : null}
    </>
  );
}

export { spinnerVariants };
