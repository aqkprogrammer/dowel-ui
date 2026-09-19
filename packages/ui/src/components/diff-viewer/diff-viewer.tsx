"use client";

// Motion from SmoothUI AI Diff (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
  type ReactNode,
} from "react";

import { disabledStyles, focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

import { countChanges, toSplitRows, type DiffHunk, type DiffRow } from "./diff-model";

/**
 * A diff, and a decision about it.
 *
 * The rendering half exists because every packaged viewer brings its own
 * styling system — emotion, or HTML strings plus a stylesheet — which design
 * tokens cannot reach and which is awkward under RSC. The deciding half exists
 * because Dowel is for AI products, and an agent proposing a change to a file is
 * the case that needs it: what every coding agent ships, and no component
 * library does.
 *
 * Decisions are controlled. The component never mutates the diff or applies
 * anything; it reports which hunks were accepted and rejected and leaves the
 * consequences to the application, the same way ai-action-ledger does.
 *
 * Not a grid. A code listing is a table of text, and role="grid" would promise
 * cell-by-cell arrow navigation that neither exists here nor makes sense for
 * reading code. Line kind is carried in text, because a plus sign and a green
 * background are not information.
 */

export type HunkDecision = "accepted" | "rejected";

const KIND_LABEL: Record<DiffRow["kind"], string> = {
  added: "Added",
  removed: "Removed",
  context: "Unchanged",
};

export interface DiffViewerProps extends Omit<ComponentPropsWithRef<"div">, "children"> {
  hunks: DiffHunk[];
  /** Names the diff — usually the path of the file being changed. */
  label: string;
  view?: "unified" | "split";
  /** Per-hunk decisions, keyed by hunk id. Controlled. */
  decisions?: Record<string, HunkDecision>;
  onDecision?: (hunkId: string, decision: HunkDecision) => void;
  children?: ReactNode;
  /**
   * Entrance for added lines. `wipe` draws each one in along the reading
   * direction, a line after the other; context and removed lines were already
   * there and do not move.
   */
  entrance?: "none" | "wipe";
  /**
   * Collapse a rejected hunk's lines. Its header and controls stay, so the
   * decision can still be reversed, and the header says the lines are hidden.
   */
  collapseRejected?: boolean;
}

const PREFIX = "dowel-diff-viewer";

/* The wipe reveals an added line's code (never its line numbers) in reading
 * order; its stagger is capped so a long diff does not take seconds to appear.
 * The flash is a one-shot tint when a hunk's decision changes. */
const STYLES = `
@keyframes ${PREFIX}-wipe{from{clip-path:inset(0 100% 0 0)}}
@keyframes ${PREFIX}-wipe-rtl{from{clip-path:inset(0 0 0 100%)}}
@keyframes ${PREFIX}-flash-accepted{from{background-color:color-mix(in oklab,var(--color-success) 14%,transparent)}}
@keyframes ${PREFIX}-flash-rejected{from{background-color:color-mix(in oklab,var(--color-destructive) 12%,transparent)}}
.${PREFIX}-wipe{animation:${PREFIX}-wipe calc(280ms * var(--motion-scale,1)) var(--ease-out-quint) both;animation-delay:calc(var(--dowel-i,0) * 20ms * var(--motion-scale,1))}
.${PREFIX}-wipe:dir(rtl){animation-name:${PREFIX}-wipe-rtl}
[data-slot=diff-hunk][data-decision-changed=accepted]{animation:${PREFIX}-flash-accepted calc(350ms * var(--motion-scale,1)) var(--ease-out-quint)}
[data-slot=diff-hunk][data-decision-changed=rejected]{animation:${PREFIX}-flash-rejected calc(350ms * var(--motion-scale,1)) var(--ease-out-quint)}
`;

/** Lines after this many in a hunk share the last one's delay. */
const WIPE_STAGGER_CAP = 20;

/** Props for the content cell of an added line under `entrance="wipe"`. */
function wipe(index: number): { className: string; style: CSSProperties } {
  return {
    className: `${PREFIX}-wipe`,
    style: { "--dowel-i": Math.min(index, WIPE_STAGGER_CAP) } as CSSProperties,
  };
}

export function DiffViewer({
  className,
  hunks,
  label,
  view = "unified",
  decisions,
  onDecision,
  children,
  entrance = "none",
  collapseRejected = false,
  ...props
}: DiffViewerProps) {
  const counts = useMemo(() => countChanges(hunks), [hunks]);

  return (
    <div
      data-slot="diff-viewer"
      data-view={view}
      className={cn("flex flex-col gap-2", className)}
      {...props}
    >
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-mono text-sm font-medium">{label}</span>
        {/* Said in words as well as coloured, and before the diff rather than
            after it: a reader deserves to know the size of the change before
            they start reading it. */}
        <span data-slot="diff-viewer-summary" className="text-xs text-muted-foreground">
          <span className="text-success">+{counts.added}</span>{" "}
          <span className="text-destructive">−{counts.removed}</span>
          <span className="sr-only">
            {` — ${String(counts.added)} lines added, ${String(counts.removed)} removed`}
          </span>
        </span>
      </div>

      {children}

      {hunks.length === 0 ? (
        <p className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
          No changes.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          {hunks.map((hunk) => (
            <DiffHunkView
              key={hunk.id}
              hunk={hunk}
              label={label}
              view={view}
              decision={decisions?.[hunk.id]}
              onDecision={onDecision}
              entrance={entrance}
              collapseRejected={collapseRejected}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DiffHunkView({
  hunk,
  label,
  view,
  decision,
  onDecision,
  entrance,
  collapseRejected,
}: {
  hunk: DiffHunk;
  label: string;
  view: "unified" | "split";
  decision?: HunkDecision;
  onDecision?: (hunkId: string, decision: HunkDecision) => void;
  entrance: "none" | "wipe";
  collapseRejected: boolean;
}) {
  const splitRows = useMemo(
    () => (view === "split" ? toSplitRows(hunk.rows) : []),
    [view, hunk.rows],
  );

  // A decision that changes after mount flashes once. Tracked during render,
  // so a decision present on first render (a replay) does not flash.
  const [previous, setPrevious] = useState(decision);
  const [flash, setFlash] = useState<HunkDecision | undefined>(undefined);
  if (decision !== previous) {
    setPrevious(decision);
    setFlash(decision);
  }

  // A native listener rather than onAnimationEnd: React picks a vendor-prefixed
  // event name wherever AnimationEvent is missing, and would never hear it.
  const sectionRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const section = sectionRef.current;
    if (!section || !flash) return;
    const clear = (event: Event) => {
      // Wiped lines end their own animations inside the hunk; only the
      // hunk's flash clears the flag.
      if (event.target === section) setFlash(undefined);
    };
    section.addEventListener("animationend", clear);
    return () => {
      section.removeEventListener("animationend", clear);
    };
  }, [flash]);

  const wiping = entrance === "wipe";
  const collapsed = collapseRejected && decision === "rejected";
  const hiddenNote = collapsed ? <span className="sr-only"> — lines hidden</span> : null;

  const table = (
    <div className="overflow-x-auto">
      <table data-slot="diff-table" className="w-full border-collapse font-mono text-xs">
        <tbody>
          {view === "split"
            ? splitRows.map((pair, index) => (
                <tr key={index} data-slot="diff-row">
                  <SplitCell row={pair.left} side="before" />
                  <SplitCell
                    row={pair.right}
                    side="after"
                    wipeIndex={wiping ? index : undefined}
                  />
                </tr>
              ))
            : hunk.rows.map((row, index) => (
                <UnifiedRow key={index} row={row} wipeIndex={wiping ? index : undefined} />
              ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <section
      data-slot="diff-hunk"
      data-decision={decision}
      ref={sectionRef}
      data-decision-changed={flash}
      aria-label={`${label}, hunk ${hunk.id}`}
      className={cn(
        "border-b border-border last:border-b-0",
        decision === "rejected" && "opacity-55",
      )}
    >
      {hunk.skippedBefore > 0 ? (
        <p
          data-slot="diff-hunk-skipped"
          className="border-b border-border bg-muted/40 px-3 py-1 font-mono text-2xs text-muted-foreground"
        >
          {hunk.skippedBefore} unchanged {hunk.skippedBefore === 1 ? "line" : "lines"} hidden
        </p>
      ) : null}

      {onDecision ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/20 px-3 py-1.5">
          <span className="flex-1 text-xs text-muted-foreground">
            {decision === "accepted"
              ? "Accepted"
              : decision === "rejected"
                ? "Rejected"
                : "Not decided"}
            {hiddenNote}
          </span>
          <HunkButton
            pressed={decision === "accepted"}
            onClick={() => {
              onDecision(hunk.id, "accepted");
            }}
          >
            Accept
          </HunkButton>
          <HunkButton
            pressed={decision === "rejected"}
            onClick={() => {
              onDecision(hunk.id, "rejected");
            }}
          >
            Reject
          </HunkButton>
        </div>
      ) : null}

      {!onDecision ? hiddenNote : null}

      {collapseRejected ? (
        // Grid rows animate between 1fr and 0fr, which is a height transition
        // CSS can do. Collapsed lines are inert: hidden, and out of reach.
        <div
          data-slot="diff-hunk-lines"
          data-collapsed={collapsed || undefined}
          className={cn(
            "grid transition-[grid-template-rows,opacity] duration-[calc(250ms*var(--motion-scale))] ease-[var(--ease-out-quint)]",
            collapsed ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr]",
          )}
        >
          <div className="min-h-0 overflow-hidden" inert={collapsed || undefined}>
            {table}
          </div>
        </div>
      ) : (
        table
      )}
    </section>
  );
}

const ROW_STYLES: Record<DiffRow["kind"], string> = {
  added: "bg-success/10",
  removed: "bg-destructive/10",
  context: "",
};

function UnifiedRow({ row, wipeIndex }: { row: DiffRow; wipeIndex?: number }) {
  const motion = wipeIndex !== undefined && row.kind === "added" ? wipe(wipeIndex) : undefined;
  return (
    <tr data-slot="diff-row" data-kind={row.kind} className={ROW_STYLES[row.kind]}>
      <LineNumber value={row.before} />
      <LineNumber value={row.after} />
      <td className="w-4 pe-1 text-center text-muted-foreground select-none" aria-hidden="true">
        {row.kind === "added" ? "+" : row.kind === "removed" ? "−" : ""}
      </td>
      <td
        className={cn("w-full py-0.5 pe-3 break-all whitespace-pre-wrap", motion?.className)}
        style={motion?.style}
      >
        {/* The kind, for anyone who cannot see the sign or the tint. Reading a
            diff aloud without it is reading the same file twice. */}
        <span className="sr-only">{KIND_LABEL[row.kind]}: </span>
        <RowContent row={row} />
      </td>
    </tr>
  );
}

function SplitCell({
  row,
  side,
  wipeIndex,
}: {
  row: DiffRow | null;
  side: "before" | "after";
  wipeIndex?: number;
}) {
  if (!row) {
    // An empty half of a pair, not a blank line of code. Hidden from assistive
    // technology so a reader is not read padding.
    return (
      <>
        <td aria-hidden="true" className="w-10 bg-muted/40" />
        <td aria-hidden="true" className="w-1/2 bg-muted/20" />
      </>
    );
  }

  const motion = wipeIndex !== undefined && row.kind === "added" ? wipe(wipeIndex) : undefined;

  return (
    <>
      <LineNumber value={side === "before" ? row.before : row.after} />
      <td
        className={cn(
          "w-1/2 py-0.5 pe-3 break-all whitespace-pre-wrap",
          ROW_STYLES[row.kind],
          motion?.className,
        )}
        style={motion?.style}
      >
        <span className="sr-only">{KIND_LABEL[row.kind]}: </span>
        <RowContent row={row} />
      </td>
    </>
  );
}

function RowContent({ row }: { row: DiffRow }) {
  if (!row.segments) return <>{row.content}</>;

  return (
    <>
      {row.segments.map((segment, index) =>
        segment.changed ? (
          // A mark element, so the changed words survive as structure rather
          // than existing only as a slightly stronger background.
          <mark
            key={index}
            className={cn(
              "rounded-[2px] text-inherit",
              row.kind === "added" ? "bg-success/30" : "bg-destructive/30",
            )}
          >
            {segment.text}
          </mark>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </>
  );
}

function LineNumber({ value }: { value?: number }) {
  return (
    <td
      // Decorative: the line number is orientation for a sighted reader, and
      // announcing two numbers before every line makes the diff unlistenable.
      aria-hidden="true"
      className="w-10 border-e border-border bg-muted/40 px-2 py-0.5 text-end text-muted-foreground tabular-nums select-none"
    >
      {value ?? ""}
    </td>
  );
}

function HunkButton({
  className,
  pressed,
  ...props
}: ComponentPropsWithRef<"button"> & { pressed: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={cn(
        "rounded-md border px-2 py-0.5 text-xs font-medium transition-colors",
        pressed
          ? "border-primary bg-primary text-primary-foreground"
          : "border-input bg-background hover:bg-accent hover:text-accent-foreground",
        focusRing,
        disabledStyles,
        className,
      )}
      {...props}
    />
  );
}

/** Switches between unified and side-by-side. */
export function DiffViewerToolbar({
  className,
  view,
  onViewChange,
  ...props
}: Omit<ComponentPropsWithRef<"div">, "onChange"> & {
  view: "unified" | "split";
  onViewChange: (view: "unified" | "split") => void;
}) {
  return (
    <div
      data-slot="diff-viewer-toolbar"
      role="group"
      aria-label="Diff layout"
      className={cn("flex items-center gap-1", className)}
      {...props}
    >
      {(["unified", "split"] as const).map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={view === option}
          onClick={() => {
            onViewChange(option);
          }}
          className={cn(
            "rounded-md border px-2 py-0.5 text-xs font-medium capitalize transition-colors",
            view === option
              ? "border-transparent bg-secondary text-secondary-foreground"
              : "border-input bg-background text-muted-foreground hover:text-foreground",
            focusRing,
          )}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
