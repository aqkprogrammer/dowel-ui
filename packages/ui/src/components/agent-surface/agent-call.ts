/**
 * One tool call, from the agent asking to the agent being told what happened.
 *
 * Kept apart from the React provider so the order of the checks — who holds
 * control, whether the input is valid, whether the person approves — reads top
 * to bottom in one place. The provider supplies the runtime: its refs, its
 * state setters, its tools.
 */

import {
  changedKeys,
  needsApproval,
  normaliseApproval,
  REFUSAL,
  toText,
  type AgentTool,
  type AgentToolCall,
  type AgentToolResult,
  type ApprovalHandler,
  type ControlHolder,
  type NormalisedApproval,
  type ToolCallSource,
  type ToolCallStatus,
} from "./agent-tools";
import { validateInput } from "./tool-input";

export interface CallRuntime {
  tool: (name: string) => AgentTool | undefined;
  holder: () => ControlHolder;
  approver: () => ApprovalHandler | undefined;
  /** Tools the person approved for the rest of the session. */
  approvedAlways: Set<string>;
  /**
   * Everything the agent should hear before its next result — a hand-back
   * note, an undo. Read once: taking them empties the queue.
   */
  takeNotices: () => string[];
  record: (call: AgentToolCall) => void;
  touch: (target: AgentTool["target"]) => void;
  running: Set<AbortController>;
  /** Calls in progress, so the agent's own synthetic clicks are recognised. */
  executing: { current: number };
  undos: Map<string, () => unknown>;
  nextId: (name: string) => string;
}

function prefixNotices(runtime: CallRuntime, text: string): string {
  const notices = runtime.takeNotices();
  return notices.length > 0 ? `${notices.join("\n")}\n\n${text}` : text;
}

export async function runTool(
  runtime: CallRuntime,
  name: string,
  raw: unknown,
  source: ToolCallSource,
  outer?: AbortSignal,
): Promise<AgentToolResult> {
  const tool = runtime.tool(name);
  if (!tool) {
    return {
      ok: false,
      status: "refused",
      text: prefixNotices(runtime, `There is no tool named "${name}" on this page.`),
    };
  }

  let input = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  let call: AgentToolCall = {
    id: runtime.nextId(name),
    tool: name,
    title: tool.title ?? name,
    summary: tool.describe?.(input) ?? tool.title ?? name,
    input,
    source,
    status: "running",
    effect: tool.effect ?? "write",
    reversibility: tool.reversibility ?? "revertible",
    undoable: false,
    startedAt: Date.now(),
  };

  const report = (update: Partial<AgentToolCall>) => {
    call = { ...call, ...update };
    runtime.record(call);
  };

  const end = (status: ToolCallStatus, text: string, data?: unknown): AgentToolResult => {
    report({
      status,
      finishedAt: Date.now(),
      data,
      reason: status === "done" ? undefined : text,
    });
    return { ok: status === "done", status, text: prefixNotices(runtime, text), data };
  };

  if (runtime.holder() === "person") return end("refused", REFUSAL.personHolds);

  const problems = validateInput(tool.inputSchema, input);
  if (problems.length > 0) return end("refused", `Invalid input: ${problems.join("; ")}.`);

  const blocked = tool.precondition?.(input);
  if (blocked) return end("refused", blocked);

  if (needsApproval(tool) && !runtime.approvedAlways.has(name)) {
    const ask = runtime.approver();
    if (!ask) return end("refused", REFUSAL.noApprover);
    report({ status: "running" });

    // Asked synchronously, so an approval UI appears in the same tick; a
    // handler that throws is a refusal, like one that says no.
    let answer: NormalisedApproval;
    try {
      answer = normaliseApproval(await ask(call));
    } catch {
      answer = normaliseApproval(false);
    }
    if (!answer.approved) {
      return end(
        "refused",
        answer.reason ? `${REFUSAL.declined.slice(0, -1)}: ${answer.reason}` : REFUSAL.declined,
      );
    }
    // Control can change while the question is open.
    if (runtime.holder() === "person") return end("refused", REFUSAL.personHolds);

    // Approved with corrections: the person's version is what runs, and it is
    // held to the same schema the agent's was.
    if (answer.input) {
      const corrected = { ...input, ...answer.input };
      const invalid = validateInput(tool.inputSchema, corrected);
      if (invalid.length > 0) return end("refused", `Invalid input: ${invalid.join("; ")}.`);
      const edited = changedKeys(input, corrected);
      input = corrected;
      report({
        input,
        summary: tool.describe?.(input) ?? call.summary,
        edited: edited.length > 0 ? edited : undefined,
      });
    }
    if (answer.scope === "always") runtime.approvedAlways.add(name);
  }

  const controller = new AbortController();
  outer?.addEventListener(
    "abort",
    () => {
      controller.abort();
    },
    { once: true },
  );
  runtime.running.add(controller);
  report({ status: "running" });
  runtime.touch(tool.target);
  runtime.executing.current += 1;

  let undo: (() => unknown) | undefined;
  try {
    const value: unknown = await tool.execute(input, {
      signal: controller.signal,
      source,
      onUndo: (fn) => {
        undo = fn;
      },
    });
    if (controller.signal.aborted) return end("failed", REFUSAL.stopped);
    if (undo) {
      runtime.undos.set(call.id, undo);
      call = { ...call, undoable: true };
    }
    const data = typeof value === "object" && value !== null ? value : undefined;
    return end("done", toText(value, call.summary), data);
  } catch (error) {
    if (controller.signal.aborted) return end("failed", REFUSAL.stopped);
    return end("failed", `Failed: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    runtime.executing.current -= 1;
    runtime.running.delete(controller);
  }
}

/**
 * Takes a finished call back. The person asked for it, so control does not
 * matter here — and the agent is told, with its next result, so it does not
 * simply do it again.
 */
export async function undoCall(
  runtime: CallRuntime,
  call: AgentToolCall,
  notify: (notice: string) => void,
): Promise<boolean> {
  const undo = runtime.undos.get(call.id);
  if (!undo) {
    runtime.record({
      ...call,
      undo: "failed",
      undoError: "No undo was provided for this action.",
    });
    return false;
  }
  runtime.record({ ...call, undo: "reverting", undoError: undefined });
  try {
    await undo();
    runtime.undos.delete(call.id);
    runtime.record({ ...call, undo: "reverted", undoError: undefined });
    notify(`The person undid: ${call.summary}.`);
    return true;
  } catch (error) {
    runtime.record({
      ...call,
      undo: "failed",
      undoError: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}
