"use client";

// Motion from SmoothUI AI Approval (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import {
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type ReactNode,
} from "react";

import { disabledStyles, focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/**
 * The gate between an agent deciding to act and it acting.
 *
 * Two things separate this from the confirmations that already exist.
 *
 * The first is that the proposed arguments are editable. Every implementation
 * surveyed returns a boolean over a read-only payload, which forces a false
 * choice: approve a call whose recipient is wrong, or deny it and make the
 * model try again. "Approve this, but fix the address first" is the answer
 * people actually want, and it is only possible if the arguments are fields.
 * Edited values come back in the decision, and are marked as changed so an
 * audit trail can tell the model's proposal from the human's correction.
 *
 * The second is that it renders while the arguments are still arriving. The
 * common implementation returns null until the tool input is complete, which
 * means nothing is on screen at the moment approval becomes relevant and the
 * request appears abruptly, fully formed. Here the request is visible as it
 * forms, with the decision held until there is something whole to decide on.
 */

export type ApprovalScope = "once" | "always";

export type ApprovalDecision =
  | {
      approved: true;
      scope: ApprovalScope;
      arguments: Record<string, string>;
      edited: string[];
    }
  | { approved: false; reason?: string };

export interface ApprovalField {
  name: string;
  label: string;
  /** A textarea instead of a single line. For message bodies and prompts. */
  multiline?: boolean;
  /** Locked arguments are shown but not editable — an id, a resolved amount. */
  readOnly?: boolean;
}

export interface ApprovalRequestProps extends Omit<
  ComponentPropsWithRef<"section">,
  "onSubmit" | "children"
> {
  /** The tool the model wants to call, as it named it. */
  tool: string;
  /** What the call will do, in the reader's language rather than the API's. */
  summary: string;
  /** Proposed arguments. Missing keys are treated as still arriving. */
  arguments: Record<string, string>;
  /** Which arguments to show, in order, and which may be changed. */
  fields: ApprovalField[];
  onDecision: (decision: ApprovalDecision) => void;
  /**
   * True while the model is still producing the arguments. The request renders
   * anyway; only the decision waits.
   */
  streaming?: boolean;
  /**
   * Said plainly above the controls when the call cannot be taken back. Not a
   * severity colour — the sentence is the warning.
   */
  irreversible?: string;
  /** Set once decided, to render the outcome instead of the controls. */
  decision?: ApprovalDecision;
  children?: ReactNode;
  /**
   * Keep focus in the request as its controls swap: onto the outcome when a
   * decision lands, into the reason field when Deny… opens, and back to Deny…
   * from Back. Only acts when focus was already inside the request, so a
   * decision applied elsewhere (another tab, a replay) never steals focus.
   */
  manageFocus?: boolean;
}

const PREFIX = "dowel-ai-approval-request";

/* The outcome resolves in when a decision lands live (a replayed one does not
 * animate), and the deny panel rises in. */
const STYLES = `
@keyframes ${PREFIX}-resolve{from{opacity:0;scale:.97}}
@keyframes ${PREFIX}-reveal{from{opacity:0;translate:0 4px}}
[data-slot=approval-request][data-resolved=live] [data-slot=approval-outcome]{animation:${PREFIX}-resolve calc(250ms * var(--motion-scale,1)) var(--ease-out-quint) both}
[data-slot=approval-deny]{animation:${PREFIX}-reveal calc(200ms * var(--motion-scale,1)) var(--ease-out-quint) both}
`;

type FocusTarget = "outcome" | "reason" | "deny";

export function ApprovalRequest({
  className,
  tool,
  summary,
  arguments: proposed,
  fields,
  onDecision,
  streaming = false,
  irreversible,
  decision,
  children,
  manageFocus = true,
  ref,
  ...props
}: ApprovalRequestProps) {
  const headingId = useId();
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [denying, setDenying] = useState(false);
  const [reason, setReason] = useState("");

  // A decision present on first render is a replay: it neither animates nor
  // takes focus.
  const [initiallyDecided] = useState(decision !== undefined);
  const sectionRef = useRef<HTMLElement | null>(null);
  const outcomeRef = useRef<HTMLParagraphElement | null>(null);
  const reasonRef = useRef<HTMLTextAreaElement | null>(null);
  const denyRef = useRef<HTMLButtonElement | null>(null);
  // Where focus should go after the next swap. Set only by the reader's own
  // actions, and only while focus is inside the request.
  const focusTarget = useRef<FocusTarget | null>(null);

  function queueFocus(target: FocusTarget) {
    if (!manageFocus) return;
    const inside = sectionRef.current?.contains(document.activeElement) ?? false;
    focusTarget.current = inside ? target : null;
  }

  const decided = decision !== undefined;
  useLayoutEffect(() => {
    const target = focusTarget.current;
    if (!target) return;
    const element =
      target === "outcome"
        ? outcomeRef.current
        : target === "reason"
          ? reasonRef.current
          : denyRef.current;
    if (!element) return;
    focusTarget.current = null;
    // If the reader moved on while an async decision was pending, leave them be.
    const active = document.activeElement;
    const stillHere =
      !active || active === document.body || (sectionRef.current?.contains(active) ?? false);
    if (stillHere) element.focus();
  }, [decided, denying]);

  const setSectionRef = (node: HTMLElement | null) => {
    sectionRef.current = node;
    if (typeof ref === "function") return ref(node);
    if (ref) ref.current = node;
  };

  const sheet = (
    <style href={PREFIX} precedence="dowel">
      {STYLES}
    </style>
  );

  // The model's proposal with the human's corrections applied on top. Keeping
  // them apart is what lets the component say which is which.
  const values = useMemo(() => ({ ...proposed, ...edits }), [proposed, edits]);

  const edited = useMemo(
    () => Object.keys(edits).filter((name) => edits[name] !== proposed[name]),
    [edits, proposed],
  );

  const missing = fields.filter((field) => proposed[field.name] === undefined);
  const settled = !streaming && missing.length === 0;

  if (decision) {
    return (
      <section
        ref={setSectionRef}
        data-slot="approval-request"
        data-agent-ui=""
        data-state={decision.approved ? "approved" : "denied"}
        data-resolved={initiallyDecided ? undefined : "live"}
        aria-labelledby={headingId}
        className={cn(
          "rounded-lg border p-4 text-sm",
          decision.approved ? "border-border bg-muted/40" : "border-border bg-muted/40",
          className,
        )}
        {...props}
      >
        {sheet}
        <h3 id={headingId} className="text-sm font-medium">
          {summary}
        </h3>
        {/* tabIndex -1: a focus target for the person who just decided, so
            they hear the outcome, but never a Tab stop. */}
        <p
          ref={outcomeRef}
          tabIndex={-1}
          data-slot="approval-outcome"
          className="mt-1 text-xs text-muted-foreground outline-none"
        >
          {decision.approved
            ? `Approved ${decision.scope === "always" ? "for every call to this tool" : "once"}` +
              (decision.edited.length > 0
                ? `, with ${String(decision.edited.length)} argument${decision.edited.length === 1 ? "" : "s"} corrected`
                : "")
            : `Denied${decision.reason ? `: ${decision.reason}` : ""}`}
        </p>
      </section>
    );
  }

  return (
    <section
      ref={setSectionRef}
      data-slot="approval-request"
      // Deciding on the agent's request is not taking the page back from it
      // (see agent-surface's takeOverOn).
      data-agent-ui=""
      data-state={settled ? "pending" : "forming"}
      aria-labelledby={headingId}
      // Busy while the arguments are still arriving, so a reader is told the
      // request is not yet whole rather than acting on half of it.
      aria-busy={!settled}
      className={cn("rounded-lg border border-border bg-card p-4", className)}
      {...props}
    >
      {sheet}
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id={headingId} className="text-sm font-medium">
          {summary}
        </h3>
        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-2xs text-muted-foreground">
          {tool}
        </code>
      </div>

      <dl className="mt-3 flex flex-col gap-2.5">
        {fields.map((field) => {
          const arrived = proposed[field.name] !== undefined;
          const changed = edited.includes(field.name);

          return (
            <ApprovalArgument
              key={field.name}
              field={field}
              value={values[field.name] ?? ""}
              arrived={arrived}
              changed={changed}
              onChange={(next) => {
                setEdits((current) => ({ ...current, [field.name]: next }));
              }}
            />
          );
        })}
      </dl>

      {children}

      {irreversible ? (
        <p data-slot="approval-warning" className="mt-3 text-xs text-destructive">
          {irreversible}
        </p>
      ) : null}

      {denying ? (
        <div data-slot="approval-deny" className="mt-3 flex flex-col gap-2">
          <label htmlFor={`${headingId}-reason`} className="text-xs text-muted-foreground">
            Why not? The model sees this.
          </label>
          <textarea
            ref={reasonRef}
            id={`${headingId}-reason`}
            rows={2}
            value={reason}
            onChange={(event) => {
              setReason(event.target.value);
            }}
            className={cn(
              "w-full resize-none rounded-md border border-input bg-background px-2 py-1.5 text-sm",
              focusRing,
            )}
          />
          <div className="flex flex-wrap gap-2">
            <Action
              variant="destructive"
              onClick={() => {
                queueFocus("outcome");
                onDecision({ approved: false, reason: reason.trim() || undefined });
              }}
            >
              Deny
            </Action>
            <Action
              onClick={() => {
                queueFocus("deny");
                setDenying(false);
              }}
            >
              Back
            </Action>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Action
            variant="primary"
            disabled={!settled}
            onClick={() => {
              queueFocus("outcome");
              onDecision({ approved: true, scope: "once", arguments: values, edited });
            }}
          >
            {edited.length > 0 ? "Approve with changes" : "Approve once"}
          </Action>

          {/* Scope is a separate decision from approval, and blanket consent
              should never be the easiest button to reach. */}
          <Action
            disabled={!settled}
            onClick={() => {
              queueFocus("outcome");
              onDecision({ approved: true, scope: "always", arguments: values, edited });
            }}
          >
            Always allow {tool}
          </Action>

          <Action
            ref={denyRef}
            onClick={() => {
              queueFocus("reason");
              setDenying(true);
            }}
          >
            Deny…
          </Action>

          {!settled ? (
            <span aria-live="polite" className="text-xs text-muted-foreground">
              Waiting for the model to finish the request
            </span>
          ) : null}
        </div>
      )}
    </section>
  );
}

function ApprovalArgument({
  field,
  value,
  arrived,
  changed,
  onChange,
}: {
  field: ApprovalField;
  value: string;
  arrived: boolean;
  changed: boolean;
  onChange: (value: string) => void;
}) {
  const id = useId();
  const changedId = useId();
  const editable = !field.readOnly && arrived;

  return (
    <div
      data-slot="approval-argument"
      data-changed={changed || undefined}
      className="flex flex-col gap-1"
    >
      <dt className="flex items-baseline gap-1">
        <label htmlFor={editable ? id : undefined} className="text-xs text-muted-foreground">
          {field.label}
        </label>
        {/* Outside the label, and attached as a description instead. Inside it,
            editing a field would rename the field — a screen reader user would
            hear its accessible name change under them mid-edit. Marked in text
            rather than by border colour alone, because an audit trail has to
            tell the model's proposal from the human's correction. */}
        {changed ? (
          <span id={changedId} className="text-xs text-warning">
            · changed from the model&rsquo;s proposal
          </span>
        ) : null}
      </dt>
      <dd className="m-0">
        {!arrived ? (
          <span
            aria-hidden="true"
            className="block h-8 w-full animate-pulse-soft rounded-md bg-muted"
          />
        ) : editable ? (
          field.multiline ? (
            <textarea
              id={id}
              aria-describedby={changed ? changedId : undefined}
              rows={3}
              value={value}
              onChange={(event) => {
                onChange(event.target.value);
              }}
              className={cn(
                "w-full resize-none rounded-md border border-input bg-background px-2 py-1.5 font-mono text-xs",
                changed && "border-warning",
                focusRing,
              )}
            />
          ) : (
            <input
              id={id}
              type="text"
              aria-describedby={changed ? changedId : undefined}
              value={value}
              onChange={(event) => {
                onChange(event.target.value);
              }}
              className={cn(
                "w-full rounded-md border border-input bg-background px-2 py-1.5 font-mono text-xs",
                changed && "border-warning",
                focusRing,
              )}
            />
          )
        ) : (
          <p className="rounded-md bg-muted px-2 py-1.5 font-mono text-xs break-words">
            {value}
          </p>
        )}
      </dd>
    </div>
  );
}

function Action({
  className,
  variant = "default",
  ...props
}: ComponentPropsWithRef<"button"> & { variant?: "default" | "primary" | "destructive" }) {
  return (
    <button
      type="button"
      className={cn(
        "rounded-md border px-2.5 py-1 text-xs font-medium",
        "transition-[color,background-color,border-color,scale] duration-[var(--duration-fast)] ease-[var(--ease-out-quint)] active:scale-[0.99]",
        variant === "primary" &&
          "border-primary bg-primary text-primary-foreground hover:bg-primary-hover",
        variant === "destructive" &&
          "border-destructive bg-destructive text-destructive-foreground hover:bg-destructive/90",
        variant === "default" &&
          "border-input bg-background hover:bg-accent hover:text-accent-foreground",
        focusRing,
        disabledStyles,
        className,
      )}
      {...props}
    />
  );
}
