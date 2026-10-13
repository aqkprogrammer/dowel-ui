"use client";

import { AgentApprovals } from "@dowel-ui/react/agent-approvals";
import { AgentLedger } from "@dowel-ui/react/agent-ledger";
import { AgentReplay } from "@dowel-ui/react/agent-replay";
import {
  AgentSurface,
  type AgentSurfaceApi,
  type AgentToolCall,
  type ControlChange,
} from "@dowel-ui/react/agent-surface";
import { Button } from "@dowel-ui/react/button";
import { ControlBaton } from "@dowel-ui/react/control-baton";
import { Input } from "@dowel-ui/react/input";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { MAX_GOAL_CHARS, MAX_MODEL_TURNS, SURFACE_NAME } from "~/lib/agent-demo/limits";
import {
  runAgent,
  runScript,
  type AgentEvent,
  type ScriptStep,
} from "~/lib/agent-demo/run-agent";

import { Deals } from "./deals";

const AGENT = "Claude";

const PRESETS = [
  "Find the renewals, select them and email their owners.",
  "Move Cove pilot to Proposal, then sort by amount, largest first.",
  "Which deal is the largest, and who owns it?",
];

/** What the scripted run does, for a deployment with no model connected. */
const SCRIPT: ScriptStep[] = [
  { say: "I'll find the renewals and email their owners." },
  { tool: `${SURFACE_NAME}_list_deals` },
  { tool: `${SURFACE_NAME}_filter_deals`, input: { text: "renewal" } },
  { tool: `${SURFACE_NAME}_select_deals`, input: { ids: ["d2", "d5"] } },
  // No closing line: a script cannot know how the run went, only the page can.
  { tool: `${SURFACE_NAME}_email_owners` },
];

interface Line {
  id: number;
  who: "you" | "agent" | "page";
  text: string;
}

function describeEnd(event: Extract<AgentEvent, { type: "done" }>): string | null {
  switch (event.reason) {
    case "finished":
      return null;
    case "stopped":
      return "Stopped.";
    case "limit":
      return `Stopped after ${String(MAX_MODEL_TURNS)} steps.`;
    case "refused":
      return "The model declined this request.";
    case "cut-short":
      return "The reply was cut short, so nothing in it was run.";
    case "error":
      return event.message ?? "Something went wrong.";
  }
}

function describeCall(call: AgentToolCall, personHolds: boolean): string | null {
  if (call.undo === "reverted") return `You undid: ${call.summary}.`;
  if (call.undo) return null;
  if (call.status === "done") return `${call.summary}.`;
  // What the agent is told is written for the agent. The person knows why.
  if (call.status === "refused" && personHolds) {
    return `Not run: ${call.title}. You took control.`;
  }
  if (call.status === "refused") return `Not run: ${call.title}. ${call.told ?? ""}`.trim();
  if (call.status === "failed") return `Failed: ${call.title}. ${call.told ?? ""}`.trim();
  return null;
}

/**
 * An agent operating a page, and the person taking it back.
 *
 * Everything the agent can do is a tool the deals table registered, and every
 * call goes through the surface: that is what lets the person take over by
 * touching the table, approve or decline the email, and undo from the ledger.
 * This component only starts the run, shows what was said, and resolves the
 * loop's wait when control is handed back.
 */
export function AgentDemo() {
  const apiRef = useRef<AgentSurfaceApi>(null);
  const run = useRef<AbortController | null>(null);
  const handBackWaiters = useRef(new Set<(note: string | undefined) => void>());
  const logged = useRef(new Set<string>());
  const nextLine = useRef(0);
  const goalId = useId();

  const [mode, setMode] = useState<"loading" | "model" | "scripted">("loading");
  const [goal, setGoal] = useState(PRESETS[0] ?? "");
  const [running, setRunning] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  // Remounts the surface and the table: a clean page, ledger and replay.
  const [generation, setGeneration] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/agent-demo", { signal: controller.signal })
      .then((response) => response.json() as Promise<{ mode?: string }>)
      .then((body) => {
        setMode(body.mode === "model" ? "model" : "scripted");
      })
      .catch(() => {
        if (!controller.signal.aborted) setMode("scripted");
      });
    return () => {
      controller.abort();
    };
  }, []);

  // Leaving the page ends the run.
  useEffect(
    () => () => {
      run.current?.abort();
    },
    [],
  );

  const say = useCallback((who: Line["who"], text: string) => {
    nextLine.current += 1;
    const id = nextLine.current;
    setLines((current) => [...current, { id, who, text }]);
  }, []);

  const waitForHandBack = useCallback(
    (signal: AbortSignal) =>
      new Promise<string | undefined>((resolve, reject) => {
        const waiters = handBackWaiters.current;
        const done = (note: string | undefined) => {
          signal.removeEventListener("abort", stop);
          resolve(note);
        };
        const stop = () => {
          waiters.delete(done);
          reject(new DOMException("Stopped", "AbortError"));
        };
        waiters.add(done);
        signal.addEventListener("abort", stop, { once: true });
      }),
    [],
  );

  const onControlChange = (change: ControlChange) => {
    if (change.previous !== "person" || change.holder === "person") return;
    const waiters = [...handBackWaiters.current];
    handBackWaiters.current.clear();
    for (const resolve of waiters) resolve(change.note);
    // Handed back with no run to hand it to: nobody holds the page.
    if (!run.current && change.holder === "agent") apiRef.current?.release();
  };

  const onToolCall = (call: AgentToolCall) => {
    const key = `${call.id}:${call.status}:${call.undo ?? ""}`;
    if (logged.current.has(key)) return;
    logged.current.add(key);
    const text = describeCall(call, apiRef.current?.getHolder() === "person");
    if (text) say("page", text);
  };

  const onEvent = (event: AgentEvent) => {
    if (event.type === "say") say("agent", event.text);
    else if (event.type === "waiting") setWaiting(true);
    else if (event.type === "resumed") setWaiting(false);
    else {
      const end = describeEnd(event);
      if (end) say("page", end);
    }
  };

  const start = async () => {
    const api = apiRef.current;
    if (!api || running) return;
    const controller = new AbortController();
    run.current = controller;
    setRunning(true);
    setWaiting(false);

    const options = { api, signal: controller.signal, onEvent, waitForHandBack };
    if (mode === "model") {
      say("you", goal.trim());
      await runAgent({ ...options, goal: goal.trim() });
    } else {
      say("you", PRESETS[0] ?? "");
      await runScript(SCRIPT, options);
    }

    run.current = null;
    setRunning(false);
    setWaiting(false);
  };

  const reset = () => {
    run.current?.abort();
    run.current = null;
    handBackWaiters.current.clear();
    logged.current.clear();
    setLines([]);
    setRunning(false);
    setWaiting(false);
    setGeneration((current) => current + 1);
  };

  const scripted = mode === "scripted";

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <AgentSurface
        key={generation}
        name={SURFACE_NAME}
        agentName={AGENT}
        apiRef={apiRef}
        webmcp
        onControlChange={onControlChange}
        onToolCall={onToolCall}
        className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4"
      >
        <ControlBaton />
        <Deals />
        <AgentApprovals />
        <AgentLedger empty={`Nothing to undo yet. What ${AGENT} changes is listed here.`} />
        <AgentReplay />
      </AgentSurface>

      <section aria-labelledby={`${goalId}-heading`} className="flex flex-col gap-4">
        <h2 id={`${goalId}-heading`} className="text-base font-semibold">
          Ask {AGENT}
        </h2>

        {scripted ? (
          <p className="text-sm text-muted-foreground">
            No model is connected to this deployment, so this run follows a script: find the
            renewals and email their owners. Taking over, approving and undoing are real.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            <label htmlFor={goalId} className="text-sm font-medium">
              What should it do?
            </label>
            <Input
              id={goalId}
              value={goal}
              maxLength={MAX_GOAL_CHARS}
              disabled={running || mode === "loading"}
              onChange={(event) => {
                setGoal(event.target.value);
              }}
            />
            <ul className="flex flex-col gap-1" aria-label="Examples">
              {PRESETS.map((preset) => (
                <li key={preset}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto justify-start py-1 text-start whitespace-normal"
                    disabled={running}
                    onClick={() => {
                      setGoal(preset);
                    }}
                  >
                    {preset}
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {running ? (
            <Button
              variant="outline"
              onClick={() => {
                run.current?.abort();
              }}
            >
              Stop
            </Button>
          ) : (
            <Button
              disabled={mode === "loading" || (!scripted && goal.trim() === "")}
              onClick={() => void start()}
            >
              {scripted ? "Run the script" : `Run ${AGENT}`}
            </Button>
          )}
          <Button variant="ghost" onClick={reset}>
            Reset the page
          </Button>
        </div>

        <div
          role="log"
          aria-label="What happened"
          className="flex min-h-40 flex-col gap-2 rounded-xl border border-border p-3 text-sm"
        >
          {lines.length === 0 ? (
            <p className="text-muted-foreground">
              Run it, then touch the table while it works: tick a checkbox or type in the
              filter. You take control, {AGENT} waits, and you hand back with a note.
            </p>
          ) : (
            lines.map((line) => (
              <p key={line.id} className={line.who === "page" ? "text-muted-foreground" : ""}>
                <span className="font-medium">
                  {line.who === "you" ? "You" : line.who === "agent" ? AGENT : "Page"}:
                </span>{" "}
                {line.text}
              </p>
            ))
          )}
          {waiting ? (
            <p className="text-muted-foreground">
              {AGENT} is waiting for you to hand control back.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
