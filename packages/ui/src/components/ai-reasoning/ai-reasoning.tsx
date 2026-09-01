"use client";

import { Collapsible as CollapsiblePrimitive } from "radix-ui";
import type { ComponentPropsWithRef } from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/**
 * The model's reasoning, tucked away.
 *
 * Collapsed by default and deliberately understated. Reasoning is supporting
 * material — surfacing it at the same weight as the answer buries the answer,
 * and most readers never want it. It stays one keystroke away for the people
 * who do.
 */
export type ReasoningProps = ComponentPropsWithRef<typeof CollapsiblePrimitive.Root>;

export function Reasoning({ className, ...props }: ReasoningProps) {
  return (
    <CollapsiblePrimitive.Root
      data-slot="reasoning"
      className={cn("text-sm", className)}
      {...props}
    />
  );
}

export interface ReasoningTriggerProps extends ComponentPropsWithRef<
  typeof CollapsiblePrimitive.Trigger
> {
  /** Shown while reasoning is still arriving. */
  streaming?: boolean;
  label?: string;
  streamingLabel?: string;
}

export function ReasoningTrigger({
  className,
  streaming,
  label = "Reasoning",
  streamingLabel = "Thinking…",
  children,
  ...props
}: ReasoningTriggerProps) {
  return (
    <CollapsiblePrimitive.Trigger
      data-slot="reasoning-trigger"
      className={cn(
        "flex items-center gap-1.5 rounded-md text-xs text-muted-foreground",
        "transition-colors duration-[var(--duration-fast)] hover:text-foreground",
        "[&[data-state=open]>svg:last-child]:rotate-180",
        focusRing,
        className,
      )}
      {...props}
    >
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-3.5 shrink-0">
        <path
          d="M9.5 21h5M12 3a6 6 0 0 1 3.6 10.8c-.6.5-.9 1.1-1 1.7l-.1.5h-5l-.1-.5c-.1-.6-.4-1.2-1-1.7A6 6 0 0 1 12 3Z"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {children ?? (streaming ? streamingLabel : label)}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="size-3.5 shrink-0 transition-transform duration-[var(--duration-normal)]"
      >
        <path
          d="m6 9 6 6 6-6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </CollapsiblePrimitive.Trigger>
  );
}

export function ReasoningContent({
  className,
  children,
  ...props
}: ComponentPropsWithRef<typeof CollapsiblePrimitive.Content>) {
  return (
    <CollapsiblePrimitive.Content
      data-slot="reasoning-content"
      className={cn(
        "overflow-hidden",
        "data-[state=closed]:animate-accordion-close data-[state=open]:animate-accordion-open",
        className,
      )}
      {...props}
    >
      <div className="mt-2 border-l-2 border-border pl-3 text-sm whitespace-pre-wrap text-muted-foreground">
        {children}
      </div>
    </CollapsiblePrimitive.Content>
  );
}
