import Anthropic from "@anthropic-ai/sdk";

import { toMessages, type TurnRequest } from "./request";

/**
 * One model turn for the agent demo.
 *
 * The model never touches the page. It is told what the person asked and
 * which tools the page offered, and it answers with tool calls; the page runs
 * them through its `agent-surface`, where the person can take over, approve
 * or undo, and sends the results back for the next turn. So this is one
 * stateless request per turn, and the conversation lives in the browser.
 */

/** What the demo is configured to do. Never includes the key. */
export interface DemoConfig {
  /** `model` when a real model answers; `scripted` when the page plays a script. */
  mode: "model" | "scripted";
  model: string;
}

/**
 * Claude Opus 5.5 unless the deployment names another. An override has to be
 * a model that takes adaptive thinking and `effort`, as the request below
 * sends both.
 */
const DEFAULT_MODEL = "claude-opus-5-5";

export function demoConfig(env: Record<string, string | undefined> = process.env): DemoConfig {
  const model = env.AGENT_DEMO_MODEL?.trim() || DEFAULT_MODEL;
  // AGENT_DEMO=off is the switch for turning spending off without a deploy
  // that removes the key.
  const live = Boolean(env.ANTHROPIC_API_KEY) && env.AGENT_DEMO !== "off";
  return { mode: live ? "model" : "scripted", model };
}

const SYSTEM = `You are operating one page of a small CRM for the person who is looking at it. The page has handed you its own actions as tools. Calling one does exactly what the person's click or keystroke would, and they watch it happen.

Do what the person asked, and only that. Read the table before you change it, so that you act on what is there. Use the fewest calls that do the job.

The person stays in charge of the page:
- They can take control at any moment. A call made while they hold control is refused, and its result says so. When they hand control back, the result may carry a note from them. Treat the note as their latest instruction, and read the page again before you continue, because they may have changed it.
- Some actions wait for their approval. If they decline, or change the details before approving, accept that. Do not ask again, and do not look for another way to the same effect.
- A result may begin with a notice about something they did, such as undoing one of your actions. Do not redo what they undid.

When you have finished, or cannot go further, reply in one or two plain sentences that say what you did and what you left undone. No lists and no markdown.

You can only operate this page. If the request is about anything else, say so in one sentence and stop.`;

/** How a turn ended, in the page's terms. */
export type TurnStop = "tool_use" | "end" | "refusal" | "max_tokens";

export interface TurnReply {
  /** The model's blocks, to be sent back unchanged with the next request. */
  content: Anthropic.Beta.BetaContentBlock[];
  stop: TurnStop;
}

/** The part of the SDK this needs, so a test can stand in for it. */
export interface MessagesClient {
  beta: {
    messages: {
      create: (
        params: Anthropic.Beta.MessageCreateParamsNonStreaming,
      ) => Promise<Anthropic.Beta.BetaMessage>;
    };
  };
}

export async function runTurn(
  request: TurnRequest,
  config: DemoConfig,
  client: MessagesClient = new Anthropic(),
): Promise<TurnReply> {
  const response = await client.beta.messages.create({
    model: config.model,
    // Room for a few tool calls and a two-sentence reply. A turn that needs
    // more is reported to the page as cut short, not retried.
    max_tokens: 4096,
    system: SYSTEM,
    tools: request.tools,
    messages: toMessages(request),
    thinking: { type: "adaptive" },
    // Sorting, filtering and selecting a five-row table is routine work.
    output_config: { effort: "low" },
    // The system prompt and tools are the same on every turn of every run.
    cache_control: { type: "ephemeral" },
    // If a safety classifier declines the turn, retry it on the model
    // Anthropic recommends for that category instead of ending the run.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
  });

  const stop: TurnStop =
    response.stop_reason === "refusal"
      ? "refusal"
      : response.stop_reason === "tool_use"
        ? "tool_use"
        : response.stop_reason === "max_tokens"
          ? "max_tokens"
          : "end";

  // A refused turn has nothing the page should act on or send back.
  return { content: stop === "refusal" ? [] : response.content, stop };
}
