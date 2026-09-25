"use client";

import type { ComponentPropsWithRef, ReactNode } from "react";

import { useAgentSurface, type AgentToolCall } from "@/components/agent-surface";
import {
  ActionLedger,
  ActionLedgerEntry,
  ActionLedgerList,
  ActionLedgerPayload,
  ActionLedgerSelectionSummary,
  ActionLedgerToolbar,
  type LedgerAction,
} from "@/components/ai-action-ledger";
import { focusRingInset } from "@/lib/styles";
import { cn } from "@/lib/utils";

/**
 * What the agent did on this surface, and the way to take it back.
 *
 * Mounted inside an `AgentSurface`, it lists the surface's finished calls as an
 * `ai-action-ledger`, and Undo runs the undo each tool registered for that call
 * (`onUndo` in `execute`). The agent is told what was undone with its next
 * result, so it does not simply do it again.
 *
 * By default it lists the calls worth reverting: writes that registered an
 * undo, and writes whose consequences stand — compensable or irreversible.
 * A sort with no undo is left out; listing it as "Cannot be undone" would be
 * as misleading as offering an undo for it.
 */

export function isWorthListing(call: AgentToolCall): boolean {
  return call.effect === "write" && (call.undoable || call.reversibility !== "revertible");
}

function time(ms: number | undefined): string | undefined {
  if (ms === undefined) return undefined;
  return new Date(ms).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

/** A call as a ledger entry. */
export function toLedgerAction(
  call: AgentToolCall,
  formatTime: (ms: number | undefined) => string | undefined = time,
): LedgerAction {
  return {
    id: call.id,
    summary: call.summary,
    reversibility: call.reversibility,
    status:
      call.undo === "reverting"
        ? "reverting"
        : call.undo === "reverted"
          ? "reverted"
          : call.undo === "failed"
            ? "failed"
            : "applied",
    target: call.title === call.summary ? undefined : call.title,
    timestamp: formatTime(call.finishedAt),
    error: call.undoError,
  };
}

export interface AgentLedgerProps extends Omit<ComponentPropsWithRef<"div">, "children"> {
  /** Which finished calls to list. Defaults to `isWorthListing`. */
  include?: (call: AgentToolCall) => boolean;
  /** Shown before the agent has done anything worth listing. */
  empty?: ReactNode;
  /** How to show when a call finished. */
  formatTime?: (ms: number | undefined) => string | undefined;
}

export function AgentLedger({
  className,
  include = isWorthListing,
  empty,
  formatTime = time,
  ...props
}: AgentLedgerProps) {
  const { calls, api, agentName } = useAgentSurface();
  const listed = calls.filter((call) => call.status === "done" && include(call));
  const actions = listed.map((call) => toLedgerAction(call, formatTime));

  return (
    <div
      data-slot="agent-ledger"
      // Undoing what the agent did is overseeing it, not taking the page back.
      data-agent-ui=""
      className={cn("flex flex-col gap-3", className)}
      {...props}
    >
      <ActionLedger
        actions={actions}
        onRevert={(chosen) => {
          for (const action of chosen) void api.undo(action.id);
        }}
      >
        {actions.length > 0 ? (
          <>
            <ActionLedgerToolbar />
            <ActionLedgerSelectionSummary />
          </>
        ) : (
          <p data-slot="agent-ledger-empty" className="text-sm text-muted-foreground">
            {empty ?? `${agentName} has not changed anything yet.`}
          </p>
        )}
        <ActionLedgerList aria-label={`What ${agentName} did`}>
          {listed.map((call, index) => {
            const action = actions[index];
            if (!action) return null;
            return (
              <ActionLedgerEntry key={call.id} action={action}>
                <ActionLedgerPayload>
                  <div className="flex flex-col gap-1.5 text-xs">
                    {call.edited ? (
                      <p>You corrected {call.edited.join(", ")} before approving.</p>
                    ) : null}
                    {call.source === "webmcp" ? <p>Called by a browser agent.</p> : null}
                    <pre
                      role="region"
                      aria-label="Arguments"
                      tabIndex={0}
                      className={cn(
                        "overflow-x-auto rounded-md bg-muted p-2 font-mono",
                        focusRingInset,
                      )}
                    >
                      {JSON.stringify(call.input, null, 2)}
                    </pre>
                  </div>
                </ActionLedgerPayload>
              </ActionLedgerEntry>
            );
          })}
        </ActionLedgerList>
      </ActionLedger>
    </div>
  );
}
