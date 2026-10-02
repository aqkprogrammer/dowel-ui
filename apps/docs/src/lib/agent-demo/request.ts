import type Anthropic from "@anthropic-ai/sdk";

import {
  MAX_ASSISTANT_TURN_CHARS,
  MAX_GOAL_CHARS,
  MAX_MODEL_TURNS,
  MAX_TOOL_DESCRIPTION_CHARS,
  MAX_TOOL_RESULT_CHARS,
  MAX_TOOL_SCHEMA_CHARS,
  TOOL_NAMES,
} from "./limits";

/** One of the page's tools, as the page describes it. */
export interface DemoTool {
  name: string;
  description: string;
  input_schema: Anthropic.Beta.BetaTool.InputSchema;
}

/** What a tool call told the agent. */
export interface DemoToolResult {
  tool_use_id: string;
  content: string;
  is_error: boolean;
}

/**
 * One round already played: what the model said, exactly as this endpoint
 * returned it, and what its tool calls came back with.
 */
export interface DemoTurn {
  assistant: Anthropic.Beta.BetaContentBlockParam[];
  results: DemoToolResult[];
}

export interface TurnRequest {
  goal: string;
  tools: DemoTool[];
  turns: DemoTurn[];
}

export type Parsed = { ok: true; request: TurnRequest } | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const fail = (error: string): Parsed => ({ ok: false, error });

function parseTool(value: unknown): DemoTool | string {
  if (!isRecord(value)) return "A tool is not an object.";
  const { name, description, input_schema: schema } = value;
  if (typeof name !== "string" || !TOOL_NAMES.includes(name)) {
    return "A tool is not one of this demo's.";
  }
  if (typeof description !== "string" || description.length > MAX_TOOL_DESCRIPTION_CHARS) {
    return `The description of ${name} is missing or too long.`;
  }
  if (!isRecord(schema) || schema.type !== "object") {
    return `The schema of ${name} is not an object schema.`;
  }
  if (JSON.stringify(schema).length > MAX_TOOL_SCHEMA_CHARS) {
    return `The schema of ${name} is too long.`;
  }
  return { name, description, input_schema: schema as DemoTool["input_schema"] };
}

function parseTurn(value: unknown): DemoTurn | string {
  if (!isRecord(value)) return "A turn is not an object.";
  const { assistant, results } = value;

  // The model's own blocks go back as they came, thinking included: the API
  // checks them. Here they only have to be blocks, and not enormous.
  if (!Array.isArray(assistant) || assistant.length === 0) return "A turn has no content.";
  if (!assistant.every((block) => isRecord(block) && typeof block.type === "string")) {
    return "A turn's content is not a list of blocks.";
  }
  if (JSON.stringify(assistant).length > MAX_ASSISTANT_TURN_CHARS) return "A turn is too long.";

  const called = (assistant as Record<string, unknown>[])
    .filter((block) => block.type === "tool_use")
    .map((block) => block.id);
  if (called.length === 0) return "A turn that called no tool cannot be continued.";

  if (!Array.isArray(results)) return "A turn has no results.";
  const parsed: DemoToolResult[] = [];
  for (const result of results as unknown[]) {
    if (!isRecord(result)) return "A result is not an object.";
    const { tool_use_id: id, content, is_error: isError } = result;
    if (typeof id !== "string" || typeof content !== "string") return "A result is malformed.";
    if (content.length > MAX_TOOL_RESULT_CHARS) return "A result is too long.";
    parsed.push({ tool_use_id: id, content, is_error: isError === true });
  }

  // Every call answered exactly once, which is also what the API requires.
  const answered = parsed.map((result) => result.tool_use_id);
  const matches =
    answered.length === called.length &&
    new Set(answered).size === answered.length &&
    called.every((id) => typeof id === "string" && answered.includes(id));
  if (!matches) return "A turn's results do not match its tool calls.";

  return { assistant: assistant as DemoTurn["assistant"], results: parsed };
}

/** Checks a request body, and says in one sentence what is wrong with it. */
export function parseTurnRequest(body: unknown): Parsed {
  if (!isRecord(body)) return fail("The request is not an object.");

  const goal = typeof body.goal === "string" ? body.goal.trim() : "";
  if (goal === "") return fail("Say what the agent should do.");
  if (goal.length > MAX_GOAL_CHARS) {
    return fail(`Keep the request under ${String(MAX_GOAL_CHARS)} characters.`);
  }

  if (!Array.isArray(body.tools) || body.tools.length === 0) {
    return fail("The request has no tools.");
  }
  if (body.tools.length > TOOL_NAMES.length) return fail("The request has too many tools.");
  const tools: DemoTool[] = [];
  for (const candidate of body.tools as unknown[]) {
    const tool = parseTool(candidate);
    if (typeof tool === "string") return fail(tool);
    if (tools.some((existing) => existing.name === tool.name)) {
      return fail(`${tool.name} is listed twice.`);
    }
    tools.push(tool);
  }

  if (!Array.isArray(body.turns)) return fail("The request has no turns.");
  if (body.turns.length >= MAX_MODEL_TURNS) {
    return fail(`A run is limited to ${String(MAX_MODEL_TURNS)} steps.`);
  }
  const turns: DemoTurn[] = [];
  for (const candidate of body.turns as unknown[]) {
    const turn = parseTurn(candidate);
    if (typeof turn === "string") return fail(turn);
    turns.push(turn);
  }

  return { ok: true, request: { goal, tools, turns } };
}

/** The conversation a request describes, in the Messages API's shape. */
export function toMessages(request: TurnRequest): Anthropic.Beta.BetaMessageParam[] {
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: request.goal }];
  for (const turn of request.turns) {
    messages.push({ role: "assistant", content: turn.assistant });
    // All of a turn's results in one message: split across several, the model
    // learns to stop calling tools in parallel.
    messages.push({
      role: "user",
      content: turn.results.map((result) => ({
        type: "tool_result" as const,
        tool_use_id: result.tool_use_id,
        content: result.content,
        is_error: result.is_error,
      })),
    });
  }
  return messages;
}
