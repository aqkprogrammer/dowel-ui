"use client";

import { useMemo, type ComponentPropsWithRef, type ReactNode } from "react";

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
}

export function DiffViewer({
  className,
  hunks,
  label,
  view = "unified",
  decisions,
  onDecision,
  children,
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
}: {
  hunk: DiffHunk;
  label: string;
  view: "unified" | "split";
  decision?: HunkDecision;
  onDecision?: (hunkId: string, decision: HunkDecision) => void;
}) {
  const splitRows = useMemo(
    () => (view === "split" ? toSplitRows(hunk.rows) : []),
    [view, hunk.rows],
  );

  return (
    <section
      data-slot="diff-hunk"
      data-decision={decision}
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

      <div className="overflow-x-auto">
        <table data-slot="diff-table" className="w-full border-collapse font-mono text-xs">
          <tbody>
            {view === "split"
              ? splitRows.map((pair, index) => (
                  <tr key={index} data-slot="diff-row">
                    <SplitCell row={pair.left} side="before" />
                    <SplitCell row={pair.right} side="after" />
                  </tr>
                ))
              : hunk.rows.map((row, index) => <UnifiedRow key={index} row={row} />)}
          </tbody>
        </table>
      </div>
    </section>
  );
}

const ROW_STYLES: Record<DiffRow["kind"], string> = {
  added: "bg-success/10",
  removed: "bg-destructive/10",
  context: "",
};

function UnifiedRow({ row }: { row: DiffRow }) {
  return (
    <tr data-slot="diff-row" data-kind={row.kind} className={ROW_STYLES[row.kind]}>
      <LineNumber value={row.before} />
      <LineNumber value={row.after} />
      <td className="w-4 pr-1 text-center text-muted-foreground select-none" aria-hidden="true">
        {row.kind === "added" ? "+" : row.kind === "removed" ? "−" : ""}
      </td>
      <td className="w-full py-0.5 pr-3 break-all whitespace-pre-wrap">
        {/* The kind, for anyone who cannot see the sign or the tint. Reading a
            diff aloud without it is reading the same file twice. */}
        <span className="sr-only">{KIND_LABEL[row.kind]}: </span>
        <RowContent row={row} />
      </td>
    </tr>
  );
}

function SplitCell({ row, side }: { row: DiffRow | null; side: "before" | "after" }) {
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

  return (
    <>
      <LineNumber value={side === "before" ? row.before : row.after} />
      <td
        className={cn("w-1/2 py-0.5 pr-3 break-all whitespace-pre-wrap", ROW_STYLES[row.kind])}
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
      className="w-10 border-r border-border bg-muted/40 px-2 py-0.5 text-right text-muted-foreground tabular-nums select-none"
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
