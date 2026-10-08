import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";

import { demoConfig, runTurn, type MessagesClient } from "./model";
import type { TurnRequest } from "./request";

const request: TurnRequest = {
  goal: "Sort by amount.",
  tools: [
    {
      name: "crm_sort_deals",
      description: "Sort the table.",
      input_schema: { type: "object", properties: {} },
    },
  ],
  turns: [],
};

function fakeClient(reply: Partial<Anthropic.Beta.BetaMessage>) {
  const create = vi.fn((_params: Anthropic.Beta.MessageCreateParamsNonStreaming) =>
    Promise.resolve(reply as Anthropic.Beta.BetaMessage),
  );
  return { client: { beta: { messages: { create } } } as MessagesClient, create };
}

const config = { mode: "model", model: "claude-opus-5-5" } as const;

describe("demoConfig", () => {
  it("plays the script when there is no key", () => {
    expect(demoConfig({})).toEqual({ mode: "scripted", model: "claude-opus-5-5" });
  });

  it("uses the model when there is a key, unless switched off", () => {
    expect(demoConfig({ ANTHROPIC_API_KEY: "k" }).mode).toBe("model");
    expect(demoConfig({ ANTHROPIC_API_KEY: "k", AGENT_DEMO: "off" }).mode).toBe("scripted");
  });

  it("takes another model from the environment", () => {
    expect(demoConfig({ AGENT_DEMO_MODEL: " claude-sonnet-5-5 " }).model).toBe(
      "claude-sonnet-5-5",
    );
  });
});

describe("runTurn", () => {
  it("asks with the fixed system prompt, the page's tools and a fallback", async () => {
    const { client, create } = fakeClient({ stop_reason: "end_turn", content: [] });
    await runTurn(request, config, client);

    const params = create.mock.calls[0]?.[0] as unknown as Record<string, unknown>;
    expect(params).toMatchObject({
      model: "claude-opus-5-5",
      tools: request.tools,
      messages: [{ role: "user", content: "Sort by amount." }],
      thinking: { type: "adaptive" },
      output_config: { effort: "low" },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });
    expect(params.system).toContain("You can only operate this page.");
    // Forced tool use is a 400 on this model.
    expect(params).not.toHaveProperty("tool_choice");
  });

  it("returns the model's blocks as they came when it calls a tool", async () => {
    const content = [
      { type: "thinking", thinking: "", signature: "sig" },
      { type: "tool_use", id: "call_1", name: "crm_sort_deals", input: { column: "amount" } },
    ] as Anthropic.Beta.BetaContentBlock[];
    const { client } = fakeClient({ stop_reason: "tool_use", content });
    expect(await runTurn(request, config, client)).toEqual({ content, stop: "tool_use" });
  });

  it("reports a refusal with nothing to act on", async () => {
    const { client } = fakeClient({
      stop_reason: "refusal",
      content: [{ type: "text", text: "partial" }] as Anthropic.Beta.BetaContentBlock[],
    });
    expect(await runTurn(request, config, client)).toEqual({ content: [], stop: "refusal" });
  });

  it.each([
    ["end_turn", "end"],
    ["max_tokens", "max_tokens"],
    ["stop_sequence", "end"],
  ] as const)("maps %s to %s", async (reason, stop) => {
    const { client } = fakeClient({ stop_reason: reason, content: [] });
    expect((await runTurn(request, config, client)).stop).toBe(stop);
  });
});
