/**
 * The one file that knows about WebMCP.
 *
 * WebMCP lets a page hand its own actions to whatever agent is running in the
 * browser, as tools, instead of that agent guessing at buttons from pixels. It
 * is a W3C community group draft, shipping behind an origin trial, and it has
 * already moved once: the entry point went from `navigator.modelContext` to
 * `document.modelContext`, `provideContext()` and `unregisterTool()` went away
 * in favour of registering one tool at a time and aborting a signal to remove
 * it, and the consent hook (`requestUserInteraction`) was removed pending a
 * replacement.
 *
 * So everything that depends on the draft's shape is here, written to tolerate
 * both the current draft and the one before it, and nothing else in the
 * component touches it. When the draft moves again, this is the file to edit —
 * it is your copy.
 *
 * Checked against the spec text of 2026-09-17:
 * https://github.com/webmachinelearning/webmcp
 */

import type { JsonSchema } from "./tool-input";

/** What a tool call hands back to the agent, in the shape MCP clients expect. */
export interface WebMCPResult {
  content: { type: "text"; text: string }[];
  structuredContent?: unknown;
  isError?: boolean;
}

export interface WebMCPToolAnnotations {
  /** The tool only reads. */
  readOnlyHint?: boolean;
  /** Its output can contain text from users or third parties. */
  untrustedContentHint?: boolean;
  /** It has consequences worth confirming, like sending or deleting. */
  consequentialHint?: boolean;
}

export interface WebMCPToolDefinition {
  name: string;
  title?: string;
  description: string;
  inputSchema?: JsonSchema;
  annotations?: WebMCPToolAnnotations;
}

type Execute = (input: unknown, options?: { signal?: AbortSignal }) => Promise<WebMCPResult>;

interface ModelContextLike {
  registerTool: (
    tool: WebMCPToolDefinition & { execute: Execute },
    options?: { signal?: AbortSignal },
  ) => unknown;
  /** The draft before March 2026. */
  unregisterTool?: (name: string) => void;
}

function hasRegisterTool(candidate: unknown): candidate is ModelContextLike {
  return (
    typeof candidate === "object" &&
    candidate !== null &&
    typeof (candidate as { registerTool?: unknown }).registerTool === "function"
  );
}

/** The browser's model context, if it has one. */
export function getModelContext(): ModelContextLike | null {
  if (typeof document !== "undefined") {
    const current = (document as Document & { modelContext?: unknown }).modelContext;
    if (hasRegisterTool(current)) return current;
  }
  if (typeof navigator !== "undefined") {
    const earlier = (navigator as Navigator & { modelContext?: unknown }).modelContext;
    if (hasRegisterTool(earlier)) return earlier;
  }
  return null;
}

function isHandle(value: unknown): value is { unregister: () => void } {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { unregister?: unknown }).unregister === "function"
  );
}

/** Whether this browser can expose tools to an agent at all. */
export function isWebMCPAvailable(): boolean {
  return getModelContext() !== null;
}

/**
 * Registers one tool and returns the function that removes it.
 *
 * A no-op where WebMCP is missing. Registration failures — a name the browser
 * rejects, a cross-origin frame without `allow="tools"` — are reported in
 * development and otherwise leave the page working without the tool, because a
 * page that throws for want of an experimental API has its priorities wrong.
 */
export function registerWebMCPTool(tool: WebMCPToolDefinition, execute: Execute): () => void {
  const context = getModelContext();
  if (!context) return () => undefined;

  const controller = new AbortController();
  let handle: { unregister?: () => void } | null = null;

  const report = (error: unknown) => {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[agent-surface] WebMCP did not register "${tool.name}".`, error);
    }
  };

  try {
    const result = context.registerTool({ ...tool, execute }, { signal: controller.signal });
    if (result instanceof Promise) {
      result.catch(report);
    } else if (isHandle(result)) {
      // An early draft returned a handle rather than taking a signal.
      handle = result;
    }
  } catch (error) {
    report(error);
    return () => undefined;
  }

  return () => {
    controller.abort();
    try {
      if (handle?.unregister) handle.unregister();
      else context.unregisterTool?.(tool.name);
    } catch {
      // Already gone. Removal is best effort by design.
    }
  };
}
