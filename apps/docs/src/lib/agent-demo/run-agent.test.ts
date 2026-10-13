import type { AgentToolDefinition, AgentToolResult } from "@dowel-ui/react/agent-surface";
import { describe, expect, it, vi } from "vitest";

import { MAX_MODEL_TURNS, MAX_TOOL_RESULT_CHARS } from "./limits";
import type { TurnReply } from "./model";
import type { TurnRequest } from "./request";
import { describeTools, runAgent, runScript, type AgentEvent, type Surface } from "./run-agent";

const DEFINITIONS: AgentToolDefinition[] = [
  {
    name: "crm_list_deals",
    description: "The deals shown.",
    inputSchema: { type: "object", properties: {} },
    annotations: {},
    effect: "read",
    reversibility: "revertible",
  },
  {
    name: "crm_email_owners",
    description: "Email the owners.",
    annotations: {},
    effect: "write",
    reversibility: "irreversible",
  },
];

type Holder = ReturnType<Surface["getHolder"]>;

/** A surface that answers calls from a function, and a person who can take over. */
function fakeSurface(answer: (name: string) => AgentToolResult) {
  let holder: Holder = "shared";
  let handBack: ((note: string | undefined) => void) | undefined;
  const calls: string[] = [];

  const api: Surface = {
    getHolder: () => holder,
    tools: () => DEFINITIONS,
    grant: vi.fn(() => {
      holder = "agent";
    }),
    release: vi.fn(() => {
      holder = "shared";
    }),
    call: (name) => {
      calls.push(name);
      return Promise.resolve(answer(name));
    },
  };

  return {
    api,
    calls,
    takeOver: () => {
      holder = "person";
    },
    handBack: (note?: string) => {
      holder = "agent";
      handBack?.(note);
    },
    waitForHandBack: () =>
      new Promise<string | undefined>((resolve) => {
        handBack = resolve;
      }),
  };
}

const done = (text: string): AgentToolResult => ({ ok: true, status: "done", text });

const use = (id: string, name: string) =>
  ({ type: "tool_use", id, name, input: {} }) as TurnReply["content"][number];
const text = (value: string) => ({ type: "text", text: value }) as TurnReply["content"][number];

/** A model that plays the given replies in order. */
function fakeModel(replies: TurnReply[]) {
  const requests: TurnRequest[] = [];
  const turn = (request: TurnRequest) => {
    // The loop reuses its turns array, so keep what it held at this moment.
    requests.push(structuredClone(request));
    const reply = replies[requests.length - 1];
    if (!reply) throw new Error("The fake model ran out of replies.");
    return Promise.resolve(reply);
  };
  return { turn, requests };
}

function collect() {
  const events: AgentEvent[] = [];
  return { events, onEvent: (event: AgentEvent) => events.push(event) };
}

const signal = () => new AbortController().signal;

describe("describeTools", () => {
  it("tells the model which tools only read and which wait for approval", () => {
    expect(describeTools(DEFINITIONS)).toEqual([
      {
        name: "crm_list_deals",
        description: "The deals shown. Only reads.",
        input_schema: { type: "object", properties: {} },
      },
      {
        name: "crm_email_owners",
        description:
          "Email the owners. Cannot be undone, so the person is asked to approve it first.",
        input_schema: { type: "object", properties: {} },
      },
    ]);
  });
});

describe("runAgent", () => {
  it("runs the model's calls through the surface and sends the results back", async () => {
    const surface = fakeSurface(() => done("5 deals."));
    const model = fakeModel([
      { stop: "tool_use", content: [text("Reading."), use("c1", "crm_list_deals")] },
      { stop: "end", content: [text("There are five deals.")] },
    ]);
    const { events, onEvent } = collect();

    await runAgent({
      ...surface,
      goal: "How many deals?",
      signal: signal(),
      onEvent,
      ...model,
    });

    expect(surface.calls).toEqual(["crm_list_deals"]);
    expect(model.requests[0]).toMatchObject({ goal: "How many deals?", turns: [] });
    expect(model.requests[1]?.turns).toEqual([
      {
        assistant: [text("Reading."), use("c1", "crm_list_deals")],
        results: [{ tool_use_id: "c1", content: "5 deals.", is_error: false }],
      },
    ]);
    expect(events).toEqual([
      { type: "say", text: "Reading." },
      { type: "say", text: "There are five deals." },
      { type: "done", reason: "finished" },
    ]);
    expect(surface.api.grant).toHaveBeenCalledOnce();
    expect(surface.api.release).toHaveBeenCalledOnce();
  });

  it("answers every call of a turn in one result list, marking failures", async () => {
    const surface = fakeSurface((name) =>
      name === "crm_email_owners"
        ? { ok: false, status: "failed", text: "No deals are selected." }
        : done("ok"),
    );
    const model = fakeModel([
      {
        stop: "tool_use",
        content: [use("c1", "crm_list_deals"), use("c2", "crm_email_owners")],
      },
      { stop: "end", content: [] },
    ]);

    await runAgent({ ...surface, goal: "g", signal: signal(), ...collect(), ...model });

    expect(model.requests[1]?.turns[0]?.results).toEqual([
      { tool_use_id: "c1", content: "ok", is_error: false },
      { tool_use_id: "c2", content: "No deals are selected.", is_error: true },
    ]);
  });

  it("waits for the hand-back when the person takes over, and passes on their note", async () => {
    const surface = fakeSurface(() => ({
      ok: false,
      status: "refused",
      text: "The person has taken control of this page.",
    }));
    const model = fakeModel([
      { stop: "tool_use", content: [use("c1", "crm_email_owners")] },
      { stop: "end", content: [text("I left the emails unsent.")] },
    ]);
    const { events, onEvent } = collect();

    const run = runAgent({ ...surface, goal: "g", signal: signal(), onEvent, ...model });
    surface.takeOver();
    await vi.waitFor(() => {
      expect(events).toContainEqual({ type: "waiting" });
    });
    // The model is not asked again while the person holds the page.
    expect(model.requests).toHaveLength(1);

    surface.handBack("Only email Echo.");
    await run;

    expect(model.requests[1]?.turns[0]?.results[0]).toEqual({
      tool_use_id: "c1",
      is_error: true,
      content:
        "The person has taken control of this page.\n\n" +
        'The person has now handed control back, with this note: "Only email Echo.". ' +
        "This call did not run. Read the page again before deciding what to do next.",
    });
    expect(events).toContainEqual({ type: "resumed", note: "Only email Echo." });
  });

  it("does not treat a declined approval as a take-over", async () => {
    const surface = fakeSurface(() => ({ ok: false, status: "refused", text: "Declined." }));
    const model = fakeModel([
      { stop: "tool_use", content: [use("c1", "crm_email_owners")] },
      { stop: "end", content: [] },
    ]);
    const { events, onEvent } = collect();

    await runAgent({ ...surface, goal: "g", signal: signal(), onEvent, ...model });

    expect(events).not.toContainEqual({ type: "waiting" });
    expect(model.requests[1]?.turns[0]?.results[0]?.content).toBe("Declined.");
  });

  it("runs nothing from a reply that was cut short or refused", async () => {
    for (const [stop, reason] of [
      ["max_tokens", "cut-short"],
      ["refusal", "refused"],
    ] as const) {
      const surface = fakeSurface(() => done("ok"));
      const model = fakeModel([{ stop, content: [use("c1", "crm_email_owners")] }]);
      const { events, onEvent } = collect();

      await runAgent({ ...surface, goal: "g", signal: signal(), onEvent, ...model });

      expect(surface.calls).toEqual([]);
      expect(events.at(-1)).toEqual({ type: "done", reason });
    }
  });

  it("stops a run that keeps calling tools", async () => {
    const surface = fakeSurface(() => done("ok"));
    const replies = Array.from({ length: MAX_MODEL_TURNS + 1 }, (_, index) => ({
      stop: "tool_use" as const,
      content: [use(`c${String(index)}`, "crm_list_deals")],
    }));
    const model = fakeModel(replies);
    const { events, onEvent } = collect();

    await runAgent({ ...surface, goal: "g", signal: signal(), onEvent, ...model });

    expect(model.requests).toHaveLength(MAX_MODEL_TURNS);
    expect(events.at(-1)).toEqual({ type: "done", reason: "limit" });
  });

  it("clips a result too long for the endpoint to accept", async () => {
    const surface = fakeSurface(() => done("x".repeat(MAX_TOOL_RESULT_CHARS * 2)));
    const model = fakeModel([
      { stop: "tool_use", content: [use("c1", "crm_list_deals")] },
      { stop: "end", content: [] },
    ]);

    await runAgent({ ...surface, goal: "g", signal: signal(), ...collect(), ...model });

    const sent = model.requests[1]?.turns[0]?.results[0]?.content ?? "";
    expect(sent.length).toBeLessThanOrEqual(MAX_TOOL_RESULT_CHARS);
    expect(sent.endsWith("(cut short)")).toBe(true);
  });

  it("reports a failed request, and still lets go of the page", async () => {
    const surface = fakeSurface(() => done("ok"));
    const { events, onEvent } = collect();

    await runAgent({
      ...surface,
      goal: "g",
      signal: signal(),
      onEvent,
      turn: () => Promise.reject(new Error("The demo is busy. Try again in a few minutes.")),
    });

    expect(events).toEqual([
      {
        type: "done",
        reason: "error",
        message: "The demo is busy. Try again in a few minutes.",
      },
    ]);
    expect(surface.api.release).toHaveBeenCalledOnce();
  });

  it("says stopped when the person stops it, and leaves the page with them if they hold it", async () => {
    const surface = fakeSurface(() => done("ok"));
    const controller = new AbortController();
    const { events, onEvent } = collect();

    const run = runAgent({
      ...surface,
      goal: "g",
      signal: controller.signal,
      onEvent,
      turn: (_request, abort) =>
        new Promise((_resolve, reject) => {
          abort.addEventListener("abort", () => {
            reject(new DOMException("Stopped", "AbortError"));
          });
        }),
    });
    surface.takeOver();
    controller.abort();
    await run;

    expect(events).toEqual([{ type: "done", reason: "stopped" }]);
    expect(surface.api.release).not.toHaveBeenCalled();
  });
});

describe("runScript", () => {
  it("plays its steps, and repeats one the person interrupted once they hand back", async () => {
    let refuse = true;
    const surface = fakeSurface(() =>
      refuse ? { ok: false, status: "refused", text: "Taken over." } : done("ok"),
    );
    const { events, onEvent } = collect();

    const run = runScript([{ say: "Starting." }, { tool: "crm_list_deals" }], {
      ...surface,
      signal: signal(),
      onEvent,
      stepMs: 0,
    });
    surface.takeOver();
    await vi.waitFor(() => {
      expect(events).toContainEqual({ type: "waiting" });
    });
    refuse = false;
    surface.handBack();
    await run;

    expect(surface.calls).toEqual(["crm_list_deals", "crm_list_deals"]);
    expect(events.at(-1)).toEqual({ type: "done", reason: "finished" });
  });
});
