"use client";

import { cva } from "class-variance-authority";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentPropsWithRef,
  type ReactNode,
} from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

import {
  createGrantStore,
  defaultPermissionOptions,
  type PermissionCapability,
  type PermissionDecision,
  type PermissionGrant,
  type PermissionRisk,
  type PermissionStore,
} from "./permission-grants";
import { createPermissionQueue, type PermissionRequestDetails } from "./permission-queue";

// Installed, this file is what `@/components/ui/permission-prompt` resolves to, so it
// exports everything the folder's index does: see scripts/audit/installed-imports.ts.
export {
  createGrantStore,
  defaultPermissionOptions,
  findGrant,
  grantCovers,
  grantKey,
  type GrantStore,
  type GrantStoreOptions,
  type PermissionCapability,
  type PermissionDecision,
  type PermissionGrant,
  type PermissionRisk,
  type PermissionStore,
} from "./permission-grants";
export {
  createPermissionQueue,
  type PermissionQueue,
  type PermissionQueueSnapshot,
  type PermissionRequest,
  type PermissionRequestDetails,
} from "./permission-queue";

/**
 * A request for a capability, at the moment it is needed.
 *
 * "Claude wants to read your calendar", with why, what that does and does
 * not let it do, and how risky it is in words. The answer can be scoped in
 * time — once, for this session, always — which is the difference between a
 * prompt people read and one they learn to click through: asked the same
 * question every time, people stop reading it.
 *
 * `ai-approval-request` asks about one call and its arguments. This asks
 * about a capability, which may cover many calls. `usePermissionPrompt` puts
 * the two ends together: an agent tool awaits `request()`, and the person
 * answers the prompt it returns.
 */

export interface PermissionPromptLabels {
  /** "Claude wants to read your calendar". Also names the region. */
  heading: (requester: string, title: string) => string;
  can: (requester: string) => string;
  cannot: (requester: string) => string;
  scope: string;
  risk: Record<PermissionRisk, string>;
  choice: Record<PermissionDecision, string>;
  outcome: Record<PermissionDecision, string>;
  change: string;
  cancel: string;
  /** Said politely when a prompt appears. */
  announcement: (heading: string, risk: string | undefined) => string;
  /** Under the prompt from `usePermissionPrompt` while more requests are queued. */
  waiting: (count: number) => string;
}

const DEFAULT_LABELS: PermissionPromptLabels = {
  heading: (requester, title) => `${requester} wants to ${title}`,
  can: (requester) => `This lets ${requester}:`,
  cannot: (requester) => `${requester} can't:`,
  scope: "Applies to",
  risk: { low: "Low risk", medium: "Medium risk", high: "High risk" },
  choice: {
    once: "Allow once",
    session: "Allow for this session",
    always: "Always allow",
    deny: "Don't allow",
  },
  outcome: {
    once: "Allowed once",
    session: "Allowed for this session",
    always: "Always allowed",
    deny: "Not allowed",
  },
  change: "Change",
  cancel: "Cancel",
  announcement: (heading, risk) => `Permission request: ${heading}.${risk ? ` ${risk}.` : ""}`,
  waiting: (count) => `${String(count)} more ${count === 1 ? "request" : "requests"} waiting`,
};

/**
 * How long a new prompt's status region sits empty before it speaks. Screen
 * readers ignore text that arrives with the region itself; it has to change
 * while the region is already known.
 */
const ANNOUNCE_DELAY_MS = 150;

export const permissionPromptVariants = cva("rounded-lg border p-4 text-sm", {
  variants: {
    state: {
      pending: "border-border bg-card text-card-foreground",
      decided: "border-border bg-muted/40",
    },
    risk: { low: "", medium: "", high: "" },
  },
  compoundVariants: [{ state: "pending", risk: "high", className: "border-destructive/50" }],
  defaultVariants: { state: "pending" },
});

export const permissionRiskVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-2xs font-medium [&_svg]:size-3.5 [&_svg]:shrink-0",
  {
    variants: {
      risk: {
        low: "border-border text-muted-foreground",
        medium: "border-warning/50 text-warning",
        high: "border-destructive/50 bg-destructive/10 text-destructive",
      },
    },
    defaultVariants: { risk: "low" },
  },
);

export const permissionChoiceVariants = cva(
  [
    "rounded-md border px-2.5 py-1 text-xs font-medium",
    "transition-[color,background-color,border-color,scale] duration-[var(--duration-fast)] ease-[var(--ease-out-quint)] active:scale-[0.99]",
    focusRing,
  ],
  {
    variants: {
      variant: {
        primary: "border-primary bg-primary text-primary-foreground hover:bg-primary-hover",
        default: "border-input bg-background hover:bg-accent hover:text-accent-foreground",
        quiet:
          "border-transparent px-1.5 text-muted-foreground underline-offset-2 hover:text-foreground hover:underline",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

/** Decorative: the risk is always said in words beside it. */
function RiskIcon({ risk }: { risk: PermissionRisk }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {risk === "high" ? (
        <>
          <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
          <path d="M12 9v4M12 17h.01" />
        </>
      ) : (
        <>
          <path d="M12 3 5 6v5c0 4.4 3 8.1 7 10 4-1.9 7-5.6 7-10V6l-7-3Z" />
          <path d={risk === "low" ? "m9 12 2 2 4-4" : "M12 8v4M12 15.5h.01"} />
        </>
      )}
    </svg>
  );
}

/** "to find a free slot" becomes "To find a free slot." — it stands on its own line. */
function asSentence(text: string): string {
  const trimmed = text.trim();
  if (trimmed === "") return trimmed;
  const capitalised = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  return /[.!?…]$/.test(capitalised) ? capitalised : `${capitalised}.`;
}

function CapabilityList({
  slot,
  title,
  items,
}: {
  slot: string;
  title: string;
  items: string[];
}) {
  const id = useId();
  return (
    <div data-slot={slot} className="flex min-w-0 flex-1 basis-48 flex-col gap-1">
      <p id={id} className="text-xs font-medium text-muted-foreground">
        {title}
      </p>
      <ul
        aria-labelledby={id}
        className="flex list-disc flex-col gap-0.5 ps-4 marker:text-muted-foreground"
      >
        {items.map((item, index) => (
          <li key={`${String(index)}-${item}`}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export interface PermissionPromptProps extends ComponentPropsWithRef<"section"> {
  /** Who is asking: "Claude". */
  requester: string;
  capability: PermissionCapability;
  /**
   * Why it is needed now, written to follow the heading: "to find a free slot
   * for the meeting you asked for". A string is shown as its own sentence.
   */
  reason?: ReactNode;
  /**
   * Choices to offer, in order. Defaults to once, session, always and deny —
   * without "always" for high risk. Passing "always" here for a high-risk
   * capability is how you opt in to offering it.
   */
  options?: PermissionDecision[];
  onDecide: (decision: PermissionDecision) => void;
  /**
   * The answer, to control the prompt. A decision shows the one-line result;
   * `null` keeps the choices up until you set one. Leave it undefined and the
   * prompt shows its own result after a choice.
   */
  decision?: PermissionDecision | null;
  /** Offer "Change" beside a result. */
  changeable?: boolean;
  /**
   * Move focus to the prompt when it appears. Off by default: a prompt that
   * takes focus can take a keypress meant for something else. Focus lands on
   * the prompt itself, not on "Allow", so a stray Enter grants nothing.
   */
  autoFocus?: boolean;
  /** Announce the prompt politely when it appears. Skipped when it takes focus or arrives decided. */
  announce?: boolean;
  labels?: Partial<PermissionPromptLabels>;
}

type FocusTarget = "outcome" | "choice" | "change";

export function PermissionPrompt({
  className,
  requester,
  capability,
  reason,
  options,
  onDecide,
  decision,
  changeable = true,
  autoFocus = false,
  announce = true,
  labels,
  children,
  ref,
  ...props
}: PermissionPromptProps) {
  const text = { ...DEFAULT_LABELS, ...labels };
  const headingId = useId();
  const riskId = `${headingId}-risk`;
  const outcomeId = `${headingId}-outcome`;
  const [ownDecision, setOwnDecision] = useState<PermissionDecision | null>(null);
  const [changing, setChanging] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  // How the prompt arrived, fixed at mount: a later prop change is not an arrival.
  const [arrival] = useState(() => ({ focus: autoFocus, decided: decision != null }));

  const rootRef = useRef<HTMLElement | null>(null);
  const outcomeRef = useRef<HTMLParagraphElement | null>(null);
  const changeRef = useRef<HTMLButtonElement | null>(null);
  // Where focus goes after the next swap. Set only by the person's own
  // actions, and only while focus is inside, so an answer applied elsewhere
  // (another tab, a replay) never moves it.
  const focusTarget = useRef<FocusTarget | null>(null);

  const current = decision === undefined ? ownDecision : decision;
  const decided = !changing && current !== null ? current : null;
  const risk = capability.risk;
  const heading = text.heading(requester, capability.title);
  const riskText = risk ? text.risk[risk] : undefined;
  const message = text.announcement(heading, riskText);
  const offered = options ?? defaultPermissionOptions(risk);
  const can = capability.can ?? [];
  const cannot = capability.cannot ?? [];

  useEffect(() => {
    if (arrival.focus) rootRef.current?.focus();
  }, [arrival]);

  const quiet = !announce || arrival.focus || arrival.decided;
  useEffect(() => {
    if (quiet) return;
    const timer = setTimeout(() => {
      setAnnouncement(message);
    }, ANNOUNCE_DELAY_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [quiet, message]);

  function queueFocus(target: FocusTarget) {
    const inside = rootRef.current?.contains(document.activeElement) ?? false;
    focusTarget.current = inside ? target : null;
  }

  useLayoutEffect(() => {
    const target = focusTarget.current;
    const root = rootRef.current;
    if (!target || !root) return;
    const element =
      target === "outcome"
        ? outcomeRef.current
        : target === "change"
          ? changeRef.current
          : (root.querySelector<HTMLElement>(`[data-choice="${current ?? ""}"]`) ??
            root.querySelector<HTMLElement>("[data-choice]"));
    if (!element) return;
    focusTarget.current = null;
    // If the person moved on while the answer was pending, leave them be.
    const active = document.activeElement;
    if (!active || active === document.body || root.contains(active)) element.focus();
  }, [decided, current]);

  function choose(option: PermissionDecision) {
    queueFocus("outcome");
    setChanging(false);
    if (decision === undefined) setOwnDecision(option);
    onDecide(option);
  }

  const setRootRef = (node: HTMLElement | null) => {
    rootRef.current = node;
    if (typeof ref === "function") return ref(node);
    if (ref) ref.current = node;
  };

  return (
    <section
      ref={setRootRef}
      data-slot="permission-prompt"
      // Answering the agent is not taking the page back from it (see agent-surface).
      data-agent-ui=""
      data-state={decided === null ? "pending" : "decided"}
      data-decision={current ?? undefined}
      data-risk={risk}
      aria-labelledby={headingId}
      tabIndex={arrival.focus ? -1 : undefined}
      className={cn(
        permissionPromptVariants({ state: decided === null ? "pending" : "decided", risk }),
        arrival.focus && focusRing,
        className,
      )}
      {...props}
    >
      {/* Present from mount and filled a moment later, so the arrival is heard. */}
      <span role="status" data-slot="permission-prompt-status" className="sr-only">
        {announcement}
      </span>

      {decided === null ? (
        <>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 id={headingId} className="text-sm font-medium">
              {heading}
            </h3>
            {risk ? (
              <span
                id={riskId}
                data-slot="permission-prompt-risk"
                className={permissionRiskVariants({ risk })}
              >
                <RiskIcon risk={risk} />
                {riskText}
              </span>
            ) : null}
          </div>

          {reason ? (
            <p data-slot="permission-prompt-reason" className="mt-1">
              {typeof reason === "string" ? asSentence(reason) : reason}
            </p>
          ) : null}
          {capability.description ? (
            <p data-slot="permission-prompt-description" className="mt-1 text-muted-foreground">
              {capability.description}
            </p>
          ) : null}
          {capability.scope ? (
            <p
              data-slot="permission-prompt-scope"
              className="mt-1 text-xs text-muted-foreground"
            >
              {text.scope}: <span className="text-foreground">{capability.scope}</span>
            </p>
          ) : null}

          {can.length > 0 || cannot.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-3">
              {can.length > 0 ? (
                <CapabilityList
                  slot="permission-prompt-can"
                  title={text.can(requester)}
                  items={can}
                />
              ) : null}
              {cannot.length > 0 ? (
                <CapabilityList
                  slot="permission-prompt-cannot"
                  title={text.cannot(requester)}
                  items={cannot}
                />
              ) : null}
            </div>
          ) : null}

          <div
            data-slot="permission-prompt-choices"
            className="mt-4 flex flex-wrap items-center gap-2"
          >
            {offered.map((option) => (
              <button
                key={option}
                type="button"
                data-slot="permission-prompt-choice"
                data-choice={option}
                // Someone tabbing straight to Allow still hears the risk.
                aria-describedby={risk && option !== "deny" ? riskId : undefined}
                className={permissionChoiceVariants({
                  variant: option === "once" ? "primary" : "default",
                })}
                onClick={() => {
                  choose(option);
                }}
              >
                {text.choice[option]}
              </button>
            ))}
            {changing ? (
              <button
                type="button"
                data-slot="permission-prompt-cancel"
                className={permissionChoiceVariants({ variant: "quiet" })}
                onClick={() => {
                  queueFocus("change");
                  setChanging(false);
                }}
              >
                {text.cancel}
              </button>
            ) : null}
          </div>
        </>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <div className="flex min-w-0 flex-col gap-0.5">
            <h3 id={headingId} className="text-sm font-medium">
              {heading}
            </h3>
            {/* tabIndex -1: a focus target for the person who just answered,
                so they hear the result, but never a Tab stop. */}
            <p
              ref={outcomeRef}
              id={outcomeId}
              tabIndex={-1}
              data-slot="permission-prompt-outcome"
              className="text-xs text-muted-foreground outline-none"
            >
              {text.outcome[decided]}
            </p>
          </div>
          {changeable ? (
            <button
              ref={changeRef}
              type="button"
              data-slot="permission-prompt-change"
              // "Change" alone is ambiguous in a list of past prompts.
              aria-describedby={`${headingId} ${outcomeId}`}
              className={permissionChoiceVariants({ variant: "quiet" })}
              onClick={() => {
                queueFocus("choice");
                setChanging(true);
              }}
            >
              {text.change}
            </button>
          ) : null}
        </div>
      )}

      {children}
    </section>
  );
}

export interface UsePermissionPromptOptions {
  /** Keeps "always" grants between visits. Without one, "Always allow" is not offered by default. */
  store?: PermissionStore;
  /** Called when the store fails. Defaults to `reportError`. */
  onError?: (error: unknown) => void;
  labels?: Partial<PermissionPromptLabels>;
}

export interface UsePermissionPromptResult {
  /**
   * Resolves with the person's answer — or at once, without asking, when a
   * session or always grant already covers the capability.
   */
  request: (
    capability: PermissionCapability,
    details: PermissionRequestDetails,
  ) => Promise<PermissionDecision>;
  /** The request in front of the person, or the last answer; null before the first. */
  prompt: ReactNode | null;
  grants: readonly PermissionGrant[];
  /** Forgets grants for a capability, in memory and in the store. */
  revoke: (capabilityId: string, scope?: string) => Promise<void>;
}

/**
 * Permission an app or agent tool can await.
 *
 * Requests queue and are shown one at a time, with the number waiting stated.
 * "Allow for this session" lasts as long as the hook is mounted; "Always
 * allow" is written to `store`. The answer stays on screen until the next
 * request. When the person answers from inside the prompt, focus moves to the
 * next request, or to the result when none is left, never to the page. If the
 * hook unmounts with requests waiting, they are refused: an agent left waiting
 * on a question nobody can see eventually times out and asks again.
 *
 * The store is read once, when the hook first renders.
 */
export function usePermissionPrompt({
  store,
  onError,
  labels,
}: UsePermissionPromptOptions = {}): UsePermissionPromptResult {
  const [queue] = useState(() => createPermissionQueue(createGrantStore({ store, onError })));
  const snapshot = useSyncExternalStore(queue.subscribe, queue.getSnapshot, queue.getSnapshot);
  const grants = useSyncExternalStore(
    queue.grants.subscribe,
    queue.grants.list,
    queue.grants.list,
  );
  const promptRef = useRef<HTMLElement | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);

  useEffect(() => {
    queue.open();
    let shown = queue.getSnapshot().current?.id ?? null;
    // Runs as the queue changes, before React re-renders, so focus is still
    // where the person left it: in the prompt about to be replaced, or not.
    const unsubscribe = queue.subscribe(() => {
      const next = queue.getSnapshot().current?.id ?? null;
      const inside = promptRef.current?.contains(document.activeElement) ?? false;
      if (next !== null && next !== shown && inside) setFocusId(next);
      shown = next;
    });
    return () => {
      unsubscribe();
      queue.close();
    };
  }, [queue]);

  const text = { ...DEFAULT_LABELS, ...labels };
  const current = snapshot.current;
  const shown = current ?? snapshot.last?.request ?? null;

  const prompt = shown ? (
    <PermissionPrompt
      key={shown.id}
      ref={promptRef}
      requester={shown.requester}
      capability={shown.capability}
      reason={shown.reason}
      options={shown.options}
      // The request has already been answered by the time a result shows, so
      // there is nothing for "Change" to change; `revoke` withdraws a grant.
      decision={current ? null : (snapshot.last?.decision ?? null)}
      changeable={false}
      autoFocus={focusId === shown.id}
      labels={labels}
      onDecide={(decision) => {
        if (current) queue.decide(current.id, decision);
      }}
    >
      {current && snapshot.waiting > 0 ? (
        <p data-slot="permission-prompt-waiting" className="mt-3 text-xs text-muted-foreground">
          {text.waiting(snapshot.waiting)}
        </p>
      ) : null}
    </PermissionPrompt>
  ) : null;

  return { request: queue.request, prompt, grants, revoke: queue.grants.revoke };
}
