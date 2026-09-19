"use client";

// Ported from SmoothUI AI Loader (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import { cva, type VariantProps } from "class-variance-authority";
import { useEffect, useState, type ComponentPropsWithRef } from "react";

import { BarLoader } from "@/components/bar-loader";
import { DotsLoader } from "@/components/dots-loader";
import { GridLoader } from "@/components/grid-loader";
import { cn } from "@/lib/utils";

/*
 * The AI waiting indicator: a label, one of three loaders, and an optional
 * elapsed counter. The motion is not reimplemented here — it is Dowel's own
 * loader families, whose "thinking" dots, indeterminate bar and "thinking"
 * grid already share SmoothUI's 1.2s cycle, so a page can mix them and stay in
 * step. They carry data-motion="indicator" themselves: under reduced motion
 * they slow rather than freeze.
 *
 * The root is the one status region. The loader inside it stays aria-hidden,
 * and the elapsed counter is hidden from assistive technology too: a live
 * region whose text changes ten times a second would announce continuously.
 */

export type AILoaderVariant = "dots" | "bar" | "grid";

const aiLoaderVariants = cva("inline-flex items-center gap-2 text-muted-foreground", {
  variants: {
    size: {
      sm: "text-xs",
      md: "text-sm",
      lg: "text-base",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

const LOADER_SIZE = { sm: "sm", md: "md", lg: "lg" } as const;

/** Seconds since mount, to one decimal, re-rendering only when that changes. */
function useElapsed(enabled: boolean): number {
  const [tenths, setTenths] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const start = performance.now();
    const id = setInterval(() => {
      setTenths(Math.floor((performance.now() - start) / 100));
    }, 100);
    return () => clearInterval(id);
  }, [enabled]);
  return tenths / 10;
}

export interface AILoaderProps
  extends
    Omit<ComponentPropsWithRef<"span">, "children">,
    VariantProps<typeof aiLoaderVariants> {
  /** Which loader: thinking dots, an indeterminate bar, or a thinking grid. */
  variant?: AILoaderVariant;
  /** Visible text before the indicator, e.g. "Thinking". Also what is announced. */
  label?: string;
  /** Announced when there is no visible label. */
  srLabel?: string;
  /** Appends a live elapsed-seconds counter. Long waits need a sign of progress. */
  showElapsed?: boolean;
}

/** A labelled AI waiting indicator, optionally counting the seconds. */
export function AILoader({
  className,
  variant = "dots",
  size,
  label,
  srLabel = "Loading",
  showElapsed = false,
  ...props
}: AILoaderProps) {
  const elapsed = useElapsed(showElapsed);
  const loaderSize = LOADER_SIZE[size ?? "md"];

  return (
    <span
      role="status"
      data-slot="ai-loader"
      data-variant={variant}
      className={cn(aiLoaderVariants({ size }), className)}
      {...props}
    >
      {label ? (
        <span data-slot="ai-loader-label">{label}</span>
      ) : (
        <span className="sr-only">{srLabel}</span>
      )}
      {variant === "dots" ? <DotsLoader variant="thinking" size={loaderSize} /> : null}
      {variant === "bar" ? <BarLoader variant="indeterminate" size={loaderSize} /> : null}
      {variant === "grid" ? <GridLoader variant="thinking" size={loaderSize} /> : null}
      {showElapsed ? (
        <span
          data-slot="ai-loader-elapsed"
          aria-hidden="true"
          className="tabular-nums opacity-60"
        >
          {elapsed.toFixed(1)}s
        </span>
      ) : null}
    </span>
  );
}

export { aiLoaderVariants };
