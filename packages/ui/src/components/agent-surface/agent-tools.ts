/**
 * The vocabulary of an agent surface: tools, calls, control, approvals.
 *
 * Types and pure helpers only — nothing here touches React or the DOM, so the
 * rules about what needs approval and what an agent is told can be read and
 * tested on their own.
 */

import type { JsonSchema } from "./tool-input";
import type { WebMCPToolDefinition } from "./webmcp";

export type ControlHolder = "shared" | "agent" | "person";
export type ToolEffect = "read" | "write";
/** The same vocabulary as `ai-action-ledger`, so a call maps onto an entry. */
export type ToolReversibility = "revertible" | "compensable" | "irreversible";
export type ToolCallSource = "webmcp" | "app";
export type ToolCallStatus = "running" | "done" | "refused" | "failed";

export interface AgentToolContext {
  /** Aborted when the person takes over, or the caller gives up. */
  signal: AbortSignal;
  source: ToolCallSource;
  /**
   * Registers how to take this call back — or, for a compensable action, how
   * to offset it. Captures whatever the undo needs in a closure, so none of it
   * is sent to the agent. A call with an undo can be reverted from the ledger.
   */
  onUndo: (undo: () => unknown) => void;
}

/** One thing a call would change, as a dry run reports it. */
export interface PreviewChange {
  id: string;
  /** What it is, in the person's words: "Acme renewal". */
  label: string;
  kind: "create" | "update" | "delete";
  /** Overrides the tool's own reversibility for this one change. */
  reversibility?: ToolReversibility;
  /** What changes about it: "Stage: Negotiation → Closed lost". */
  detail?: string;
}

/**
 * What a call would do, worked out without doing it. Shape-compatible with
 * `blast-radius`'s data, which is how an approval shows it.
 */
export interface ToolPreview {
  changes: PreviewChange[];
  /** How many there are in all, when `changes` is a sample. */
  total?: number;
  /** Anything the list cannot say: "Also emails each owner." */
  note?: string;
  /** What the things are called: `{ one: "deal", other: "deals" }`. */
  noun?: { one: string; other: string };
}

export type PreviewState =
  | { state: "loading" }
  | { state: "ready"; data: ToolPreview }
  | { state: "failed"; error: string };

export interface AgentTool<Input extends Record<string, unknown> = Record<string, unknown>> {
  /** Letters, digits, `_` and `-`. Prefixed with the surface's `name` when exposed. */
  name: string;
  title?: string;
  /** Written for the model: what it does, when to use it, what it returns. */
  description: string;
  inputSchema?: JsonSchema;
  /** `read` only observes. Anything else is a `write`, which is the default. */
  effect?: ToolEffect;
  /** For writes. Defaults to `revertible`. */
  reversibility?: ToolReversibility;
  /** Ask the person first. Defaults to true for irreversible writes. */
  requiresApproval?: boolean;
  /** The result can contain text from users or third parties. */
  untrustedOutput?: boolean;
  /** The element this acts on. It is marked while the agent uses it. */
  target?: { readonly current: HTMLElement | null };
  /** What the call did, in the person's words and the past tense: "Sorted deals by amount". */
  describe?: (input: Input) => string;
  /** Registered only while true. */
  enabled?: boolean;
  /**
   * Offered to browser agents when the surface has `webmcp`. False keeps a
   * tool for the app's own assistant — for instance when a declarative form
   * already describes it to the browser.
   */
  webmcp?: boolean;
  /**
   * Checked after the input is validated and before anyone is asked to
   * approve: returns why the call cannot run yet, or nothing. So the person is
   * never asked to approve something that was going to fail anyway.
   */
  precondition?: (input: Input) => string | undefined;
  /**
   * A dry run: what the call would change, without changing it. Run while the
   * person is asked to approve, so they see the blast radius before deciding.
   */
  preview?: (input: Input) => ToolPreview | Promise<ToolPreview>;
  /** Returns text for the agent, or data it will receive as JSON. */
  execute: (input: Input, context: AgentToolContext) => unknown;
}

export interface AgentToolDefinition extends WebMCPToolDefinition {
  effect: ToolEffect;
  reversibility: ToolReversibility;
}

export type UndoState = "reverting" | "reverted" | "failed";

export interface AgentToolCall {
  id: string;
  tool: string;
  /** What the tool is, for asking about it: "Email deal owners". */
  title: string;
  /** What it did, once done, in the person's words: "Emailed 2 deal owners". */
  summary: string;
  input: Record<string, unknown>;
  source: ToolCallSource;
  status: ToolCallStatus;
  effect: ToolEffect;
  reversibility: ToolReversibility;
  /** Why it was refused or failed. */
  reason?: string;
  data?: unknown;
  /** Arguments the person corrected before approving. */
  edited?: string[];
  /** The dry run shown with the approval, as it stands. */
  preview?: PreviewState;
  /** Exactly what the agent was told, notices included. */
  told?: string;
  /** Whether the tool registered a way to take it back. */
  undoable: boolean;
  undo?: UndoState;
  undoError?: string;
  startedAt: number;
  finishedAt?: number;
}

export interface AgentToolResult {
  ok: boolean;
  status: ToolCallStatus;
  /** What the agent is told. */
  text: string;
  data?: unknown;
}

/**
 * What an approval can say. More than yes or no: `ai-approval-request` lets
 * the person correct the arguments first, and approve a tool for the rest of
 * the session.
 */
export type ApprovalAnswer =
  | boolean
  | { approved: true; input?: Record<string, unknown>; scope?: "once" | "always" }
  | { approved: false; reason?: string };

export type ApprovalHandler = (call: AgentToolCall) => ApprovalAnswer | Promise<ApprovalAnswer>;

export interface ControlChange {
  holder: ControlHolder;
  previous: ControlHolder;
  by: "person" | "agent" | "app";
  /** Why the agent handed control to the person. */
  reason?: string;
  /** What the person said when handing it back. */
  note?: string;
}

/** A change of control, and when it happened. */
export interface ControlEvent extends ControlChange {
  at: number;
}

export interface AgentSurfaceApi {
  getHolder: () => ControlHolder;
  /**
   * Something the agent should know, delivered at the start of its next
   * result — the same channel as a hand-back note. For decisions the person
   * makes outside a tool call, such as accepting some of its suggestions.
   */
  notify: (text: string) => void;
  /** Definitions for your own model's tool list. */
  tools: () => AgentToolDefinition[];
  /** Runs a tool on behalf of the app's own assistant. */
  call: (
    name: string,
    input?: unknown,
    options?: { signal?: AbortSignal; source?: ToolCallSource },
  ) => Promise<AgentToolResult>;
  /** Takes a finished call back, through the undo its tool registered. */
  undo: (callId: string) => Promise<boolean>;
  /** The agent starts driving. */
  grant: () => void;
  /** The run is over; nobody holds the surface. */
  release: () => void;
  /** The person takes control. Running calls are aborted. */
  takeOver: () => void;
  /** The agent needs the person to do something only they can. */
  handOver: (reason: string) => void;
  /** The person returns control, optionally with a note for the agent. */
  handBack: (note?: string) => void;
}

export interface AgentSurfaceLabels {
  /** Announced when control changes. */
  change: (change: ControlChange, agentName: string) => string;
  /** Announced when a call finishes, with `announceCalls`. */
  call: (call: AgentToolCall, agentName: string) => string;
  /** Announced when the person takes a call back. */
  undo: (call: AgentToolCall) => string;
}

export const DEFAULT_LABELS: AgentSurfaceLabels = {
  change: ({ holder, previous, by, reason }, agent) => {
    if (holder === "person") {
      return by === "agent" && reason
        ? `${agent} needs you: ${reason}. You have control.`
        : `You have control. ${agent} is paused.`;
    }
    if (holder === "agent") {
      return previous === "person" ? `${agent} has control again.` : `${agent} has control.`;
    }
    return previous === "person"
      ? `${agent} can act on this page again.`
      : `${agent} is no longer in control.`;
  },
  call: (call, agent) =>
    call.status === "done"
      ? `${agent}: ${call.summary}.`
      : `${agent}: “${call.title}” ${call.status === "refused" ? "was refused" : "failed"}.`,
  undo: (call) =>
    call.undo === "reverted"
      ? `Undone: ${call.summary}.`
      : `Could not undo: ${call.summary}. ${call.undoError ?? ""}`.trim(),
};

/** What the agent is told when it cannot do something, and why. */
export const REFUSAL = {
  personHolds:
    "The person has taken control of this page. Wait until they hand it back, then try again.",
  noApprover:
    "This action needs the person's approval, and this page has no way to ask for it.",
  declined: "The person declined this action.",
  stopped: "Stopped: the person took control before this finished.",
} as const;

export const TOOL_NAME = /^[A-Za-z0-9_-]{1,64}$/;

export function needsApproval(tool: AgentTool): boolean {
  return (
    tool.requiresApproval ??
    ((tool.effect ?? "write") === "write" && tool.reversibility === "irreversible")
  );
}

export function annotate(tool: AgentTool): WebMCPToolDefinition["annotations"] {
  return {
    readOnlyHint: (tool.effect ?? "write") === "read",
    consequentialHint: needsApproval(tool) || tool.reversibility === "irreversible",
    untrustedContentHint: tool.untrustedOutput ?? false,
  };
}

export function toText(value: unknown, summary: string): string {
  if (typeof value === "string") return value;
  if (value === undefined) return `Done: ${summary}.`;
  try {
    return JSON.stringify(value);
  } catch {
    return `Done: ${summary}.`;
  }
}

export interface NormalisedApproval {
  approved: boolean;
  input?: Record<string, unknown>;
  scope: "once" | "always";
  reason?: string;
}

export function normaliseApproval(answer: ApprovalAnswer): NormalisedApproval {
  if (typeof answer === "boolean") return { approved: answer, scope: "once" };
  if (!answer.approved) return { approved: false, scope: "once", reason: answer.reason };
  return { approved: true, input: answer.input, scope: answer.scope ?? "once" };
}

/** The keys whose values differ between two inputs. */
export function changedKeys(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): string[] {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...keys].filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]));
}
