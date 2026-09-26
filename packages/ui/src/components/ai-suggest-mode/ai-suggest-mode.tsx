"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type KeyboardEvent,
} from "react";

import { useOptionalAgentSurface } from "@/components/agent-surface";
import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

import {
  applyHunks,
  describeHunk,
  hunksFromEdits,
  hunksFromRewrite,
  segmentsOf,
  type SuggestedEdit,
  type SuggestionDecision,
  type SuggestionHunk,
} from "./suggest-hunks";

// Installed, this file is what `@/components/ui/ai-suggest-mode` resolves to, so it
// exports everything the folder's index does: see scripts/audit/installed-imports.ts.
export {
  applyHunks,
  describeHunk,
  hunksFromEdits,
  hunksFromRewrite,
  segmentsOf,
  type SuggestedEdit,
  type SuggestionDecision,
  type SuggestionHunk,
  type SuggestionSegment,
} from "./suggest-hunks";

/**
 * Track changes for an agent's edits to text.
 *
 * An agent that rewrites a paragraph in place leaves the person two choices:
 * keep all of it or none of it. Suggest mode is the third — every change is
 * shown where it would go, with the agent's reason, and accepted or rejected
 * on its own. Nothing is applied until the person decides; the text that
 * comes out is the original with only the accepted changes in it.
 *
 * For prose. For code, `diff-viewer` decides hunk by hunk over lines.
 *
 * Inside an `AgentSurface`, when the last suggestion is decided the agent is
 * told which were accepted and which were not, with its next result — so the
 * next draft does not bring the rejected ones back.
 */

type Decisions = Record<string, SuggestionDecision | undefined>;

export interface SuggestModeSummary {
  accepted: SuggestionHunk[];
  rejected: SuggestionHunk[];
}

export interface SuggestModeProps extends Omit<
  ComponentPropsWithRef<"section">,
  "children" | "onChange"
> {
  /** The text the suggestions are against. It does not change while they are reviewed. */
  value: string;
  /** The agent's edits, each placed in the text by what it replaces. */
  edits?: SuggestedEdit[];
  /** Or the whole text rewritten, diffed word by word. Ignored when `edits` is given. */
  rewrite?: string;
  /** Controlled decisions, by suggestion id. */
  decisions?: Decisions;
  onDecisionsChange?: (decisions: Decisions) => void;
  /** The original with every accepted suggestion applied, whenever a decision changes. */
  onTextChange?: (text: string) => void;
  /** Once every suggestion is decided. */
  onComplete?: (text: string, summary: SuggestModeSummary) => void;
  /** Who is suggesting: "Claude". */
  author?: string;
  /** Tell the surface's agent what was decided. On by default inside a surface. */
  notifyAgent?: boolean;
  heading?: string;
}

const STATUS: Record<SuggestionDecision | "pending", string> = {
  pending: "Waiting",
  accepted: "Accepted",
  rejected: "Rejected",
};

const buttonClass = cn(
  "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
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

function summarise(hunks: SuggestionHunk[], decisions: Decisions): SuggestModeSummary {
  return {
    accepted: hunks.filter((hunk) => decisions[hunk.id] === "accepted"),
    rejected: hunks.filter((hunk) => decisions[hunk.id] === "rejected"),
  };
}

/** What the agent is told once the person has decided everything. */
export function describeReview({ accepted, rejected }: SuggestModeSummary): string {
  const total = accepted.length + rejected.length;
  const lines = [
    `The person reviewed your ${String(total)} suggested ${total === 1 ? "change" : "changes"}: ` +
      `accepted ${String(accepted.length)}, rejected ${String(rejected.length)}.`,
  ];
  if (accepted.length > 0) lines.push(`Accepted: ${accepted.map(describeHunk).join("; ")}.`);
  if (rejected.length > 0) {
    lines.push(`Rejected — do not suggest again: ${rejected.map(describeHunk).join("; ")}.`);
  }
  return lines.join("\n");
}

export function SuggestMode({
  className,
  value,
  edits,
  rewrite,
  decisions: decisionsProp,
  onDecisionsChange,
  onTextChange,
  onComplete,
  author = "The agent",
  notifyAgent,
  heading = "Suggested changes",
  ...props
}: SuggestModeProps) {
  const surface = useOptionalAgentSurface();
  const headingId = useId();
  const baseId = useId();

  const { hunks, stale } = useMemo(() => {
    if (edits) return hunksFromEdits(value, edits);
    return { hunks: rewrite === undefined ? [] : hunksFromRewrite(value, rewrite), stale: [] };
  }, [value, edits, rewrite]);

  const [decisionsState, setDecisionsState] = useState<Decisions>({});
  const decisions = decisionsProp ?? decisionsState;
  const pending = hunks.filter((hunk) => !decisions[hunk.id]);
  const summary = summarise(hunks, decisions);

  const itemRefs = useRef(new Map<string, HTMLLIElement>());
  const doneRef = useRef<HTMLParagraphElement | null>(null);
  /** A suggestion's id, or "done" for the summary. */
  const focusNext = useRef<string | null>(null);

  // After a decision, focus goes to the next suggestion still waiting — or to
  // the summary once none are — so a keyboard review never falls to the page.
  useEffect(() => {
    const target = focusNext.current;
    if (!target) return;
    focusNext.current = null;
    if (target === "done") doneRef.current?.focus();
    else itemRefs.current.get(target)?.querySelector<HTMLButtonElement>("button")?.focus();
  });

  const commit = (next: Decisions) => {
    if (decisionsProp === undefined) setDecisionsState(next);
    onDecisionsChange?.(next);
    const text = applyHunks(value, hunks, next);
    onTextChange?.(text);
    const stillPending = hunks.filter((hunk) => !next[hunk.id]);
    if (stillPending.length === 0 && hunks.length > 0) {
      const result = summarise(hunks, next);
      onComplete?.(text, result);
      if (surface && (notifyAgent ?? true)) surface.api.notify(describeReview(result));
    }
  };

  const decide = (hunk: SuggestionHunk, decision: SuggestionDecision | undefined) => {
    const next = { ...decisions, [hunk.id]: decision };
    if (decision) {
      const after = hunks.find(
        (candidate) => candidate.start > hunk.start && !next[candidate.id],
      );
      const before = hunks.find((candidate) => !next[candidate.id]);
      focusNext.current = (after ?? before)?.id ?? "done";
    }
    commit(next);
  };

  const decideAll = (decision: SuggestionDecision) => {
    const next = { ...decisions };
    for (const hunk of pending) next[hunk.id] = decision;
    focusNext.current = "done";
    commit(next);
  };

  const onKeys = (event: KeyboardEvent<HTMLButtonElement>, hunk: SuggestionHunk) => {
    if (event.metaKey || event.ctrlKey || event.altKey || decisions[hunk.id]) return;
    if (event.key === "a") {
      event.preventDefault();
      decide(hunk, "accepted");
    } else if (event.key === "r") {
      event.preventDefault();
      decide(hunk, "rejected");
    }
  };

  const itemId = (hunk: SuggestionHunk) => `${baseId}-${hunk.id}`;
  const total = hunks.length;

  return (
    <section
      data-slot="suggest-mode"
      aria-labelledby={headingId}
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-border bg-card p-4 text-sm",
        className,
      )}
      {...props}
    >
      <div className="flex flex-wrap items-center gap-2">
        <h3 id={headingId} className="me-auto text-sm font-medium">
          {heading}
        </h3>
        {/* Live from the start, so each decision's count is heard. */}
        <p
          data-slot="suggest-mode-count"
          role="status"
          className="text-xs text-muted-foreground"
        >
          {total === 0
            ? "No suggestions."
            : pending.length === 0
              ? ""
              : `${String(pending.length)} of ${String(total)} waiting`}
        </p>
        {pending.length > 0 ? (
          <div role="group" aria-label="Decide every suggestion" className="flex gap-1.5">
            <button
              type="button"
              className={secondaryClass}
              onClick={() => {
                decideAll("accepted");
              }}
            >
              Accept all {pending.length}
            </button>
            <button
              type="button"
              className={secondaryClass}
              onClick={() => {
                decideAll("rejected");
              }}
            >
              Reject all {pending.length}
            </button>
          </div>
        ) : null}
      </div>

      {/* The text with each change where it would go. Deletions and insertions
          are said in words, since not every screen reader announces del/ins. */}
      <div
        data-slot="suggest-mode-text"
        className="rounded-md border border-border bg-background p-3 leading-7 whitespace-pre-wrap"
      >
        {segmentsOf(value, hunks).map((segment, index) => {
          if (segment.kind === "text")
            return <span key={`t${String(index)}`}>{segment.text}</span>;
          const { hunk } = segment;
          const decision = decisions[hunk.id];
          if (decision === "accepted") {
            return (
              <span
                key={hunk.id}
                data-slot="suggest-mode-change"
                data-state="accepted"
                className="underline decoration-muted-foreground/60 decoration-dotted underline-offset-4"
              >
                {hunk.added}
              </span>
            );
          }
          if (decision === "rejected") return <span key={hunk.id}>{hunk.removed}</span>;
          return (
            <a
              key={hunk.id}
              href={`#${itemId(hunk)}`}
              data-slot="suggest-mode-change"
              data-state="pending"
              aria-label={`Suggestion ${String(hunks.indexOf(hunk) + 1)}: ${describeHunk(hunk)}`}
              onClick={(event) => {
                event.preventDefault();
                itemRefs.current
                  .get(hunk.id)
                  ?.querySelector<HTMLButtonElement>("button")
                  ?.focus();
              }}
              className={cn("rounded-sm no-underline", focusRing)}
            >
              {hunk.removed ? (
                <del className="bg-destructive/10 text-muted-foreground decoration-destructive/70">
                  {hunk.removed}
                </del>
              ) : null}
              {hunk.added ? (
                <ins className="bg-success/15 text-foreground underline decoration-success/70 decoration-2 underline-offset-2">
                  {hunk.added}
                </ins>
              ) : null}
            </a>
          );
        })}
      </div>

      {total > 0 && pending.length === 0 ? (
        <p
          ref={doneRef}
          tabIndex={-1}
          data-slot="suggest-mode-done"
          className="rounded-md bg-muted/50 px-3 py-2 text-sm outline-none"
        >
          All {total} reviewed: {summary.accepted.length} accepted, {summary.rejected.length}{" "}
          rejected.
        </p>
      ) : null}

      {stale.length > 0 ? (
        <p data-slot="suggest-mode-stale" className="text-xs text-muted-foreground">
          {stale.length === 1 ? "1 suggestion" : `${String(stale.length)} suggestions`} could
          not be placed, because the text{" "}
          {stale.length === 1 ? "it changes is" : "they change is"} not in this version:{" "}
          {stale.map((edit) => `“${edit.find}”`).join(", ")}.
        </p>
      ) : null}

      {total > 0 ? (
        <ol aria-label={`${author}'s suggestions`} className="flex flex-col gap-2">
          {hunks.map((hunk, index) => {
            const decision = decisions[hunk.id];
            const titleId = `${itemId(hunk)}-title`;
            return (
              <li
                key={hunk.id}
                id={itemId(hunk)}
                ref={(node) => {
                  if (node) itemRefs.current.set(hunk.id, node);
                  else itemRefs.current.delete(hunk.id);
                }}
                data-slot="suggest-mode-item"
                data-state={decision ?? "pending"}
                className="flex flex-wrap items-start gap-x-3 gap-y-1 rounded-md border border-border p-2.5 data-[state=accepted]:bg-muted/40 data-[state=rejected]:bg-muted/40"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <p id={titleId} className="font-medium">
                    {index + 1}. {describeHunk(hunk)}
                  </p>
                  {hunk.reason ? (
                    <p className="text-xs text-muted-foreground">Why: {hunk.reason}</p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    {STATUS[decision ?? "pending"]}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  {decision ? (
                    <button
                      type="button"
                      aria-describedby={titleId}
                      className={secondaryClass}
                      onClick={() => {
                        decide(hunk, undefined);
                      }}
                    >
                      Undo
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        aria-describedby={titleId}
                        aria-keyshortcuts="A"
                        onKeyDown={(event) => {
                          onKeys(event, hunk);
                        }}
                        className={primaryClass}
                        onClick={() => {
                          decide(hunk, "accepted");
                        }}
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        aria-describedby={titleId}
                        aria-keyshortcuts="R"
                        onKeyDown={(event) => {
                          onKeys(event, hunk);
                        }}
                        className={secondaryClass}
                        onClick={() => {
                          decide(hunk, "rejected");
                        }}
                      >
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      ) : null}
    </section>
  );
}
