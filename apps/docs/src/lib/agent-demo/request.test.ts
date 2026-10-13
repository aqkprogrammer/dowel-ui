import { describe, expect, it } from "vitest";

import { MAX_GOAL_CHARS, MAX_MODEL_TURNS, MAX_TOOL_RESULT_CHARS } from "./limits";
import { parseTurnRequest, toMessages } from "./request";

const tool = {
  name: "crm_list_deals",
  description: "The deals currently shown.",
  input_schema: { type: "object", properties: {} },
};

const turn = {
  assistant: [
    { type: "thinking", thinking: "", signature: "sig" },
    { type: "text", text: "Reading the table." },
    { type: "tool_use", id: "call_1", name: "crm_list_deals", input: {} },
  ],
  results: [{ tool_use_id: "call_1", content: '{"deals":[]}' }],
};

const body = (overrides: Record<string, unknown> = {}) => ({
  goal: "Which deal is the largest?",
  tools: [tool],
  turns: [],
  ...overrides,
});

const errorOf = (value: unknown) => {
  const parsed = parseTurnRequest(value);
  return parsed.ok ? null : parsed.error;
};

describe("parseTurnRequest", () => {
  it("accepts a first request and a continued one", () => {
    expect(parseTurnRequest(body())).toMatchObject({ ok: true });
    const continued = parseTurnRequest(body({ turns: [turn] }));
    expect(continued).toMatchObject({
      ok: true,
      request: { turns: [{ results: [{ tool_use_id: "call_1", is_error: false }] }] },
    });
  });

  it("trims the goal, and refuses an empty or long one", () => {
    expect(parseTurnRequest(body({ goal: "  Sort by amount.  " }))).toMatchObject({
      request: { goal: "Sort by amount." },
    });
    expect(errorOf(body({ goal: "   " }))).toBe("Say what the agent should do.");
    expect(errorOf(body({ goal: "x".repeat(MAX_GOAL_CHARS + 1) }))).toContain("under");
  });

  it("accepts only this demo's tools, once each", () => {
    expect(errorOf(body({ tools: [{ ...tool, name: "run_shell" }] }))).toBe(
      "A tool is not one of this demo's.",
    );
    expect(errorOf(body({ tools: [tool, tool] }))).toBe("crm_list_deals is listed twice.");
    expect(errorOf(body({ tools: [] }))).toBe("The request has no tools.");
  });

  it("refuses a tool description or schema long enough to carry a prompt", () => {
    expect(errorOf(body({ tools: [{ ...tool, description: "x".repeat(601) }] }))).toContain(
      "too long",
    );
    const schema = { type: "object", properties: { text: { description: "x".repeat(2100) } } };
    expect(errorOf(body({ tools: [{ ...tool, input_schema: schema }] }))).toContain("too long");
  });

  it("caps how many turns a run can have", () => {
    const turns = Array.from({ length: MAX_MODEL_TURNS }, () => turn);
    expect(errorOf(body({ turns }))).toBe(
      `A run is limited to ${String(MAX_MODEL_TURNS)} steps.`,
    );
  });

  it("requires every tool call to be answered exactly once", () => {
    expect(errorOf(body({ turns: [{ ...turn, results: [] }] }))).toContain("do not match");
    const twice = [turn.results[0], turn.results[0]];
    expect(errorOf(body({ turns: [{ ...turn, results: twice }] }))).toContain("do not match");
    const other = [{ tool_use_id: "call_9", content: "x" }];
    expect(errorOf(body({ turns: [{ ...turn, results: other }] }))).toContain("do not match");
  });

  it("refuses a turn that called nothing, and a result that is too long", () => {
    const said = { assistant: [{ type: "text", text: "Done." }], results: [] };
    expect(errorOf(body({ turns: [said] }))).toBe(
      "A turn that called no tool cannot be continued.",
    );
    const long = [{ tool_use_id: "call_1", content: "x".repeat(MAX_TOOL_RESULT_CHARS + 1) }];
    expect(errorOf(body({ turns: [{ ...turn, results: long }] }))).toBe(
      "A result is too long.",
    );
  });

  it.each([null, [], "text", 4])("refuses %j", (value) => {
    expect(errorOf(value)).toBe("The request is not an object.");
  });
});

describe("toMessages", () => {
  it("sends the model's blocks back unchanged, and a turn's results in one message", () => {
    const parsed = parseTurnRequest(body({ turns: [turn] }));
    if (!parsed.ok) throw new Error(parsed.error);
    const messages = toMessages(parsed.request);

    expect(messages).toHaveLength(3);
    expect(messages[0]).toEqual({ role: "user", content: "Which deal is the largest?" });
    expect(messages[1]).toEqual({ role: "assistant", content: turn.assistant });
    expect(messages[2]).toEqual({
      role: "user",
      content: [
        {
          type: "tool_result",
          tool_use_id: "call_1",
          content: '{"deals":[]}',
          is_error: false,
        },
      ],
    });
  });
});
