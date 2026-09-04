"use client";

import type { ReactNode } from "react";

import {
  ActionLedger,
  ActionLedgerEntry,
  ActionLedgerList,
  ActionLedgerSelectionSummary,
  ActionLedgerToolbar,
  type LedgerAction,
} from "@/components/ai-action-ledger";
import { AgentPlan, type PlanStep } from "@/components/ai-agent-plan";
import { AgentStatus, type AgentState } from "@/components/ai-agent-status";
import {
  ApprovalRequest,
  type ApprovalDecision,
  type ApprovalField,
} from "@/components/ai-approval-request";
import { TokenUsage } from "@/components/ai-token-usage";
import { Button } from "@/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/card";
import { EmptyState, EmptyStateDescription, EmptyStateTitle } from "@/components/empty-state";
import { cn } from "@/lib/utils";

/**
 * One agent run, watched: what it plans to do, what it is asking permission
 * for, and what it has already done.
 *
 * Most agent UIs stop at the transcript. The parts that matter when an agent is
 * actually changing things are the three around it — the plan it is working
 * from, the approval it is blocked on, and the ledger of what has already
 * happened, which is the only place the difference between "can be undone",
 * "can be offset" and "cannot be taken back" is ever stated.
 *
 * The order is deliberate. Whatever is blocking the run comes first, because a
 * console that buries the thing waiting on you under a scrolling plan is a
 * console that stalls. Everything else is history.
 */

export interface AgentApproval {
  /** The tool the model wants to call, as it named it. */
  tool: string;
  /** What the call will do, in the reader's language. */
  summary: string;
  arguments: Record<string, string>;
  fields: ApprovalField[];
  /** Said plainly when the call cannot be taken back. */
  irreversible?: string;
  /** True while the arguments are still arriving. */
  streaming?: boolean;
  decision?: ApprovalDecision;
}

export interface AgentConsoleBlockProps {
  /** What this run is for, in the operator's language. */
  title: string;
  description?: string;
  state: AgentState;
  /** Overrides the state's wording. It must still read as text. */
  stateLabel?: string;
  /** The plan, revised as the agent learns. */
  plan?: PlanStep[];
  planLabel?: string;
  /** Context consumed so far, and the window. */
  tokensUsed?: number;
  tokenLimit?: number;
  /** What the run is blocked on, if anything. */
  approval?: AgentApproval;
  onApprovalDecision?: (decision: ApprovalDecision) => void;
  /** What has already been done, and how far it can be walked back. */
  actions?: LedgerAction[];
  onRevert?: (actions: LedgerAction[]) => void;
  /** Stops the run. Offered only while there is something to stop. */
  onStop?: () => void;
  /** Anything else for the header — a link to logs, a run picker. */
  headerActions?: ReactNode;
  className?: string;
}

/** States where the run is still going, and stopping it means something. */
function isRunning(state: AgentState): boolean {
  return state === "thinking" || state === "working" || state === "waiting";
}

export function AgentConsoleBlock({
  title,
  description,
  state,
  stateLabel,
  plan = [],
  planLabel = "Plan",
  tokensUsed,
  tokenLimit,
  approval,
  onApprovalDecision,
  actions = [],
  onRevert,
  onStop,
  headerActions,
  className,
}: AgentConsoleBlockProps) {
  const running = isRunning(state);

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
            {/*
              The one agent on the page, so its transitions are worth
              announcing. On a list of runs this would be noise, which is why
              the component makes it opt-in rather than assuming.
            */}
            <AgentStatus state={state} label={stateLabel} live />
          </div>
          {description ? (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {headerActions}
          {onStop && running ? (
            <Button variant="outline" size="sm" onClick={onStop}>
              Stop run
            </Button>
          ) : null}
        </div>
      </div>

      {/*
        First, not buried. This is the only part of the page that is waiting on
        a person, and everything below it is either intention or history.

        Under its own h2: ApprovalRequest renders an h3, because it is built to
        sit inside a conversation where a section heading already precedes it.
        Dropped straight under this block's h1 it skips a level, which axe
        fails — and the heading it needs is one worth having anyway, since it
        names what the run is blocked on.
      */}
      {approval && onApprovalDecision ? (
        <section aria-labelledby="agent-console-approval" className="grid gap-2">
          <h2 id="agent-console-approval" className="text-sm font-medium">
            Waiting for you
          </h2>
          <ApprovalRequest
            tool={approval.tool}
            summary={approval.summary}
            arguments={approval.arguments}
            fields={approval.fields}
            streaming={approval.streaming}
            irreversible={approval.irreversible}
            decision={approval.decision}
            onDecision={onApprovalDecision}
          />
        </section>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
        <Card>
          <CardHeader>
            <CardTitle asChild>
              <h2>{planLabel}</h2>
            </CardTitle>
            <CardDescription>
              What the agent intends to do. It revises this as it learns.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {plan.length > 0 ? (
              <AgentPlan label={planLabel} steps={plan} />
            ) : (
              <EmptyState>
                <EmptyStateTitle>No plan yet</EmptyStateTitle>
                <EmptyStateDescription>
                  It will appear here once the agent has worked out what to do.
                </EmptyStateDescription>
              </EmptyState>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4">
          {tokensUsed !== undefined && tokenLimit !== undefined ? (
            <Card>
              <CardHeader>
                <CardTitle asChild>
                  <h2>Context</h2>
                </CardTitle>
                <CardDescription>How much of the window this run has used.</CardDescription>
              </CardHeader>
              <CardContent>
                <TokenUsage used={tokensUsed} limit={tokenLimit} />
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle asChild>
                <h2>What it has done</h2>
              </CardTitle>
              <CardDescription>Each action says how far it can be walked back.</CardDescription>
            </CardHeader>
            <CardContent>
              {actions.length > 0 ? (
                <ActionLedger actions={actions} onRevert={onRevert}>
                  <ActionLedgerToolbar />
                  <ActionLedgerSelectionSummary />
                  <ActionLedgerList>
                    {actions.map((action) => (
                      <ActionLedgerEntry key={action.id} action={action} />
                    ))}
                  </ActionLedgerList>
                </ActionLedger>
              ) : (
                <EmptyState>
                  <EmptyStateTitle>Nothing has changed yet</EmptyStateTitle>
                  <EmptyStateDescription>
                    Anything the agent does will be listed here, with whether it can be undone.
                  </EmptyStateDescription>
                </EmptyState>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
