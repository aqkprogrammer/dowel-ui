"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { Collapsible as CollapsiblePrimitive } from "radix-ui";
import type { ComponentPropsWithRef, ReactNode } from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/**
 * A tool the model called, and what came back.
 *
 * Collapsed by default: a tool call is provenance, not the answer. Someone
 * checking why a response says what it does needs to open it; everybody else
 * needs it to stay out of the way.
 *
 * The status is the whole point of the header, so it is text, never a coloured
 * dot alone.
 */

export type ToolStatus = "pending" | "running" | "success" | "error";

const STATUS_LABEL: Record<ToolStatus, string> = {
  pending: "Queued",
  running: "Running",
  success: "Completed",
  error: "Failed",
};

const toolVariants = cva("overflow-hidden rounded-lg border text-sm", {
  variants: {
    status: {
      pending: "border-border bg-muted/30",
      running: "border-info/30 bg-info/5",
      success: "border-border bg-muted/30",
      error: "border-destructive/30 bg-destructive/5",
    },
  },
  defaultVariants: {
    status: "pending",
  },
});

export interface ToolProps
  extends
    ComponentPropsWithRef<typeof CollapsiblePrimitive.Root>,
    VariantProps<typeof toolVariants> {
  status?: ToolStatus;
}

export function Tool({ className, status = "pending", ...props }: ToolProps) {
  return (
    <CollapsiblePrimitive.Root
      data-slot="tool"
      data-status={status}
      className={cn(toolVariants({ status }), className)}
      {...props}
    />
  );
}

export interface ToolHeaderProps extends ComponentPropsWithRef<
  typeof CollapsiblePrimitive.Trigger
> {
  /** The tool's name, as the model called it. */
  name: string;
  status?: ToolStatus;
  /** Overrides the status wording. */
  statusLabel?: string;
  icon?: ReactNode;
}

export function ToolHeader({
  className,
  name,
  status = "pending",
  statusLabel,
  icon,
  ...props
}: ToolHeaderProps) {
  return (
    <CollapsiblePrimitive.Trigger
      data-slot="tool-header"
      className={cn(
        "flex w-full items-center gap-2 px-3 py-2 text-left",
        "transition-colors duration-[var(--duration-fast)] hover:bg-accent/50",
        "[&[data-state=open]>svg:last-child]:rotate-180",
        focusRing,
        className,
      )}
      {...props}
    >
      {icon ?? <ToolIcon status={status} />}
      <span className="font-mono text-xs font-medium">{name}</span>
      {/* Status in words. A coloured dot alone says nothing to a screen reader
          and nothing to anyone who cannot distinguish the colours. */}
      <span
        data-slot="tool-status"
        className={cn(
          "ml-auto text-xs",
          status === "error" ? "text-destructive" : "text-muted-foreground",
        )}
      >
        {statusLabel ?? STATUS_LABEL[status]}
      </span>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="size-3.5 shrink-0 text-muted-foreground transition-transform duration-[var(--duration-normal)]"
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

function ToolIcon({ status }: { status: ToolStatus }) {
  if (status === "running") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="size-3.5 shrink-0 animate-spin text-info"
      >
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
        <path
          d="M12 3a9 9 0 0 1 9 9"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={cn(
        "size-3.5 shrink-0",
        status === "error" ? "text-destructive" : "text-muted-foreground",
      )}
    >
      <path
        d={
          status === "success"
            ? "m5 13 4 4L19 7"
            : status === "error"
              ? "M12 8v5m0 3h.01M10.3 4.3 2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z"
              : "M14.7 6.3a4 4 0 0 1-5 5L5 16v3h3l4.7-4.7a4 4 0 0 1 5-5l-2.3 2.3"
        }
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ToolContent({
  className,
  ...props
}: ComponentPropsWithRef<typeof CollapsiblePrimitive.Content>) {
  return (
    <CollapsiblePrimitive.Content
      data-slot="tool-content"
      className={cn(
        "overflow-hidden border-t border-border",
        "data-[state=closed]:animate-accordion-close data-[state=open]:animate-accordion-open",
        className,
      )}
      {...props}
    />
  );
}

export interface ToolSectionProps extends ComponentPropsWithRef<"div"> {
  label: string;
}

/** A labelled block inside the disclosure: the arguments, or the result. */
export function ToolSection({ className, label, children, ...props }: ToolSectionProps) {
  return (
    <div
      data-slot="tool-section"
      className={cn("border-b border-border/60 px-3 py-2 last:border-b-0", className)}
      {...props}
    >
      <p className="mb-1 text-2xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      {children}
    </div>
  );
}

/**
 * Serialised arguments or output.
 *
 * A `<pre>` with a tabindex, because JSON of any size scrolls and a scrollable
 * box that cannot be focused is unreachable by keyboard.
 */
export interface ToolPayloadProps extends ComponentPropsWithRef<"pre"> {
  label?: string;
}

export function ToolPayload({ className, label = "Payload", ...props }: ToolPayloadProps) {
  return (
    <pre
      data-slot="tool-payload"
      tabIndex={0}
      role="region"
      aria-label={label}
      className={cn(
        "max-h-56 overflow-auto rounded-md bg-muted/60 p-2 font-mono text-xs leading-relaxed",
        focusRing,
        className,
      )}
      {...props}
    />
  );
}

export { toolVariants };
