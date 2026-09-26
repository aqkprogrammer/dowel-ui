"use client";

import {
  useEffect,
  useId,
  useMemo,
  useState,
  type ComponentPropsWithRef,
  type ReactNode,
} from "react";

import {
  useOptionalAgentSurface,
  type AgentToolCall,
  type ControlEvent,
} from "@/components/agent-surface";
import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/**
 * A finished agent run, one step at a time.
 *
 * After a run, "what did it do?" has a list for an answer — the ledger. "How
 * did it get there?" needs the order: what the agent tried, what it was told
 * each time, where the person took over and what they said when handing back.
 * This lays the surface's calls and changes of control on one timeline and
 * lets you move through it — by button, by slider, or played back.
 *
 * It replays what was recorded, not the page: the arguments, the outcome and
 * the exact text the agent received. Pass `renderStep` to show more, such as a
 * snapshot your app kept.
 */

export type ReplayStep =
  | { kind: "call"; id: string; at: number; call: AgentToolCall }
  | { kind: "control"; id: string; at: number; event: ControlEvent };

/** Calls and changes of control, in the order they happened. */
export function replaySteps(calls: AgentToolCall[], controlLog: ControlEvent[]): ReplayStep[] {
  const steps: ReplayStep[] = [
    ...calls.map((call) => ({ kind: "call" as const, id: call.id, at: call.startedAt, call })),
    ...controlLog.map((event, index) => ({
      kind: "control" as const,
      id: `control-${String(index)}`,
      at: event.at,
      event,
    })),
  ];
  return steps.sort((a, b) => a.at - b.at);
}

/** A change of control as a sentence about who did what. */
export function describeControl(event: ControlEvent, agent: string): string {
  if (event.holder === "person") {
    return event.by === "agent" && event.reason
      ? `${agent} handed over: ${event.reason}`
      : `You took over. ${agent} paused.`;
  }
  if (event.previous === "person") {
    return event.note ? `You handed back, with a note: “${event.note}”` : "You handed back.";
  }
  return event.holder === "agent" ? `${agent} started.` : `${agent} finished.`;
}

const STATUS: Record<AgentToolCall["status"], string> = {
  running: "Running",
  done: "Done",
  refused: "Refused",
  failed: "Failed",
};

const SOURCE: Record<AgentToolCall["source"], string> = {
  app: "Called by the app's assistant",
  webmcp: "Called by a browser agent",
};

function stepTitle(step: ReplayStep, agent: string): string {
  if (step.kind === "control") return describeControl(step.event, agent);
  const { call } = step;
  return call.status === "done"
    ? call.summary
    : `${call.title}: ${STATUS[call.status].toLowerCase()}`;
}

function elapsed(ms: number): string {
  const seconds = Math.max(0, Math.round(ms / 1000));
  return `${String(Math.floor(seconds / 60))}:${String(seconds % 60).padStart(2, "0")}`;
}

export interface AgentReplayProps extends Omit<ComponentPropsWithRef<"section">, "children"> {
  /** The calls to replay. Defaults to the surface's history. */
  calls?: AgentToolCall[];
  /** Changes of control. Defaults to the surface's log. */
  controlLog?: ControlEvent[];
  agentName?: string;
  /** Which steps to show — for instance, leave out reads. */
  include?: (step: ReplayStep) => boolean;
  /** Milliseconds per step while playing. */
  interval?: number;
  /**
   * Shows each step's clock time, formatted as you choose. Off by default:
   * a locale-formatted time differs between server and browser, which breaks
   * hydration, so by default only the time since the run began is shown.
   */
  formatTime?: (ms: number) => string;
  /** More to show for a step, such as a snapshot your app recorded. */
  renderStep?: (step: ReplayStep) => ReactNode;
  heading?: string;
}

const buttonClass = cn(
  "inline-flex items-center rounded-md border border-input bg-background px-2.5 py-1 text-xs font-medium",
  "transition-colors duration-[var(--duration-fast)] hover:bg-accent hover:text-accent-foreground",
  "disabled:pointer-events-none disabled:opacity-55",
  focusRing,
);

export function AgentReplay({
  className,
  calls: callsProp,
  controlLog: controlLogProp,
  agentName: agentNameProp,
  include,
  interval = 1500,
  formatTime,
  renderStep,
  heading = "Replay",
  ...props
}: AgentReplayProps) {
  const surface = useOptionalAgentSurface();
  const agent = agentNameProp ?? surface?.agentName ?? "Agent";
  const surfaceCalls = surface?.calls;
  const surfaceLog = surface?.controlLog;

  const steps = useMemo(() => {
    const all = replaySteps(
      callsProp ?? surfaceCalls ?? [],
      controlLogProp ?? surfaceLog ?? [],
    );
    return include ? all.filter(include) : all;
  }, [callsProp, surfaceCalls, controlLogProp, surfaceLog, include]);

  const [position, setPosition] = useState(0);
  const [playing, setPlaying] = useState(false);
  const last = steps.length - 1;
  const index = Math.min(position, Math.max(last, 0));
  const step = steps[index];
  const headingId = useId();
  const sliderId = useId();

  // Playing moves one step per interval and stops at the end rather than
  // looping: a replay that starts again by itself is one nobody can follow.
  const running = playing && index < last;
  useEffect(() => {
    if (!running) return;
    const timer = setTimeout(() => {
      setPosition(index + 1);
    }, interval);
    return () => {
      clearTimeout(timer);
    };
  }, [running, index, interval]);

  const go = (next: number) => {
    setPlaying(false);
    setPosition(Math.max(0, Math.min(next, last)));
  };

  const title = step ? stepTitle(step, agent) : "";
  const where = step ? `Step ${String(index + 1)} of ${String(steps.length)}` : "";
  const started = steps[0]?.at ?? 0;

  return (
    <section
      data-slot="agent-replay"
      aria-labelledby={headingId}
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-border bg-card p-4 text-sm",
        className,
      )}
      {...props}
    >
      <h3 id={headingId} className="text-sm font-medium">
        {heading}
      </h3>

      {/* Present from first paint. Quiet while playing: announcing every step
          of a playback talks over the playback. */}
      <p data-slot="agent-replay-status" role="status" className="sr-only">
        {step && !running ? `${where}: ${title}` : ""}
      </p>

      {!step ? (
        <p className="text-muted-foreground">Nothing to replay yet.</p>
      ) : (
        <>
          <div
            role="group"
            aria-label="Replay controls"
            className="flex flex-wrap items-center gap-1.5"
          >
            <button
              type="button"
              className={buttonClass}
              disabled={index === 0}
              onClick={() => {
                go(0);
              }}
            >
              First
            </button>
            <button
              type="button"
              className={buttonClass}
              disabled={index === 0}
              onClick={() => {
                go(index - 1);
              }}
            >
              Previous
            </button>
            <button
              type="button"
              data-slot="agent-replay-play"
              className={buttonClass}
              aria-pressed={running}
              disabled={index >= last}
              onClick={() => {
                setPlaying(!running);
              }}
            >
              {running ? "Pause" : "Play"}
            </button>
            <button
              type="button"
              className={buttonClass}
              disabled={index >= last}
              onClick={() => {
                go(index + 1);
              }}
            >
              Next
            </button>
            <button
              type="button"
              className={buttonClass}
              disabled={index >= last}
              onClick={() => {
                go(last);
              }}
            >
              Last
            </button>
            <span className="ms-auto text-xs text-muted-foreground tabular-nums">
              {where}
              {formatTime ? ` · ${formatTime(step.at)}` : ""} ·{" "}
              <time dateTime={new Date(step.at).toISOString()}>
                +{elapsed(step.at - started)}
              </time>
            </span>
          </div>

          <label htmlFor={sliderId} className="sr-only">
            Step
          </label>
          <input
            id={sliderId}
            data-slot="agent-replay-slider"
            type="range"
            min={1}
            max={steps.length}
            value={index + 1}
            aria-valuetext={`${where}: ${title}`}
            onChange={(event) => {
              go(Number(event.target.value) - 1);
            }}
            className={cn("w-full accent-primary", focusRing)}
          />

          <article
            data-slot="agent-replay-step"
            data-kind={step.kind}
            className="flex flex-col gap-2 rounded-md border border-border bg-muted/30 p-3"
          >
            <h4 className="font-medium">{title}</h4>
            {step.kind === "call" ? <CallDetail call={step.call} /> : null}
            {renderStep ? renderStep(step) : null}
          </article>

          <ol aria-label="Steps" className="flex max-h-60 flex-col gap-0.5 overflow-y-auto">
            {steps.map((candidate, position) => (
              <li key={candidate.id}>
                <button
                  type="button"
                  aria-current={position === index ? "step" : undefined}
                  onClick={() => {
                    go(position);
                  }}
                  className={cn(
                    "flex w-full items-baseline gap-2 rounded-md px-2 py-1 text-start text-xs",
                    "transition-colors duration-[var(--duration-fast)] hover:bg-accent",
                    "aria-[current=step]:bg-accent aria-[current=step]:font-medium",
                    focusRing,
                  )}
                >
                  <span className="w-6 shrink-0 text-muted-foreground tabular-nums">
                    {position + 1}.
                  </span>
                  <span className="flex-1">{stepTitle(candidate, agent)}</span>
                  {candidate.kind === "call" ? (
                    <span className="text-muted-foreground">
                      {STATUS[candidate.call.status]}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Control</span>
                  )}
                </button>
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}

function CallDetail({ call }: { call: AgentToolCall }) {
  const facts = [
    STATUS[call.status],
    SOURCE[call.source],
    call.edited ? `You corrected ${call.edited.join(", ")} before approving` : undefined,
    call.undo === "reverted" ? "Undone afterwards" : undefined,
  ].filter(Boolean);

  return (
    <>
      <p className="text-xs text-muted-foreground">{facts.join(" · ")}</p>
      <dl className="flex flex-col gap-2 text-xs">
        <div className="flex flex-col gap-1">
          <dt className="font-medium">Arguments</dt>
          <dd>
            <pre
              role="region"
              aria-label="Arguments"
              tabIndex={0}
              className={cn("overflow-x-auto rounded bg-muted p-2 font-mono", focusRing)}
            >
              {JSON.stringify(call.input, null, 2)}
            </pre>
          </dd>
        </div>
        {call.told ? (
          <div className="flex flex-col gap-1">
            <dt className="font-medium">What the agent was told</dt>
            <dd>
              <pre
                role="region"
                aria-label="What the agent was told"
                tabIndex={0}
                className={cn(
                  "overflow-x-auto rounded bg-muted p-2 font-mono whitespace-pre-wrap",
                  focusRing,
                )}
              >
                {call.told}
              </pre>
            </dd>
          </div>
        ) : null}
      </dl>
    </>
  );
}
