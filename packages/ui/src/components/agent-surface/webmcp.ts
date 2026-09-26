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
 * Checked against the spec text of 2026-09-26:
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
  /** It is for developer tooling, not for agents acting for a person. */
  debugging?: boolean;
}

export interface WebMCPRegisterOptions {
  /**
   * Origins, beyond the page's own, that may see the tool within the page's
   * frames: the app embedding this one, or one it embeds.
   */
  exposedTo?: readonly string[];
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
    options?: { signal?: AbortSignal; exposedTo?: string[] },
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

const LOOPBACK = /^(localhost|127(\.\d{1,3}){3}|\[::1\])$/;

/**
 * Splits `exposedTo` into origins the browser will accept and the rest.
 *
 * The browser rejects the whole registration if one entry is not a URL or not
 * a potentially trustworthy origin — https, wss, or loopback — so one typo
 * would take the tool away from the page's own agent too. Each entry is
 * reduced to its origin, so a URL with a path names the site it belongs to.
 */
export function checkExposedTo(entries: readonly string[]): {
  origins: string[];
  rejected: string[];
} {
  const origins = new Set<string>();
  const rejected: string[] = [];
  for (const entry of entries) {
    let url: URL;
    try {
      url = new URL(entry);
    } catch {
      rejected.push(entry);
      continue;
    }
    const secure =
      url.protocol === "https:" ||
      url.protocol === "wss:" ||
      LOOPBACK.test(url.hostname) ||
      url.hostname.endsWith(".localhost");
    if (secure && url.origin !== "null") origins.add(url.origin);
    else rejected.push(entry);
  }
  return { origins: [...origins], rejected };
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
export function registerWebMCPTool(
  tool: WebMCPToolDefinition,
  execute: Execute,
  { exposedTo = [] }: WebMCPRegisterOptions = {},
): () => void {
  const context = getModelContext();
  if (!context) return () => undefined;

  const { origins, rejected } = checkExposedTo(exposedTo);
  if (rejected.length > 0 && process.env.NODE_ENV !== "production") {
    console.warn(
      `[agent-surface] "${tool.name}" is not exposed to ${rejected.join(", ")}: ` +
        "exposedTo takes https or loopback origins. The browser would have refused the tool entirely.",
    );
  }

  const controller = new AbortController();
  let handle: { unregister?: () => void } | null = null;

  const report = (error: unknown) => {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[agent-surface] WebMCP did not register "${tool.name}".`, error);
    }
  };

  try {
    const result = context.registerTool(
      { ...tool, execute },
      origins.length > 0
        ? { signal: controller.signal, exposedTo: origins }
        : { signal: controller.signal },
    );
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
