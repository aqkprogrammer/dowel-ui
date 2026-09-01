"use client";

import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentPropsWithRef } from "react";

import { cn } from "@/lib/utils";

/**
 * What an agent is doing right now.
 *
 * Always a word, never only a colour. Agent states matter most when something
 * has gone wrong, which is exactly when a colour-only signal fails the people
 * who most need to notice.
 */

export type AgentState = "idle" | "thinking" | "working" | "waiting" | "done" | "error";

const STATE_LABEL: Record<AgentState, string> = {
  idle: "Idle",
  thinking: "Thinking",
  working: "Working",
  waiting: "Waiting for input",
  done: "Done",
  error: "Error",
};

const agentStatusVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium",
  {
    variants: {
      state: {
        idle: "border-border bg-muted text-muted-foreground",
        thinking: "border-info/30 bg-info/10 text-info",
        working: "border-primary/30 bg-primary/10 text-primary",
        waiting: "border-warning/35 bg-warning/10 text-warning",
        done: "border-success/30 bg-success/10 text-success",
        error: "border-destructive/30 bg-destructive/10 text-destructive",
      },
    },
    defaultVariants: {
      state: "idle",
    },
  },
);

export interface AgentStatusProps
  extends ComponentPropsWithRef<"span">, VariantProps<typeof agentStatusVariants> {
  state?: AgentState;
  /** Overrides the wording. The state must still be readable as text. */
  label?: string;
  /**
   * Announce changes politely.
   *
   * Off by default: several agents each announcing their own transitions turns
   * a dashboard into noise. Turn it on for the one agent the user is watching.
   */
  live?: boolean;
}

export function AgentStatus({
  className,
  state = "idle",
  label,
  live = false,
  children,
  ...props
}: AgentStatusProps) {
  const busy = state === "thinking" || state === "working";

  return (
    <span
      data-slot="agent-status"
      data-state={state}
      role={live ? "status" : undefined}
      aria-live={live ? "polite" : undefined}
      className={cn(agentStatusVariants({ state }), className)}
      {...props}
    >
      <span
        aria-hidden="true"
        className={cn("size-1.5 rounded-full bg-current", busy && "animate-pulse-soft")}
      />
      {children ?? label ?? STATE_LABEL[state]}
    </span>
  );
}

export { agentStatusVariants };
