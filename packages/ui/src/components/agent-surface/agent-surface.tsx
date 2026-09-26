"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type ReactNode,
  type Ref,
  type SyntheticEvent,
} from "react";

import { cn } from "@/lib/utils";

import { runTool, undoCall, type CallRuntime } from "./agent-call";
import {
  annotate,
  DEFAULT_LABELS,
  TOOL_NAME,
  type AgentSurfaceApi,
  type AgentSurfaceLabels,
  type AgentTool,
  type AgentToolCall,
  type AgentToolDefinition,
  type ApprovalHandler,
  type ControlChange,
  type ControlEvent,
  type ControlHolder,
} from "./agent-tools";
import { registerWebMCPTool, type WebMCPResult } from "./webmcp";

// Installed, this file is what `@/components/ui/agent-surface` resolves to, so it
// exports everything the folder's index does: see scripts/audit/installed-imports.ts.
export { validateInput, type JsonSchema, type JsonSchemaType } from "./tool-input";
export { isWebMCPAvailable } from "./webmcp";

export type {
  AgentSurfaceApi,
  AgentSurfaceLabels,
  AgentTool,
  AgentToolCall,
  AgentToolContext,
  AgentToolDefinition,
  AgentToolResult,
  ApprovalAnswer,
  ApprovalHandler,
  ControlChange,
  ControlEvent,
  ControlHolder,
  PreviewChange,
  PreviewState,
  ToolCallSource,
  ToolPreview,
  ToolCallStatus,
  ToolEffect,
  ToolReversibility,
  UndoState,
} from "./agent-tools";

/**
 * A region of the page an agent can operate — and a person can take back.
 *
 * Components inside register what they can do as tools (`useAgentTool`): the
 * same handlers a person's click runs, with the same validation. The app's own
 * assistant calls them through `apiRef`, and with `webmcp` a browser agent can
 * call them too, without reading the page from pixels.
 *
 * Exposing tools is the easy half; others ship it. The half this is built
 * around is control. At any moment the surface is `shared`, driven by the
 * `agent`, or held by the `person`. While the person holds it, every tool call
 * is refused — reads included, because the reason someone takes over is often
 * to type something the agent should not see. Touching a control while the
 * agent drives takes over; handing back can carry a note, and the next call
 * the agent makes receives it. Actions that cannot be undone wait for approval,
 * and without a way to ask, they are refused rather than run.
 */

interface ToolEntry {
  name: string;
  read: () => AgentTool;
  dispose?: () => void;
}

export interface AgentSurfaceContextValue {
  holder: ControlHolder;
  /** Why the agent handed over, while the person holds control because of it. */
  reason: string | null;
  /** Every call this session, oldest first, most recent state of each. */
  calls: AgentToolCall[];
  /** Every change of control this session, oldest first. */
  controlLog: ControlEvent[];
  lastCall: AgentToolCall | null;
  agentName: string;
  /** The surface's `name`, which prefixes its tools. */
  prefix: string | undefined;
  /** Whether tools are offered to browser agents. */
  webmcp: boolean;
  api: AgentSurfaceApi;
  register: (entry: ToolEntry) => () => void;
  /**
   * Lets an approval UI inside the surface answer approval requests, so
   * mounting one is all the wiring there is. Returns the unregister function.
   */
  registerApprover: (handler: ApprovalHandler) => () => void;
}

const AgentSurfaceContext = createContext<AgentSurfaceContextValue | null>(null);

/** The surface, or null outside one — for components that also work alone. */
export function useOptionalAgentSurface(): AgentSurfaceContextValue | null {
  return useContext(AgentSurfaceContext);
}

export function useAgentSurface(): AgentSurfaceContextValue {
  const context = useContext(AgentSurfaceContext);
  if (!context) throw new Error("useAgentSurface must be used inside <AgentSurface>.");
  return context;
}

const TOUCH_MS = 1600;
/** Kept for the ledger. Older calls are dropped, never their undo mid-flight. */
const HISTORY = 200;
const INTERACTIVE =
  "button, a[href], input, select, textarea, summary, [contenteditable='true'], " +
  "[role=button], [role=menuitem], [role=tab], [role=option], [role=checkbox], [role=switch], [role=radio]";

const STYLES = `
@keyframes dowel-agent-touched{from{outline-color:transparent}}
[data-agent-touched]{outline:2px solid color-mix(in oklab,var(--color-info) 70%,transparent);outline-offset:2px;animation:dowel-agent-touched var(--duration-slow) var(--ease-out-quint)}
`;

export interface AgentSurfaceProps extends ComponentPropsWithRef<"div"> {
  /** Prefixes every tool name, so two surfaces on one page cannot collide. */
  name?: string;
  /** How the agent is referred to in announcements and the baton. */
  agentName?: string;
  holder?: ControlHolder;
  defaultHolder?: ControlHolder;
  onControlChange?: (change: ControlChange) => void;
  /**
   * `input`: while the agent drives, the person operating a control here takes
   * over — they are already acting, and making them find a button first is the
   * agent racing them. Anything inside `[data-agent-ui]` is exempt: mark your
   * own approval or chat UI with it. `explicit`: only the baton takes over.
   */
  takeOverOn?: "input" | "explicit";
  /** Expose the tools to browser agents through WebMCP, where supported. */
  webmcp?: boolean;
  /**
   * Asked before any call that needs approval. Takes precedence over an
   * `agent-approvals` mounted inside. With neither, those calls are refused.
   */
  onApprovalRequest?: ApprovalHandler;
  /** Every call, each time its state changes. */
  onToolCall?: (call: AgentToolCall) => void;
  /** Also announce each finished call. Off: six announcements a second is noise. */
  announceCalls?: boolean;
  labels?: Partial<AgentSurfaceLabels>;
  apiRef?: Ref<AgentSurfaceApi>;
  children?: ReactNode;
}

export function AgentSurface({
  className,
  name,
  agentName = "Agent",
  holder: holderProp,
  defaultHolder = "shared",
  onControlChange,
  takeOverOn = "input",
  webmcp = false,
  onApprovalRequest,
  onToolCall,
  announceCalls = false,
  labels: labelOverrides,
  apiRef,
  onClickCapture,
  onInputCapture,
  children,
  ...props
}: AgentSurfaceProps) {
  const [holderState, setHolderState] = useState<ControlHolder>(defaultHolder);
  const holder = holderProp ?? holderState;
  const [reason, setReason] = useState<string | null>(null);
  const [calls, setCalls] = useState<AgentToolCall[]>([]);
  const [controlLog, setControlLog] = useState<ControlEvent[]>([]);
  const [announcement, setAnnouncement] = useState("");

  const holderRef = useRef(holder);
  const resumeTo = useRef<ControlHolder>("shared");
  const notices = useRef<string[]>([]);
  const history = useRef(new Map<string, AgentToolCall>());
  const entries = useRef(new Map<string, ToolEntry>());
  const approvers = useRef<ApprovalHandler[]>([]);
  // Stable for the surface's lifetime, and handed to the call pipeline.
  const [stores] = useState(() => ({
    approvedAlways: new Set<string>(),
    undos: new Map<string, () => unknown>(),
    running: new Set<AbortController>(),
    executing: { current: 0 },
  }));
  const sequence = useRef(0);
  const touched = useRef(new Map<Element, ReturnType<typeof setTimeout>>());
  const exposed = useRef(webmcp);
  const latest = useRef({
    agentName,
    onControlChange,
    onApprovalRequest,
    onToolCall,
    announceCalls,
    labelOverrides,
    controlled: holderProp !== undefined,
  });

  useEffect(() => {
    latest.current = {
      agentName,
      onControlChange,
      onApprovalRequest,
      onToolCall,
      announceCalls,
      labelOverrides,
      controlled: holderProp !== undefined,
    };
  });

  useEffect(() => {
    holderRef.current = holder;
  }, [holder]);

  const labels = useCallback(
    (): AgentSurfaceLabels => ({ ...DEFAULT_LABELS, ...latest.current.labelOverrides }),
    [],
  );

  const change = useCallback(
    (
      next: ControlHolder,
      by: ControlChange["by"],
      extra: { reason?: string; note?: string } = {},
    ) => {
      const previous = holderRef.current;
      if (next === previous) return;
      if (next === "person") {
        resumeTo.current = previous;
        for (const controller of stores.running) controller.abort();
      }
      holderRef.current = next;
      const trimmed = extra.note?.trim();
      // The note rides on the next thing the agent hears — the only channel a
      // browser agent is guaranteed to read.
      if (trimmed) {
        notices.current.push(`Note from the person, who handed control back: "${trimmed}"`);
      }
      setReason(next === "person" ? (extra.reason ?? null) : null);
      if (!latest.current.controlled) setHolderState(next);
      const event: ControlChange = {
        holder: next,
        previous,
        by,
        ...extra,
        note: trimmed || undefined,
      };
      setAnnouncement(labels().change(event, latest.current.agentName));
      setControlLog((log) => [...log, { ...event, at: Date.now() }].slice(-HISTORY));
      latest.current.onControlChange?.(event);
    },
    [labels, stores],
  );

  const runtime = useMemo<CallRuntime>(
    () => ({
      tool: (toolName) => entries.current.get(toolName)?.read(),
      holder: () => holderRef.current,
      approver: () => latest.current.onApprovalRequest ?? approvers.current.at(-1),
      approvedAlways: stores.approvedAlways,
      takeNotices: () => notices.current.splice(0),
      record: (call) => {
        const log = history.current;
        const before = log.get(call.id);
        log.set(call.id, call);
        if (log.size > HISTORY) {
          const oldest = log.keys().next().value;
          if (oldest !== undefined) log.delete(oldest);
        }
        setCalls(Array.from(log.values()));
        latest.current.onToolCall?.(call);
        const finished = call.status !== "running" && before?.status !== call.status;
        if (finished && call.undo === undefined && latest.current.announceCalls) {
          setAnnouncement(labels().call(call, latest.current.agentName));
        }
        if (call.undo === "reverted" || call.undo === "failed") {
          setAnnouncement(labels().undo(call));
        }
      },
      touch: (target) => {
        const element = target?.current;
        if (!element) return;
        const timers = touched.current;
        clearTimeout(timers.get(element));
        element.setAttribute("data-agent-touched", "");
        timers.set(
          element,
          setTimeout(() => {
            element.removeAttribute("data-agent-touched");
            timers.delete(element);
          }, TOUCH_MS),
        );
      },
      running: stores.running,
      executing: stores.executing,
      undos: stores.undos,
      nextId: (toolName) => {
        sequence.current += 1;
        return `${toolName}-${String(sequence.current)}`;
      },
    }),
    [labels, stores],
  );

  const definition = useCallback((entry: ToolEntry): AgentToolDefinition => {
    const tool = entry.read();
    return {
      name: entry.name,
      title: tool.title,
      description: tool.description,
      inputSchema: tool.inputSchema ?? { type: "object", properties: {} },
      annotations: annotate(tool),
      effect: tool.effect ?? "write",
      reversibility: tool.reversibility ?? "revertible",
    };
  }, []);

  const expose = useCallback(
    (entry: ToolEntry) => {
      if (entry.read().webmcp === false) return;
      const {
        effect: _effect,
        reversibility: _reversibility,
        ...webDefinition
      } = definition(entry);
      entry.dispose = registerWebMCPTool(webDefinition, async (input, options) => {
        const result = await runTool(runtime, entry.name, input, "webmcp", options?.signal);
        const response: WebMCPResult = { content: [{ type: "text", text: result.text }] };
        if (!result.ok) response.isError = true;
        if (result.data !== undefined) response.structuredContent = result.data;
        return response;
      });
    },
    [definition, runtime],
  );

  const register = useCallback(
    (entry: ToolEntry) => {
      const scoped = { ...entry, name: name ? `${name}_${entry.name}` : entry.name };
      if (process.env.NODE_ENV !== "production") {
        if (!TOOL_NAME.test(scoped.name)) {
          console.warn(
            `[AgentSurface] "${scoped.name}" is not a valid tool name: use letters, digits, _ and -.`,
          );
        }
        if (entries.current.has(scoped.name)) {
          console.warn(
            `[AgentSurface] Two tools are named "${scoped.name}"; the later one wins.`,
          );
        }
      }
      entries.current.get(scoped.name)?.dispose?.();
      entries.current.set(scoped.name, scoped);
      if (exposed.current) expose(scoped);
      return () => {
        scoped.dispose?.();
        if (entries.current.get(scoped.name) === scoped) entries.current.delete(scoped.name);
      };
    },
    [expose, name],
  );

  const registerApprover = useCallback((handler: ApprovalHandler) => {
    approvers.current.push(handler);
    return () => {
      approvers.current = approvers.current.filter((candidate) => candidate !== handler);
    };
  }, []);

  // Turning WebMCP on or off re-exposes whatever is already registered.
  useEffect(() => {
    exposed.current = webmcp;
    for (const entry of entries.current.values()) {
      entry.dispose?.();
      entry.dispose = undefined;
      if (webmcp) expose(entry);
    }
  }, [webmcp, expose]);

  useEffect(() => {
    const timers = touched.current;
    const controllers = stores.running;
    return () => {
      for (const [element, timer] of timers) {
        clearTimeout(timer);
        element.removeAttribute("data-agent-touched");
      }
      for (const controller of controllers) controller.abort();
    };
  }, [stores]);

  const api = useMemo<AgentSurfaceApi>(
    () => ({
      getHolder: () => holderRef.current,
      notify: (text) => {
        if (text.trim()) notices.current.push(text.trim());
      },
      tools: () => Array.from(entries.current.values(), definition),
      call: (toolName, input, options) =>
        runTool(runtime, toolName, input, options?.source ?? "app", options?.signal),
      undo: async (callId) => {
        const call = history.current.get(callId);
        if (!call || call.status !== "done" || call.undo === "reverted") return false;
        return undoCall(runtime, call, (notice) => notices.current.push(notice));
      },
      grant: () => {
        change("agent", "app");
      },
      release: () => {
        change("shared", "app");
      },
      takeOver: () => {
        change("person", "person");
      },
      handOver: (why) => {
        change("person", "agent", { reason: why });
      },
      handBack: (text) => {
        if (holderRef.current !== "person") return;
        change(resumeTo.current === "person" ? "shared" : resumeTo.current, "person", {
          note: text,
        });
      },
    }),
    [change, definition, runtime],
  );

  useImperativeHandle(apiRef, () => api, [api]);

  // The person acting on a control while the agent drives is taking over. The
  // agent's own tools can click too, so an untrusted event during a call is
  // theirs; anything a person really did is trusted. Interface that is about
  // the agent rather than the page — the baton, an approval, the composer —
  // is marked data-agent-ui: approving a call is not taking the page back.
  const takeOverFromInput = (event: SyntheticEvent, interactiveOnly: boolean) => {
    if (takeOverOn !== "input" || holderRef.current !== "agent") return;
    if (!event.nativeEvent.isTrusted && stores.executing.current > 0) return;
    const target = event.target instanceof Element ? event.target : null;
    if (!target || target.closest("[data-agent-ui]")) return;
    if (interactiveOnly && !target.closest(INTERACTIVE)) return;
    change("person", "person");
  };

  const context = useMemo<AgentSurfaceContextValue>(
    () => ({
      holder,
      reason,
      calls,
      controlLog,
      lastCall: calls.at(-1) ?? null,
      agentName,
      prefix: name,
      webmcp,
      api,
      register,
      registerApprover,
    }),
    [
      holder,
      reason,
      calls,
      controlLog,
      agentName,
      name,
      webmcp,
      api,
      register,
      registerApprover,
    ],
  );

  return (
    <AgentSurfaceContext.Provider value={context}>
      <style href="dowel-agent-surface" precedence="dowel">
        {STYLES}
      </style>
      <div
        data-slot="agent-surface"
        data-holder={holder}
        onClickCapture={(event) => {
          onClickCapture?.(event);
          takeOverFromInput(event, true);
        }}
        onInputCapture={(event) => {
          onInputCapture?.(event);
          takeOverFromInput(event, false);
        }}
        className={cn(
          "relative rounded-lg transition-shadow duration-[var(--duration-normal)]",
          "data-[holder=agent]:ring-2 data-[holder=agent]:ring-info/50",
          "data-[holder=agent]:ring-offset-2 data-[holder=agent]:ring-offset-background",
          className,
        )}
        {...props}
      >
        {children}
        {/* Control changes and undos, always; finished calls only with announceCalls. */}
        <div data-slot="agent-surface-status" role="status" className="sr-only">
          {announcement}
        </div>
      </div>
    </AgentSurfaceContext.Provider>
  );
}

/**
 * Registers a tool with the nearest `AgentSurface` for as long as the calling
 * component is mounted. `execute` always sees the latest props and state; the
 * tool is re-registered only when what the agent is told about it changes.
 */
export function useAgentTool<Input extends Record<string, unknown>>(
  tool: AgentTool<Input>,
): void {
  const { register } = useAgentSurface();
  const latest = useRef(tool);
  useEffect(() => {
    latest.current = tool;
  });

  const enabled = tool.enabled ?? true;
  const signature = JSON.stringify([
    tool.name,
    tool.title,
    tool.description,
    tool.inputSchema,
    tool.effect,
    tool.reversibility,
    tool.requiresApproval,
    tool.untrustedOutput,
    tool.webmcp,
  ]);

  useEffect(() => {
    if (!enabled) return;
    return register({
      name: latest.current.name,
      read: () => latest.current as unknown as AgentTool,
    });
  }, [register, signature, enabled]);
}
