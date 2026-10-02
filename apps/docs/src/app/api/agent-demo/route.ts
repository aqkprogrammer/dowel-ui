import Anthropic from "@anthropic-ai/sdk";

import { MAX_BODY_BYTES } from "~/lib/agent-demo/limits";
import { demoConfig, runTurn } from "~/lib/agent-demo/model";
import { createRateLimiter } from "~/lib/agent-demo/rate-limit";
import { parseTurnRequest } from "~/lib/agent-demo/request";

/**
 * The agent demo's one server-side piece: a model turn.
 *
 * `GET` says whether a model is connected, so the page knows whether to run
 * the real loop or its script. `POST` plays one turn.
 *
 * Anyone can reach this and every request costs money, so it accepts only
 * the demo's own shape (`parseTurnRequest`), from this site's own pages, at a
 * limited rate. With no `ANTHROPIC_API_KEY`, or with `AGENT_DEMO=off`, it
 * refuses and the page plays the scripted run instead.
 */
export const dynamic = "force-dynamic";
/** A turn is a few seconds; this is the ceiling for a slow one. */
export const maxDuration = 60;

const WINDOW_MS = 10 * 60 * 1000;
/** About three full runs per visitor per window. */
const perVisitor = createRateLimiter(40, WINDOW_MS);
/** Across everyone, per server instance. */
const overall = createRateLimiter(400, WINDOW_MS);

function json(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return Response.json(body, { status, headers: { "cache-control": "no-store", ...headers } });
}

export function GET(): Response {
  // The mode and nothing else: not the model, and never anything of the key.
  return json(200, { mode: demoConfig().mode });
}

export async function POST(request: Request): Promise<Response> {
  const config = demoConfig();
  if (config.mode !== "model") {
    return json(503, { error: "No model is connected to this demo." });
  }

  // A browser on another site sends its own Origin. This does not stop a
  // script, which can send any header; the caps and the rate limit do that.
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== request.headers.get("host")) {
    return json(403, { error: "This endpoint only serves this site's demo." });
  }

  const visitor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  for (const [limiter, key] of [
    [perVisitor, visitor],
    [overall, "all"],
  ] as const) {
    const taken = limiter.take(key);
    if (!taken.allowed) {
      return json(
        429,
        { error: "The demo is busy. Try again in a few minutes." },
        { "retry-after": String(taken.retryAfter) },
      );
    }
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return json(413, { error: "The request is too large." });
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json(400, { error: "The request is not JSON." });
  }
  const parsed = parseTurnRequest(body);
  if (!parsed.ok) return json(400, { error: parsed.error });

  try {
    return json(200, await runTurn(parsed.request, config));
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      return json(429, { error: "The model is busy. Try again in a minute." });
    }
    if (error instanceof Anthropic.AuthenticationError) {
      console.error("[agent-demo] The API key was rejected.");
      return json(503, { error: "No model is connected to this demo." });
    }
    if (error instanceof Anthropic.BadRequestError) {
      // The request passed this route's checks and the API still refused it:
      // a bug here, or a conversation the page sent back altered.
      console.error("[agent-demo] The API rejected the request:", error.message);
      return json(400, { error: "The model could not continue this run. Start a new one." });
    }
    if (error instanceof Anthropic.APIError) {
      console.error(`[agent-demo] API error ${String(error.status)}:`, error.message);
      return json(502, { error: "The model did not answer. Try again." });
    }
    throw error;
  }
}
