"use client";

// Motion from SmoothUI AI Tool Call (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
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
  /**
   * Status mark style. `icon` is a glyph per status; `ring` is one ring that
   * breathes while queued, spins with a gap while running, and draws a check
   * or a cross when done. `icon` wins over both.
   */
  indicator?: "icon" | "ring";
  /**
   * A short note before the status — "3 sources", "1.2s". It is part of the
   * trigger's accessible name, so keep it short.
   */
  summary?: ReactNode;
}

export function ToolHeader({
  className,
  name,
  status = "pending",
  statusLabel,
  icon,
  indicator = "icon",
  summary,
  ...props
}: ToolHeaderProps) {
  const hasSummary = summary !== undefined && summary !== null;

  return (
    <CollapsiblePrimitive.Trigger
      data-slot="tool-header"
      className={cn(
        "flex w-full items-center gap-2 px-3 py-2 text-start",
        "transition-colors duration-[var(--duration-fast)] hover:bg-accent/50",
        "[&[data-state=open]>svg:last-child]:rotate-180",
        focusRing,
        className,
      )}
      {...props}
    >
      {icon ??
        (indicator === "ring" ? <ToolRing status={status} /> : <ToolIcon status={status} />)}
      <span className="font-mono text-xs font-medium">{name}</span>
      {hasSummary ? (
        <span
          data-slot="tool-summary"
          className="ms-auto shrink-0 text-xs text-muted-foreground tabular-nums"
        >
          {summary}
        </span>
      ) : null}
      {/* Status in words. A coloured dot alone says nothing to a screen reader
          and nothing to anyone who cannot distinguish the colours. */}
      <span
        data-slot="tool-status"
        className={cn(
          !hasSummary && "ms-auto",
          "text-xs",
          status === "error" ? "text-destructive" : "text-muted-foreground",
        )}
      >
        {statusLabel ?? STATUS_LABEL[status]}
      </span>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="size-3.5 shrink-0 text-muted-foreground transition-transform duration-[var(--duration-normal)] ease-[var(--ease-out-quint)]"
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

const PREFIX = "dowel-ai-tool";

/*
 * One ring for the whole lifecycle. The gap is a transitioned dash array, the
 * spin and breathe are loops, and the check and cross draw once when they
 * mount. None of it is an indicator: the status word already says "Running",
 * so under reduced motion the ring settles instead of moving.
 */
const STYLES = `
@keyframes ${PREFIX}-ring-spin{to{rotate:360deg}}
@keyframes ${PREFIX}-ring-breathe{0%,100%{stroke-opacity:1}50%{stroke-opacity:.35}}
@keyframes ${PREFIX}-ring-draw{from{stroke-dashoffset:1}}
[data-slot=tool-ring] [data-part=track]{stroke-dasharray:1 0;transition:stroke-dasharray calc(250ms * var(--motion-scale,1)) var(--ease-out-quint)}
[data-slot=tool-ring][data-status=running] [data-part=track]{stroke-dasharray:.68 .32}
[data-slot=tool-ring] [data-part=spin]{transform-box:view-box;transform-origin:center}
[data-slot=tool-ring][data-status=running] [data-part=spin]{animation:${PREFIX}-ring-spin calc(900ms * var(--motion-scale,1)) linear infinite}
[data-slot=tool-ring][data-status=pending] [data-part=track]{animation:${PREFIX}-ring-breathe calc(1600ms * var(--motion-scale,1)) ease-in-out infinite}
[data-slot=tool-ring] [data-part=glyph]{stroke-dasharray:1 1;animation:${PREFIX}-ring-draw calc(220ms * var(--motion-scale,1)) var(--ease-out-quint) both}
[data-slot=tool-ring] [data-part=glyph][data-stroke=cross]{animation-duration:calc(160ms * var(--motion-scale,1))}
[data-slot=tool-ring] [data-part=glyph][data-stroke=cross]+[data-stroke=cross]{animation-delay:calc(60ms * var(--motion-scale,1))}
`;

const RING_TONE: Record<ToolStatus, string> = {
  pending: "text-muted-foreground",
  running: "text-info",
  success: "text-success",
  error: "text-destructive",
};

const CHECK_PATH = "M 8.5 12.2 L 11 14.8 L 15.8 9.6";
const CROSS_PATHS = ["M 9 9 L 15 15", "M 15 9 L 9 15"] as const;

/** The `indicator="ring"` mark. It never unmounts, so its changes transition. */
function ToolRing({ status }: { status: ToolStatus }) {
  return (
    <>
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        data-slot="tool-ring"
        data-status={status}
        className={cn(
          "size-4 shrink-0 transition-colors duration-[calc(250ms*var(--motion-scale))] ease-[var(--ease-out-quint)]",
          RING_TONE[status],
        )}
      >
        <g data-part="spin">
          <circle
            data-part="track"
            cx="12"
            cy="12"
            r="8"
            pathLength={1}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>
        {/* Keyed by status, so a glyph mounts — and draws — on the change. */}
        {status === "success" ? (
          <path
            key="success"
            data-part="glyph"
            data-stroke="check"
            d={CHECK_PATH}
            pathLength={1}
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}
        {status === "error"
          ? CROSS_PATHS.map((d) => (
              <path
                key={d}
                data-part="glyph"
                data-stroke="cross"
                d={d}
                pathLength={1}
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            ))
          : null}
      </svg>
    </>
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
