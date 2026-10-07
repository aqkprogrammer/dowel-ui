import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

import {
  planFromPicks,
  type PicksResult,
  type RegistryIndex,
  type RegistryIndexEntry,
} from "@dowel-ui/registry";

import { CliError } from "./errors";

/**
 * Planning a screen with a model, held to the registry.
 *
 * The deterministic planner matches words; a model can read "a page where
 * support agents triage tickets with an assistant" and know it wants a data
 * table, filters and a chat panel. What it cannot be trusted to do is stay
 * inside the catalogue, so the division of labour is fixed: the model chooses
 * from the catalogue it is given, and `planFromPicks` drops anything that is
 * not in it and says so. The guarantee every plan carries — it cannot name a
 * component that does not exist — holds whoever does the choosing.
 *
 * Opt-in, with the person's own credentials, and nothing is sent anywhere but
 * the Anthropic API: the prompt and the public catalogue, never project files.
 */

export const DEFAULT_MODEL = "claude-opus-5-5";

const picksSchema = z.object({
  picks: z
    .array(
      z.object({
        name: z.string().describe("A registry name from the catalogue, exactly as written"),
        because: z.string().describe("Why, in a short phrase tied to the request"),
      }),
    )
    .describe("Blocks first, then components no chosen block already installs"),
});

function catalogueLine(entry: RegistryIndexEntry): string {
  const kind = entry.type === "registry:block" ? "block" : "component";
  const parts = [`${entry.name} (${kind}, ${entry.category}): ${entry.description}`];
  if (entry.guidance) {
    parts.push(`Use for: ${entry.guidance.useWhen.join("; ")}.`);
    if (entry.guidance.avoidWhen.length > 0) {
      parts.push(`Not for: ${entry.guidance.avoidWhen.join("; ")}.`);
    }
  }
  if (entry.registryDependencies.length > 0 && entry.type === "registry:block") {
    parts.push(`Installs: ${entry.registryDependencies.join(", ")}.`);
  }
  return `- ${parts.join(" ")}`;
}

/**
 * The instructions and the catalogue.
 *
 * One stable block, built only from the index, so it is identical for every
 * request against the same registry and the prompt cache can reuse it.
 */
export function systemPrompt(index: RegistryIndex): string {
  const entries = index.items
    .filter((entry) => entry.type === "registry:ui" || entry.type === "registry:block")
    .filter((entry) => entry.deprecated === undefined)
    .sort((a, b) => a.name.localeCompare(b.name));

  return [
    "You choose components from a React design system's catalogue to build a screen someone describes.",
    "",
    "Rules:",
    "- Choose only names that appear in the catalogue below, spelled exactly as written. If nothing fits part of the request, leave it out; do not invent a name.",
    "- Prefer a block when one covers the screen or a large part of it. A block installs the components listed after it; do not choose those separately.",
    "- Use each item's 'Use for' and 'Not for' notes to decide between similar items.",
    "- Choose at most 3 blocks and 8 components. Fewer is better when fewer cover the request.",
    "- Give each choice a short reason tied to the words of the request.",
    "",
    `Catalogue (${index.generatedFrom}):`,
    ...entries.map(catalogueLine),
  ].join("\n");
}

/** Loaded only when asked for, so the CLI does not ship an SDK nobody uses. */
async function loadSdk(): Promise<typeof Anthropic> {
  try {
    return (await import("@anthropic-ai/sdk")).default;
  } catch {
    throw new CliError(
      "--model needs the Anthropic SDK, which is not installed alongside the CLI.",
      "Install it in the project (`npm i -D @anthropic-ai/sdk`), or run without --model for the built-in planner.",
    );
  }
}

export async function planWithModel(
  prompt: string,
  index: RegistryIndex,
  model: string = DEFAULT_MODEL,
): Promise<PicksResult> {
  const Sdk = await loadSdk();
  const { betaZodOutputFormat } = await import("@anthropic-ai/sdk/helpers/beta/zod");
  const client = new Sdk();

  let message;
  try {
    message = await client.beta.messages.parse({
      model,
      max_tokens: 16000,
      // A declined request is re-run on another model inside the same call,
      // rather than leaving the person with nothing.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: [
        { type: "text", text: systemPrompt(index), cache_control: { type: "ephemeral" } },
      ],
      messages: [{ role: "user", content: prompt }],
      output_config: { effort: "medium", format: betaZodOutputFormat(picksSchema) },
    });
  } catch (error) {
    if (error instanceof Sdk.AuthenticationError) {
      throw new CliError(
        "The Anthropic API did not accept the credentials it found.",
        "Set ANTHROPIC_API_KEY, or sign in with `ant auth login`.",
      );
    }
    if (error instanceof Sdk.RateLimitError) {
      throw new CliError("The Anthropic API is rate limiting this key.", "Try again shortly.");
    }
    if (error instanceof Sdk.APIError) {
      throw new CliError(`The Anthropic API returned an error: ${error.message}`);
    }
    // Raised before any request is sent, most often because no credentials
    // were found in the environment or an `ant` profile — for which the SDK
    // throws a plain Error, not one of its own classes. Only the SDK call is
    // inside this try, so anything else it throws is reported the same way.
    if (error instanceof Error) {
      throw new CliError(
        `Could not call the Anthropic API: ${error.message}`,
        "Set ANTHROPIC_API_KEY, or sign in with `ant auth login`. Without --model, the built-in planner needs none.",
      );
    }
    throw error;
  }

  if (message.stop_reason === "refusal") {
    throw new CliError(
      "The model declined to plan this.",
      "Try rephrasing, or run without --model.",
    );
  }
  if (!message.parsed_output) {
    throw new CliError(
      "The model's answer did not match the shape asked for.",
      "Try again, or run without --model.",
    );
  }

  return planFromPicks(prompt, index, message.parsed_output.picks);
}
