"use client";

import { useEffect, useRef, useState, type ComponentPropsWithRef } from "react";

import {
  useAgentSurface,
  type AgentToolCall,
  type ApprovalAnswer,
  type JsonSchema,
} from "@/components/agent-surface";
import {
  ApprovalRequest,
  type ApprovalDecision,
  type ApprovalField,
} from "@/components/ai-approval-request";
import { BlastRadius } from "@/components/blast-radius";
import { cn } from "@/lib/utils";

/**
 * The approval step for an agent surface, wired by being there.
 *
 * Mounted inside an `AgentSurface`, it answers the surface's approval
 * requests with `ai-approval-request` — so the person can correct the
 * agent's arguments before approving, or allow a tool for the rest of the
 * session, rather than only saying yes or no. A tool with a `preview` shows
 * its blast radius in the request — what approving will change — filled in
 * when the dry run finishes. Requests queue, one on screen
 * at a time. If it unmounts with requests waiting, they are refused: an agent
 * left waiting on an approval nobody can see is an agent that eventually
 * times out and retries.
 */

interface Pending {
  call: AgentToolCall;
  resolve: (answer: ApprovalAnswer) => void;
}

interface Settled {
  call: AgentToolCall;
  decision: ApprovalDecision;
}

const REVERSIBILITY_WARNING: Record<AgentToolCall["reversibility"], string | undefined> = {
  revertible: undefined,
  compensable: "Once this runs it can only be offset by another action, not undone.",
  irreversible: "This cannot be undone once it runs.",
};

function humanise(name: string): string {
  const spaced = name.replace(/[_-]+/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function isPrimitive(schema: JsonSchema | undefined, value: unknown): boolean {
  if (schema?.type === "array" || schema?.type === "object") return false;
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}

/**
 * The call's arguments as approval fields. Only arguments the agent actually
 * sent are shown — an absent optional one would read as "still arriving" and
 * hold the decision forever. Lists and objects are shown, not edited.
 */
export function approvalFields(
  schema: JsonSchema | undefined,
  input: Record<string, unknown>,
  labels: Record<string, string> = {},
): { fields: ApprovalField[]; values: Record<string, string> } {
  const order = [...Object.keys(schema?.properties ?? {}), ...Object.keys(input)];
  const names = [...new Set(order)].filter((name) => input[name] !== undefined);
  const values: Record<string, string> = {};
  const fields = names.map((name): ApprovalField => {
    const property = schema?.properties?.[name];
    const value = input[name];
    const text = typeof value === "string" ? value : JSON.stringify(value);
    values[name] = text;
    return {
      name,
      label: labels[name] ?? property?.description ?? humanise(name),
      readOnly: !isPrimitive(property, value),
      multiline: text.length > 60 || text.includes("\n"),
    };
  });
  return { fields, values };
}

/** The person's edits, typed back the way the schema says the tool takes them. */
export function correctedInput(
  schema: JsonSchema | undefined,
  input: Record<string, unknown>,
  decision: Extract<ApprovalDecision, { approved: true }>,
): Record<string, unknown> | undefined {
  if (decision.edited.length === 0) return undefined;
  const corrected: Record<string, unknown> = {};
  for (const name of decision.edited) {
    const text = decision.arguments[name] ?? "";
    const type = schema?.properties?.[name]?.type ?? typeof input[name];
    if (type === "number" || type === "integer") {
      const number = Number(text);
      corrected[name] = text.trim() === "" || Number.isNaN(number) ? text : number;
    } else if (type === "boolean") {
      corrected[name] = text === "true" ? true : text === "false" ? false : text;
    } else {
      corrected[name] = text;
    }
  }
  return corrected;
}

export interface AgentApprovalsProps extends Omit<ComponentPropsWithRef<"div">, "children"> {
  /** Labels for arguments, by name. Otherwise the schema's description, or the name itself. */
  fieldLabels?: Record<string, string>;
}

export function AgentApprovals({ className, fieldLabels, ...props }: AgentApprovalsProps) {
  const { registerApprover, api, agentName, calls } = useAgentSurface();
  const [queue, setQueue] = useState<Pending[]>([]);
  const [settled, setSettled] = useState<Settled | null>(null);
  const pending = useRef<Pending[]>([]);

  useEffect(() => {
    const unregister = registerApprover(
      (call) =>
        new Promise<ApprovalAnswer>((resolve) => {
          const entry = { call, resolve };
          pending.current = [...pending.current, entry];
          setQueue(pending.current);
        }),
    );
    return () => {
      unregister();
      // Fail closed: nothing is left waiting on a question nobody can see.
      for (const entry of pending.current) entry.resolve(false);
      pending.current = [];
    };
  }, [registerApprover]);

  const current = queue[0];
  const schema = current
    ? api.tools().find((tool) => tool.name === current.call.tool)?.inputSchema
    : undefined;

  const decide = (entry: Pending, decision: ApprovalDecision) => {
    pending.current = pending.current.filter((candidate) => candidate !== entry);
    setQueue(pending.current);
    setSettled({ call: entry.call, decision });
    entry.resolve(
      decision.approved
        ? {
            approved: true,
            scope: decision.scope,
            input: correctedInput(schema, entry.call.input, decision),
          }
        : { approved: false, reason: decision.reason },
    );
  };

  const shown = current?.call ?? settled?.call;
  const { fields, values } = shown
    ? approvalFields(
        current ? schema : api.tools().find((tool) => tool.name === shown.tool)?.inputSchema,
        shown.input,
        fieldLabels,
      )
    : { fields: [], values: {} };

  // The call as it stands now, not as it was asked: its dry run fills in after.
  const preview = shown ? calls.find((call) => call.id === shown.id)?.preview : undefined;

  return (
    <div
      data-slot="agent-approvals"
      data-agent-ui=""
      className={cn("flex flex-col gap-2", className)}
      {...props}
    >
      {/* Present from first paint, so the first request is announced: the
          agent is stopped until someone answers. */}
      <p data-slot="agent-approvals-status" role="status" className="sr-only">
        {current ? `${agentName} is waiting for your approval: ${current.call.title}.` : ""}
      </p>
      {shown ? (
        <ApprovalRequest
          key={shown.id}
          tool={shown.tool}
          summary={shown.title}
          arguments={values}
          fields={fields}
          irreversible={REVERSIBILITY_WARNING[shown.reversibility]}
          decision={current ? undefined : settled?.decision}
          onDecision={(decision) => {
            if (current) decide(current, decision);
          }}
        >
          {preview && current ? (
            <BlastRadius
              className="mt-3"
              loading={preview.state === "loading"}
              error={preview.state === "failed" ? preview.error : undefined}
              data={preview.state === "ready" ? preview.data : undefined}
              noun={preview.state === "ready" ? preview.data.noun : undefined}
              reversibility={shown?.reversibility}
            />
          ) : null}
        </ApprovalRequest>
      ) : null}
      {queue.length > 1 ? (
        <p data-slot="agent-approvals-queued" className="text-xs text-muted-foreground">
          {queue.length - 1} more {queue.length === 2 ? "request" : "requests"} waiting
        </p>
      ) : null}
    </div>
  );
}
