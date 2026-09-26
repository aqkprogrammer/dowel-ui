"use client";

import { cva } from "class-variance-authority";
import { Fragment, useId, useState, type ComponentPropsWithRef, type ReactNode } from "react";

import { Button } from "@/components/button";
import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

import {
  mergeSegments,
  shareByAuthor,
  type ProvenanceAuthor,
  type ProvenanceAuthors,
  type ProvenanceKind,
  type ProvenanceSegment,
} from "./provenance";

// Installed, this file is what `@/components/ui/provenance-text` resolves to, so it
// exports everything the folder's index does: see scripts/audit/installed-imports.ts.
export {
  mergeSegments,
  provenanceFromEdit,
  shareByAuthor,
  type ProvenanceAuthor,
  type ProvenanceAuthors,
  type ProvenanceKind,
  type ProvenanceSegment,
  type ProvenanceShare,
} from "./provenance";

/**
 * Text that shows who wrote each part of it.
 *
 * Once a person and an agent have both edited a paragraph, and a sentence has
 * been pasted in from somewhere, nobody can tell by reading it which words are
 * whose. This keeps that visible on request: the person's words stay plain,
 * an agent's are highlighted and underlined, a source's have a dashed
 * underline and link to it, and a legend says how much each wrote.
 *
 * Hidden by default, so it reads as ordinary text until someone asks. Build
 * the segments with `provenanceFromEdit` as each edit lands.
 */

// Agent and source differ in the shape of the underline, not only its colour,
// so they stay apart in the monochrome preset and in forced colours, where
// backgrounds are dropped and every underline takes the text colour.
export const provenanceMarkVariants = cva(
  "rounded-xs box-decoration-clone underline-offset-4 motion-safe:transition-colors motion-safe:duration-[var(--duration-fast)]",
  {
    variants: {
      kind: {
        person: "",
        agent: "bg-primary/10 underline decoration-primary decoration-2",
        source: "underline decoration-muted-foreground decoration-dashed decoration-1",
      },
    },
    defaultVariants: { kind: "person" },
  },
);

const KIND_LABEL: Record<ProvenanceKind, string> = {
  person: "person",
  agent: "agent",
  source: "source",
};

/** An id the authors do not name is left unmarked rather than guessed at. */
function authorOf(authors: ProvenanceAuthors, id: string): ProvenanceAuthor {
  return authors[id] ?? { label: id, kind: "person" };
}

/** What a screen reader hears either side of marked words. */
function markers(author: ProvenanceAuthor): { start: string; end: string } {
  return author.kind === "source"
    ? { start: `Quoted from ${author.label}: `, end: " End quote. " }
    : { start: `${author.label} wrote: `, end: ` End of ${author.label}'s text. ` };
}

function renderMarks(
  segments: readonly ProvenanceSegment[],
  authors: ProvenanceAuthors,
  shown: boolean,
): ReactNode[] {
  return mergeSegments(segments).map((segment, index) => {
    const author = authorOf(authors, segment.author);
    const key = `${String(index)}-${segment.author}`;
    // Whitespace at either end stays outside the mark, so an underline never
    // trails into the gap before the next word.
    const [, lead = "", core = "", trail = ""] =
      /^(\s*)([\s\S]*?)(\s*)$/.exec(segment.text) ?? [];
    if (author.kind === "person" || !core) return <Fragment key={key}>{segment.text}</Fragment>;

    const { start, end } = markers(author);
    return (
      <Fragment key={key}>
        {lead}
        <span
          data-slot="provenance-mark"
          data-kind={author.kind}
          data-author={segment.author}
          data-state={shown ? "shown" : "hidden"}
          className={provenanceMarkVariants({ kind: shown ? author.kind : "person" })}
        >
          {/* Said, not shown. Unselectable, so copying the paragraph copies
              only the paragraph. */}
          {shown ? <span className="sr-only select-none">{start}</span> : null}
          {shown && author.href ? (
            <a href={author.href} className={cn("rounded-xs hover:bg-muted", focusRing)}>
              {core}
            </a>
          ) : (
            core
          )}
          {shown ? <span className="sr-only select-none">{end}</span> : null}
        </span>
        {trail}
      </Fragment>
    );
  });
}

export interface ProvenanceLegendProps extends Omit<ComponentPropsWithRef<"ul">, "children"> {
  segments: readonly ProvenanceSegment[];
  authors: ProvenanceAuthors;
}

/** Each author, what kind they are and how much they wrote, largest share first. */
export function ProvenanceLegend({
  className,
  segments,
  authors,
  "aria-label": ariaLabel = "Who wrote this",
  ...props
}: ProvenanceLegendProps) {
  const shares = shareByAuthor(segments);
  if (shares.length === 0) return null;

  return (
    <ul
      data-slot="provenance-legend"
      aria-label={ariaLabel}
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground",
        className,
      )}
      {...props}
    >
      {shares.map((share) => {
        const author = authorOf(authors, share.author);
        return (
          <li key={share.author} data-slot="provenance-legend-item" data-kind={author.kind}>
            {/* A sample of the mark, for the eye. The kind is also said in words. */}
            <span
              aria-hidden="true"
              className={cn(
                provenanceMarkVariants({ kind: author.kind }),
                "me-0.5 text-foreground select-none",
              )}
            >
              Abc
            </span>{" "}
            <span className="font-medium text-foreground">
              {author.href ? (
                <a
                  href={author.href}
                  className={cn("rounded-xs underline underline-offset-2", focusRing)}
                >
                  {author.label}
                </a>
              ) : (
                author.label
              )}
            </span>{" "}
            <span>({KIND_LABEL[author.kind]})</span>{" "}
            <span className="tabular-nums">{share.percent}%</span>
          </li>
        );
      })}
    </ul>
  );
}

export interface ProvenanceInlineProps extends Omit<ComponentPropsWithRef<"span">, "children"> {
  segments: readonly ProvenanceSegment[];
  authors: ProvenanceAuthors;
  /** Whether to mark who wrote what. Off, it is plain text. */
  show?: boolean;
}

/**
 * The marked text alone, as a span, for a layout that has its own paragraph
 * and its own control: a chat message, a table cell, a toggle in a toolbar
 * that covers several blocks.
 */
export function ProvenanceInline({
  className,
  segments,
  authors,
  show = true,
  ...props
}: ProvenanceInlineProps) {
  return (
    <span
      data-slot="provenance-inline"
      data-state={show ? "shown" : "hidden"}
      className={cn("whitespace-pre-wrap", className)}
      {...props}
    >
      {renderMarks(segments, authors, show)}
    </span>
  );
}

export interface ProvenanceTextProps extends Omit<ComponentPropsWithRef<"div">, "children"> {
  segments: readonly ProvenanceSegment[];
  authors: ProvenanceAuthors;
  /** Controlled: whether who wrote what is shown. */
  show?: boolean;
  defaultShow?: boolean;
  onShowChange?: (show: boolean) => void;
  /** The toggle's name. It stays the same pressed or not; its state is announced. */
  toggleLabel?: string;
}

export function ProvenanceText({
  className,
  segments,
  authors,
  show: showProp,
  defaultShow = false,
  onShowChange,
  toggleLabel = "Show who wrote what",
  ...props
}: ProvenanceTextProps) {
  const bodyId = useId();
  const [showState, setShowState] = useState(defaultShow);
  const shown = showProp ?? showState;

  const toggle = () => {
    const next = !shown;
    if (showProp === undefined) setShowState(next);
    onShowChange?.(next);
  };

  return (
    <div
      data-slot="provenance-text"
      data-state={shown ? "shown" : "hidden"}
      className={cn("flex flex-col gap-2", className)}
      {...props}
    >
      {/* Toggle, then legend, then text: after pressing it, the next thing a
          screen reader reaches is the key to what it is about to hear. */}
      <div
        data-slot="provenance-text-controls"
        className="flex flex-wrap items-center gap-x-3 gap-y-2"
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          data-slot="provenance-text-toggle"
          aria-pressed={shown}
          aria-controls={bodyId}
          className="aria-pressed:border-primary/40 aria-pressed:bg-primary/10 aria-pressed:text-primary"
          onClick={toggle}
        >
          {toggleLabel}
        </Button>
        {shown ? <ProvenanceLegend segments={segments} authors={authors} /> : null}
      </div>
      <p
        id={bodyId}
        data-slot="provenance-text-body"
        className="leading-relaxed whitespace-pre-wrap"
      >
        {renderMarks(segments, authors, shown)}
      </p>
    </div>
  );
}
