import type { AgentSurfaceApi, AgentToolDefinition } from "@dowel-ui/react/agent-surface";

import { MAX_MODEL_TURNS, MAX_TOOL_RESULT_CHARS } from "./limits";
import type { TurnReply } from "./model";
import type { DemoTool, DemoToolResult, DemoTurn, TurnRequest } from "./request";

/**
 * The agent loop, in the browser.
 *
 * The model is asked for a turn, its tool calls are run through the page's
 * `agent-surface`, and the results go back for the next turn. Everything that
 * makes the agent safe to watch happens in that middle step and none of it is
 * written here: the surface refuses calls while the person holds control,
 * waits for their approval, records what can be undone, and tells the agent
 * about all three in the results it returns.
 *
 * What this adds is patience. When a call is refused because the person took
 * over, the loop does not go back to the model to be told to try again: it
 * waits for the hand-back, and reports the refusal together with their note.
 */

export type AgentEvent =
  | { type: "say"; text: string }
  /** The person holds control; the agent is waiting. */
  | { type: "waiting" }
  | { type: "resumed"; note?: string }
  | {
      type: "done";
      reason: "finished" | "stopped" | "limit" | "refused" | "cut-short" | "error";
      message?: string;
    };

/** The surface's API, narrowed to what the loop uses. */
export type Surface = Pick<
  AgentSurfaceApi,
  "getHolder" | "tools" | "call" | "grant" | "release"
>;

export interface RunOptions {
  api: Surface;
  goal: string;
  signal: AbortSignal;
  onEvent: (event: AgentEvent) => void;
  /** Resolves with the person's note when they hand control back. */
  waitForHandBack: (signal: AbortSignal) => Promise<string | undefined>;
  /** One model turn. The default asks the site's endpoint. */
  turn?: (request: TurnRequest, signal: AbortSignal) => Promise<TurnReply>;
}

/** A tool as the model is told about it, with what the page knows about its effect. */
export function describeTools(definitions: AgentToolDefinition[]): DemoTool[] {
  return definitions.map((definition) => {
    const effect =
      definition.effect === "read"
        ? " Only reads."
        : definition.reversibility === "irreversible"
          ? " Cannot be undone, so the person is asked to approve it first."
          : "";
    return {
      name: definition.name,
      description: `${definition.description}${effect}`,
      input_schema: (definition.inputSchema ?? {
        type: "object",
        properties: {},
      }) as DemoTool["input_schema"],
    };
  });
}

export async function requestTurn(
  request: TurnRequest,
  signal: AbortSignal,
): Promise<TurnReply> {
  const response = await fetch("/api/agent-demo", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(request),
    signal,
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "The model did not answer. Try again.");
  }
  return (await response.json()) as TurnReply;
}

function clip(text: string): string {
  return text.length <= MAX_TOOL_RESULT_CHARS
    ? text
    : `${text.slice(0, MAX_TOOL_RESULT_CHARS - 20)}… (cut short)`;
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

/** Runs the agent until it finishes, is stopped, or runs out of turns. */
export async function runAgent({
  api,
  goal,
  signal,
  onEvent,
  waitForHandBack,
  turn = requestTurn,
}: RunOptions): Promise<void> {
  const tools = describeTools(api.tools());
  const turns: DemoTurn[] = [];
  api.grant();

  try {
    for (let step = 0; step < MAX_MODEL_TURNS; step += 1) {
      // No point asking the model for calls that will all be refused.
      if (api.getHolder() === "person") {
        onEvent({ type: "waiting" });
        onEvent({ type: "resumed", note: await waitForHandBack(signal) });
      }

      const reply = await turn({ goal, tools, turns }, signal);

      for (const block of reply.content) {
        if (block.type === "text" && block.text.trim()) {
          onEvent({ type: "say", text: block.text.trim() });
        }
      }

      if (reply.stop === "refusal") {
        onEvent({ type: "done", reason: "refused" });
        return;
      }
      if (reply.stop === "max_tokens") {
        // The last tool call may be half-written: nothing in this turn is run.
        onEvent({ type: "done", reason: "cut-short" });
        return;
      }
      if (reply.stop !== "tool_use") {
        onEvent({ type: "done", reason: "finished" });
        return;
      }

      const results: DemoToolResult[] = [];
      for (const block of reply.content) {
        if (block.type !== "tool_use") continue;
        const result = await api.call(block.name, block.input, { signal, source: "app" });
        let text = result.text;

        if (result.status === "refused" && api.getHolder() === "person") {
          onEvent({ type: "waiting" });
          const note = await waitForHandBack(signal);
          onEvent({ type: "resumed", note });
          text +=
            `\n\nThe person has now handed control back` +
            (note ? `, with this note: "${note}".` : ".") +
            " This call did not run. Read the page again before deciding what to do next.";
        }

        results.push({ tool_use_id: block.id, content: clip(text), is_error: !result.ok });
      }
      turns.push({ assistant: reply.content, results });
    }
    onEvent({ type: "done", reason: "limit" });
  } catch (error) {
    if (signal.aborted || isAbort(error)) onEvent({ type: "done", reason: "stopped" });
    else {
      onEvent({
        type: "done",
        reason: "error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  } finally {
    // Unless the person holds the page: ending a run must not take it from them.
    if (api.getHolder() !== "person") api.release();
  }
}

export type ScriptStep = { say: string } | { tool: string; input?: Record<string, unknown> };

/**
 * Plays a fixed sequence of calls through the same surface, for when no model
 * is connected. It meets refusals, approvals and take-overs exactly as the
 * model's run does, because those are the surface's doing; what it cannot do
 * is change its mind about what comes next.
 */
export async function runScript(
  script: readonly ScriptStep[],
  {
    api,
    signal,
    onEvent,
    waitForHandBack,
    stepMs = 900,
  }: Omit<RunOptions, "goal" | "turn"> & { stepMs?: number },
): Promise<void> {
  const pause = () =>
    new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, stepMs);
      signal.addEventListener(
        "abort",
        () => {
          clearTimeout(timer);
          reject(new DOMException("Stopped", "AbortError"));
        },
        { once: true },
      );
    });

  api.grant();
  try {
    for (const step of script) {
      await pause();
      if ("say" in step) {
        onEvent({ type: "say", text: step.say });
        continue;
      }
      for (;;) {
        const result = await api.call(step.tool, step.input ?? {}, { signal, source: "app" });
        if (!(result.status === "refused" && api.getHolder() === "person")) break;
        onEvent({ type: "waiting" });
        onEvent({ type: "resumed", note: await waitForHandBack(signal) });
      }
    }
    onEvent({ type: "done", reason: "finished" });
  } catch (error) {
    if (signal.aborted || isAbort(error)) onEvent({ type: "done", reason: "stopped" });
    else {
      onEvent({
        type: "done",
        reason: "error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  } finally {
    if (api.getHolder() !== "person") api.release();
  }
}
