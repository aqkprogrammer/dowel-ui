import { readFileSync } from "node:fs";
import { join } from "node:path";
import { registryIndexSchema, type RegistryIndex } from "@dowel-ui/registry";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { makePlan } from "../src/commands/plan";
import { CliError } from "../src/lib/errors";
import { DEFAULT_MODEL, planWithModel, systemPrompt } from "../src/lib/model-planner";
import { LOCAL_REGISTRY } from "./fixtures";

/**
 * The planners, against the registry built in this commit. The model is never
 * called: the SDK is replaced with a stand-in that records the request and
 * returns whatever a test needs it to, so these run offline and cost nothing.
 */

const index: RegistryIndex = registryIndexSchema.parse(
  JSON.parse(readFileSync(join(LOCAL_REGISTRY, "index.json"), "utf8")),
);

const sdk = vi.hoisted(() => {
  const state = {
    requests: [] as Record<string, unknown>[],
    reply: {} as Record<string, unknown>,
    error: undefined as Error | undefined,
  };
  class APIError extends Error {}
  class AnthropicError extends Error {}
  class AuthenticationError extends APIError {}
  class RateLimitError extends APIError {}
  class FakeAnthropic {
    static APIError = APIError;
    static AnthropicError = AnthropicError;
    static AuthenticationError = AuthenticationError;
    static RateLimitError = RateLimitError;
    beta = {
      messages: {
        parse: (params: Record<string, unknown>) => {
          state.requests.push(params);
          return state.error ? Promise.reject(state.error) : Promise.resolve(state.reply);
        },
      },
    };
  }
  return { state, FakeAnthropic };
});

vi.mock("@anthropic-ai/sdk", () => ({ default: sdk.FakeAnthropic }));
vi.mock("@anthropic-ai/sdk/helpers/beta/zod", () => ({
  betaZodOutputFormat: () => ({ type: "json_schema" }),
}));

beforeEach(() => {
  sdk.state.requests.length = 0;
  sdk.state.error = undefined;
});

function reply(picks: { name: string; because: string }[], stop = "end_turn") {
  sdk.state.reply = { stop_reason: stop, parsed_output: { picks } };
}

describe("the built-in planner", () => {
  it("plans without a model, credentials or network beyond the registry", async () => {
    const { plan, by } = await makePlan(
      "a billing page with usage and invoices",
      index,
      undefined,
    );
    expect(by).toBe("the built-in planner");
    expect(plan.install).toContain("billing");
    expect(sdk.state.requests).toHaveLength(0);
  });
});

describe("systemPrompt", () => {
  it("is the same for the same registry, so it can be cached", () => {
    expect(systemPrompt(index)).toBe(systemPrompt(index));
  });

  it("carries every component and block, with its guidance", () => {
    const prompt = systemPrompt(index);
    const select = index.items.find((entry) => entry.name === "select");
    expect(prompt).toContain("- select (component, form):");
    expect(prompt).toContain(select?.guidance?.useWhen[0] ?? "");
    expect(prompt).not.toContain("- utils (");
  });
});

describe("planWithModel", () => {
  it("asks the default model, with fallbacks on and the catalogue cached", async () => {
    reply([{ name: "billing", because: "the page" }]);
    await planWithModel("a billing page", index);

    const request = sdk.state.requests[0] ?? {};
    expect(request.model).toBe(DEFAULT_MODEL);
    expect(request.fallbacks).toBe("default");
    expect(request.betas).toEqual(["server-side-fallback-2026-07-01"]);
    expect(JSON.stringify(request.system)).toContain('"cache_control":{"type":"ephemeral"}');
  });

  it("drops what the model invents, and says what it dropped", async () => {
    reply([
      { name: "billing", because: "the page" },
      { name: "invoice-table-pro", because: "invented" },
    ]);
    const { plan, unknown } = await planWithModel("a billing page", index);
    expect(plan.install).toEqual(["billing"]);
    expect(unknown).toEqual(["invoice-table-pro"]);
  });

  it("uses the model it is given", async () => {
    reply([{ name: "button", because: "x" }]);
    await planWithModel("a button", index, "claude-sonnet-5-5");
    expect(sdk.state.requests[0]?.model).toBe("claude-sonnet-5-5");
  });

  it("reports a refusal rather than an empty plan", async () => {
    reply([], "refusal");
    await expect(planWithModel("x", index)).rejects.toThrow(/declined/);
  });

  it("reports an answer that did not parse", async () => {
    sdk.state.reply = { stop_reason: "end_turn", parsed_output: null };
    await expect(planWithModel("x", index)).rejects.toThrow(CliError);
  });

  it("names the credential problem when the SDK cannot authenticate", async () => {
    // What @anthropic-ai/sdk 0.131.0 actually throws with no credentials: a
    // plain Error, not one of its own classes.
    sdk.state.error = new Error("Could not resolve authentication method.");
    await expect(planWithModel("x", index)).rejects.toThrow(/Could not call the Anthropic API/);

    sdk.state.error = new sdk.FakeAnthropic.AuthenticationError("401");
    await expect(planWithModel("x", index)).rejects.toThrow(/did not accept the credentials/);
  });
});
