"use client";

import { cva, type VariantProps } from "class-variance-authority";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { useOptionalAgentSurface, type ControlHolder } from "@/components/agent-surface";
import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/**
 * Who has control — the agent or the person — and the way to change it.
 *
 * Agent products that drive a page (a browser, a form, a checkout) all arrive
 * at the same three moments, and each builds them from scratch: the person
 * takes over mid-run; the agent hands over because it needs something only a
 * person can do, like signing in; the person hands back. The last is the one
 * usually skipped, and it is where the useful information is — the person just
 * did something the agent did not see, and a note is the only way it learns
 * what. So handing back asks for one, and the agent receives it.
 *
 * Inside an `AgentSurface` it reads and changes the surface's control state.
 * Outside one — watching a remote browser session, say — pass `holder` and the
 * callbacks, and it announces changes itself.
 */

export interface ControlBatonLabels {
  status: (holder: ControlHolder, agentName: string) => string;
  /** Replaces the status while the person holds control because the agent asked. */
  needsYou: (agentName: string, reason: string) => string;
  takeOver: string;
  /** In `shared`, where there is no run to take over — only an agent to stop. */
  pause: (agentName: string) => string;
  handBack: string;
  /** The final button, once the note is showing. */
  handBackConfirm: string;
  cancel: string;
  noteLabel: (agentName: string) => string;
  notePlaceholder: string;
  group: string;
}

const DEFAULT_LABELS: ControlBatonLabels = {
  status: (holder, agent) =>
    holder === "agent"
      ? `${agent} is working`
      : holder === "person"
        ? `You have control. ${agent} is paused`
        : `${agent} can act on this page`,
  needsYou: (agent, reason) => `${agent} needs you: ${reason}`,
  takeOver: "Take over",
  pause: (agent) => `Pause ${agent}`,
  handBack: "Hand back…",
  handBackConfirm: "Hand back",
  cancel: "Cancel",
  noteLabel: (agent) => `Anything ${agent} should know? (optional)`,
  notePlaceholder: "What you changed, or what to do next",
  group: "Control of this page",
};

const controlBatonVariants = cva(
  "flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border text-sm transition-colors duration-[var(--duration-normal)]",
  {
    variants: {
      holder: {
        shared: "border-border bg-card",
        agent: "border-info/40 bg-info/5",
        person: "border-border bg-card",
      },
      size: {
        default: "px-3 py-2.5",
        compact: "px-2.5 py-1.5 text-xs",
      },
    },
    defaultVariants: { holder: "shared", size: "default" },
  },
);

const buttonClass = cn(
  "inline-flex shrink-0 items-center rounded-md px-2.5 py-1 text-xs font-medium",
  "transition-colors duration-[var(--duration-fast)] disabled:pointer-events-none disabled:opacity-55",
  focusRing,
);
const primaryClass = cn(
  buttonClass,
  "bg-primary text-primary-foreground hover:bg-primary-hover",
);
const secondaryClass = cn(
  buttonClass,
  "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
);

export interface ControlBatonProps
  extends
    Omit<ComponentPropsWithRef<"div">, "children">,
    Pick<VariantProps<typeof controlBatonVariants>, "size"> {
  /** Required outside an `AgentSurface`; overrides the surface inside one. */
  holder?: ControlHolder;
  /** Why the agent handed over. Read from the surface when omitted. */
  reason?: string | null;
  /** What the agent is doing. Defaults to the surface's latest call. */
  activity?: ReactNode;
  agentName?: string;
  onTakeOver?: () => void;
  onHandBack?: (note: string | undefined) => void;
  /** `off` hands back in one click, without offering a note. */
  note?: "optional" | "off";
  /** Announce changes of control. Defaults to on only outside a surface, which announces its own. */
  announce?: boolean;
  labels?: Partial<ControlBatonLabels>;
}

export function ControlBaton({
  className,
  holder: holderProp,
  reason: reasonProp,
  activity: activityProp,
  agentName: agentNameProp,
  onTakeOver,
  onHandBack,
  note = "optional",
  announce,
  labels: labelOverrides,
  size,
  ...props
}: ControlBatonProps) {
  const surface = useOptionalAgentSurface();
  const labels = { ...DEFAULT_LABELS, ...labelOverrides };
  const holder = holderProp ?? surface?.holder;
  if (holder === undefined) {
    throw new Error(
      "ControlBaton needs a holder: render it inside <AgentSurface> or pass `holder`.",
    );
  }
  const agentName = agentNameProp ?? surface?.agentName ?? "Agent";
  const reason = reasonProp === undefined ? (surface?.reason ?? null) : reasonProp;
  const announces = announce ?? surface === null;

  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState("");
  // Control moved elsewhere while the note was open: there is nothing to hand back.
  if (composing && holder !== "person") setComposing(false);

  const primaryRef = useRef<HTMLButtonElement | null>(null);
  const noteRef = useRef<HTMLTextAreaElement | null>(null);
  const restoreFocus = useRef(false);
  const noteFocused = useRef(false);
  const noteId = useId();

  // Focus goes into the note when it opens and back to the button when it
  // closes — including when control moves elsewhere while someone is typing,
  // since the field they were in has just disappeared.
  useEffect(() => {
    if (composing) {
      noteRef.current?.focus();
    } else if (restoreFocus.current || noteFocused.current) {
      restoreFocus.current = false;
      noteFocused.current = false;
      primaryRef.current?.focus();
    }
  }, [composing]);

  const takeOver = () => {
    surface?.api.takeOver();
    onTakeOver?.();
  };

  const handBack = (text: string | undefined) => {
    const trimmed = text?.trim() || undefined;
    surface?.api.handBack(trimmed);
    onHandBack?.(trimmed);
    setDraft("");
  };

  const close = () => {
    restoreFocus.current = true;
    setComposing(false);
  };

  const onPrimary = () => {
    if (holder !== "person") {
      takeOver();
    } else if (note === "off") {
      handBack(undefined);
    } else {
      setComposing(true);
    }
  };

  const onNoteKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      handBack(draft);
      close();
    }
  };

  const status =
    holder === "person" && reason
      ? labels.needsYou(agentName, reason)
      : labels.status(holder, agentName);

  // A call in progress is named by what it is ("Email deal owners…"); a
  // finished one by what it did ("Emailed 2 deal owners").
  const lastCall = surface?.lastCall;
  const activity =
    activityProp !== undefined
      ? activityProp
      : holder !== "person" && lastCall
        ? lastCall.status === "done"
          ? lastCall.summary
          : `${lastCall.title}${lastCall.status === "running" ? "…" : ` (${lastCall.status})`}`
        : null;

  const primaryLabel =
    holder === "agent"
      ? labels.takeOver
      : holder === "shared"
        ? labels.pause(agentName)
        : labels.handBack;

  return (
    <div
      data-slot="control-baton"
      data-agent-ui=""
      data-holder={holder}
      role="group"
      aria-label={labels.group}
      className={cn(controlBatonVariants({ holder, size }), className)}
      {...props}
    >
      <span
        aria-hidden="true"
        data-slot="control-baton-presence"
        className={cn(
          "size-2 shrink-0 rounded-full",
          holder === "agent"
            ? "animate-pulse-soft bg-info"
            : holder === "person"
              ? "bg-foreground"
              : "bg-muted-foreground/60",
        )}
      />

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {/* The status is a sentence, never only the colour of the dot. Outside
            a surface it is also the live region, present from first paint. */}
        <p
          data-slot="control-baton-status"
          role={announces ? "status" : undefined}
          className="font-medium"
        >
          {status}
        </p>
        {activity ? (
          <p
            data-slot="control-baton-activity"
            className="truncate text-xs text-muted-foreground"
          >
            {activity}
          </p>
        ) : null}
      </div>

      {composing ? (
        <form
          data-slot="control-baton-note"
          className="flex w-full flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            handBack(draft);
            close();
          }}
        >
          <label htmlFor={noteId} className="text-xs text-muted-foreground">
            {labels.noteLabel(agentName)}
          </label>
          <textarea
            ref={noteRef}
            id={noteId}
            value={draft}
            rows={2}
            placeholder={labels.notePlaceholder}
            onChange={(event) => {
              setDraft(event.target.value);
            }}
            onKeyDown={onNoteKeyDown}
            onFocus={() => {
              noteFocused.current = true;
            }}
            onBlur={() => {
              noteFocused.current = false;
            }}
            className={cn(
              "w-full resize-y rounded-md border border-input bg-background px-2.5 py-1.5 text-sm",
              "placeholder:text-muted-foreground",
              focusRing,
            )}
          />
          <div className="flex gap-2">
            <button type="submit" data-slot="control-baton-confirm" className={primaryClass}>
              {labels.handBackConfirm}
            </button>
            <button type="button" onClick={close} className={secondaryClass}>
              {labels.cancel}
            </button>
          </div>
        </form>
      ) : (
        <button
          ref={primaryRef}
          type="button"
          data-slot="control-baton-action"
          onClick={onPrimary}
          className={holder === "agent" ? primaryClass : secondaryClass}
        >
          {primaryLabel}
        </button>
      )}
    </div>
  );
}

export { controlBatonVariants };
