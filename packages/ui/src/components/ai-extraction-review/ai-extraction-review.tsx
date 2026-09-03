"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { disabledStyles, focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

import {
  evidenceOf,
  isSourced,
  segmentSource,
  summarizeReview,
  type ExtractionField,
  type FieldDecision,
  type SourceRun,
} from "./extraction-model";

/**
 * The check after extraction: the document on one side, what the model read
 * out of it on the other, and a decision about every field.
 *
 * Every extraction demo shows the filled object and stops. The products that
 * run extraction for a living — invoice capture, KYC onboarding, claims intake —
 * all have this screen, each built from scratch, because a value that cannot
 * be checked can only be trusted, and nobody who is paying an invoice trusts a
 * model that far. No component library ships it.
 *
 * The link is the component. Each field carries where in the source it was
 * read from, quoted in text under the value as well as highlighted in the
 * document, so a reviewer who cannot see the highlight still has the evidence.
 * And a value with no evidence is said outright — "the model supplied this
 * without evidence" — because that is the case a review exists to catch, and
 * the one every filled-object view renders identically to a good value.
 *
 * Evidence is a text offset, not a bounding box. A language model reads text,
 * and a text layer with offsets is what every OCR pipeline already yields.
 * Boxes over a rendered page need page rendering, zoom and geometry, and are a
 * different component; this one does not pretend at them.
 *
 * Decisions are controlled and the component writes nothing. It reports that
 * a field was accepted as proposed, corrected from what was proposed, or
 * rejected — a richer record than a form's submitted values, and the one an
 * audit later needs — and leaves what to do with it to the application.
 */

export interface ExtractionReviewProps extends Omit<
  ComponentPropsWithRef<"section">,
  "children"
> {
  /** What the model read. Every span indexes into it. */
  source: string;
  /** Names the source — "Invoice 4471.pdf, page 1". */
  sourceLabel?: string;
  /** What is being reviewed, as the heading. */
  heading: string;
  fields: ExtractionField[];
  /** Per-field decisions, keyed by field name. Controlled. */
  decisions?: Record<string, FieldDecision>;
  /** Omit to render the review as a record rather than something to operate. */
  onDecision?: (name: string, decision: FieldDecision) => void;
  /** True while fields are still arriving. Missing values wait instead of reading as not found. */
  streaming?: boolean;
  /** Confidence below this is called low, in words. */
  lowConfidenceBelow?: number;
  children?: ReactNode;
}

export function ExtractionReview({
  className,
  source,
  sourceLabel = "Source",
  heading,
  fields,
  decisions = {},
  onDecision,
  streaming = false,
  lowConfidenceBelow = 0.7,
  children,
  ...props
}: ExtractionReviewProps) {
  const headingId = useId();
  const [activeField, setActiveField] = useState<string | null>(null);

  const runs = useMemo(() => segmentSource(source, fields), [source, fields]);
  const summary = useMemo(
    () => summarizeReview(source, fields, decisions),
    [source, fields, decisions],
  );

  return (
    <section
      data-slot="extraction-review"
      data-complete={summary.complete || undefined}
      aria-labelledby={headingId}
      aria-busy={streaming || undefined}
      className={cn("flex flex-col gap-3", className)}
      {...props}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id={headingId} className="text-sm font-medium">
          {heading}
        </h3>
        {/* Live from the start and short, so each decision is followed by
            where the review stands rather than by silence. Evidence gaps are
            counted here too: they are the reason to read carefully, and worth
            knowing before starting rather than discovering on field six. */}
        <p
          data-slot="extraction-review-summary"
          aria-live="polite"
          className="text-xs text-muted-foreground"
        >
          {streaming
            ? "Fields are still arriving"
            : `${String(summary.reviewed)} of ${String(summary.total)} reviewed`}
          {summary.unsourced.length > 0
            ? ` · ${String(summary.unsourced.length)} without evidence`
            : null}
        </p>
      </div>

      {children}

      <div className="grid gap-4 md:grid-cols-2">
        <SourcePanel
          label={sourceLabel}
          runs={runs}
          active={activeField}
          decisions={decisions}
        />

        <ol data-slot="extraction-fields" className="m-0 flex list-none flex-col gap-3 p-0">
          {fields.map((field) => (
            <ReviewField
              key={field.name}
              field={field}
              source={source}
              decision={decisions[field.name]}
              streaming={streaming}
              lowConfidenceBelow={lowConfidenceBelow}
              active={activeField === field.name}
              onActivate={() => {
                setActiveField(field.name);
              }}
              onDecision={onDecision}
            />
          ))}
        </ol>
      </div>
    </section>
  );
}

function SourcePanel({
  label,
  runs,
  active,
  decisions,
}: {
  label: string;
  runs: SourceRun[];
  active: string | null;
  decisions: Record<string, FieldDecision>;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Bring the active field's evidence into view. Focus stays where it is —
  // in the field — so a keyboard user is shown the source without being
  // moved into it.
  useEffect(() => {
    if (!active || !ref.current) return;
    const mark = ref.current.querySelector(`mark[data-active]`);
    mark?.scrollIntoView({ block: "nearest" });
  }, [active]);

  return (
    <div
      ref={ref}
      data-slot="extraction-source"
      // A scrolling box has to be focusable to be scrolled by keyboard, and a
      // focusable box needs a name.
      role="region"
      aria-label={label}
      tabIndex={0}
      // Sticks beside the fields on a wide screen, so the evidence for field
      // nine is still in view when the reviewer reaches it.
      className={cn(
        "max-h-96 overflow-auto rounded-lg border border-border bg-muted/30 p-3 md:sticky md:top-0 md:self-start",
        focusRing,
      )}
    >
      {runs.length === 0 ? (
        <p className="text-xs text-muted-foreground">No source text.</p>
      ) : (
        <pre className="m-0 font-sans text-sm leading-relaxed break-words whitespace-pre-wrap">
          {runs.map((run, index) =>
            run.fields.length === 0 ? (
              <span key={index}>{run.text}</span>
            ) : (
              // A mark element, so the evidence survives as structure rather
              // than only as a tint. No label is inserted into the text: a
              // document read aloud with field names spliced into it is not
              // the document, and the field already quotes its evidence.
              <mark
                key={index}
                data-fields={run.fields.join(" ")}
                data-active={active !== null && run.fields.includes(active) ? "" : undefined}
                className={cn(
                  "rounded-[2px] text-inherit",
                  run.fields.every((name) => decisions[name]?.kind === "rejected")
                    ? "bg-muted line-through decoration-muted-foreground"
                    : "bg-primary/15",
                  active !== null &&
                    run.fields.includes(active) &&
                    "bg-primary/30 ring-1 ring-primary ring-inset",
                )}
              >
                {run.text}
              </mark>
            ),
          )}
        </pre>
      )}
    </div>
  );
}

/** Whitespace collapsed and cut short, for quoting evidence under a field. */
function quote(text: string, limit = 80): string {
  const collapsed = text.replace(/\s+/g, " ").trim();
  return collapsed.length > limit ? `${collapsed.slice(0, limit - 1)}…` : collapsed;
}

function ReviewField({
  field,
  source,
  decision,
  streaming,
  lowConfidenceBelow,
  active,
  onActivate,
  onDecision,
}: {
  field: ExtractionField;
  source: string;
  decision?: FieldDecision;
  streaming: boolean;
  lowConfidenceBelow: number;
  active: boolean;
  onActivate: () => void;
  onDecision?: (name: string, decision: FieldDecision) => void;
}) {
  const inputId = useId();
  const evidenceId = useId();
  const statusId = useId();
  const confidenceId = useId();

  // The reviewer's typing, kept apart from the model's value so the decision
  // can say which is which.
  const [draft, setDraft] = useState<string | null>(null);

  const proposed = field.value ?? "";
  const decided = decision && decision.kind !== "rejected" ? decision.value : undefined;
  const current = draft ?? decided ?? proposed;
  const edited = current !== proposed;
  const changedSince = decided !== undefined && current !== decided;

  const arriving = streaming && field.value === undefined;
  const sourced = isSourced(source, field);
  const evidence = sourced ? evidenceOf(source, field.span) : "";
  const unsourced = !arriving && field.value !== undefined && !sourced;

  const accept = () => {
    onDecision?.(
      field.name,
      edited
        ? { kind: "corrected", value: current, proposed }
        : { kind: "accepted", value: current },
    );
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (event.key !== "Enter") return;
    // Enter confirms an IME candidate before it means anything else. Without
    // this, a reviewer typing a Japanese correction accepts a fragment of it.
    if (event.nativeEvent.isComposing) return;
    if (field.multiline && !(event.ctrlKey || event.metaKey)) return;
    event.preventDefault();
    accept();
  };

  const status = arriving
    ? "Arriving"
    : !decision
      ? "Not reviewed"
      : decision.kind === "rejected"
        ? "Rejected"
        : changedSince
          ? `Changed since it was ${decision.kind}`
          : decision.kind === "accepted"
            ? "Accepted"
            : decision.proposed
              ? `Corrected from “${quote(decision.proposed, 40)}”`
              : "Supplied by the reviewer";

  const low = field.confidence !== undefined && field.confidence < lowConfidenceBelow;
  const percent =
    field.confidence === undefined
      ? null
      : new Intl.NumberFormat(undefined, { style: "percent", maximumFractionDigits: 0 }).format(
          field.confidence,
        );

  const describedBy = [evidenceId, statusId, percent !== null ? confidenceId : null]
    .filter(Boolean)
    .join(" ");

  const controlClass = cn(
    "w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm",
    edited && "border-warning",
    focusRing,
  );

  return (
    <li
      data-slot="extraction-field"
      data-field={field.name}
      data-state={arriving ? "arriving" : (decision?.kind ?? "undecided")}
      data-active={active || undefined}
      data-unsourced={unsourced || undefined}
      // Focus anywhere in the field — value, either button — is the reviewer
      // looking at it, so the source follows without a separate step.
      onFocus={onActivate}
      className={cn(
        "flex flex-col gap-1 rounded-lg border p-3",
        active ? "border-primary" : "border-border",
        decision?.kind === "rejected" && "bg-muted/40",
      )}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        {onDecision && !arriving ? (
          <label htmlFor={inputId} className="text-xs font-medium text-muted-foreground">
            {field.label}
          </label>
        ) : (
          <span className="text-xs font-medium text-muted-foreground">{field.label}</span>
        )}
        {/* Status as a word, outside the label so editing never renames the
            control under a screen reader user. */}
        <span
          id={statusId}
          data-slot="extraction-field-status"
          className={cn(
            "text-xs",
            decision?.kind === "rejected" ? "text-destructive" : "text-muted-foreground",
            changedSince && "text-warning",
          )}
        >
          {status}
        </span>
      </div>

      {arriving ? (
        <span
          aria-hidden="true"
          className="block h-8 w-full animate-pulse-soft rounded-md bg-muted"
        />
      ) : !onDecision ? (
        <p className="rounded-md bg-muted px-2 py-1.5 text-sm break-words">
          {current || <span className="text-muted-foreground">Empty</span>}
        </p>
      ) : field.multiline ? (
        <textarea
          id={inputId}
          rows={3}
          value={current}
          aria-describedby={describedBy}
          onChange={(event) => {
            setDraft(event.target.value);
          }}
          onKeyDown={onKeyDown}
          className={cn(controlClass, "resize-none")}
        />
      ) : (
        <input
          id={inputId}
          type="text"
          value={current}
          aria-describedby={describedBy}
          onChange={(event) => {
            setDraft(event.target.value);
          }}
          onKeyDown={onKeyDown}
          className={controlClass}
        />
      )}

      {/* The evidence in text. This is the accessible path to the source, and
          for a sighted reviewer it is the comparison itself — "1 March 2026"
          beside "2026-03-01" is a normalisation, not an error, and only reads
          that way with both in view. */}
      <p
        id={evidenceId}
        data-slot="extraction-field-evidence"
        className={cn("text-xs", unsourced ? "text-warning" : "text-muted-foreground")}
      >
        {arriving
          ? "Waiting for the model"
          : sourced
            ? `In the source: “${quote(evidence)}”`
            : field.value === undefined
              ? "The model found nothing for this field."
              : "Not in the source — the model supplied this without evidence."}
      </p>

      {percent !== null ? (
        <p
          id={confidenceId}
          data-slot="extraction-field-confidence"
          data-low={low || undefined}
          className={cn("text-xs", low ? "text-warning" : "text-muted-foreground")}
        >
          {low ? `Low confidence, ${percent} — worth checking` : `${percent} confidence`}
        </p>
      ) : null}

      {onDecision && !arriving ? (
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <FieldButton
            variant="primary"
            aria-label={`${edited ? "Accept correction" : "Accept"} — ${field.label}`}
            aria-pressed={
              decision !== undefined && decision.kind !== "rejected" && !changedSince
            }
            onClick={accept}
          >
            {edited ? "Accept correction" : "Accept"}
          </FieldButton>
          <FieldButton
            aria-label={`Reject — ${field.label}`}
            aria-pressed={decision?.kind === "rejected"}
            onClick={() => {
              onDecision(field.name, { kind: "rejected" });
            }}
          >
            Reject
          </FieldButton>
          {sourced ? (
            <FieldButton
              aria-label={`Show in source — ${field.label}`}
              className="ml-auto"
              onClick={onActivate}
            >
              Show in source
            </FieldButton>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

function FieldButton({
  className,
  variant = "default",
  ...props
}: ComponentPropsWithRef<"button"> & { variant?: "default" | "primary" }) {
  return (
    <button
      type="button"
      className={cn(
        "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
        variant === "primary" &&
          "border-primary bg-primary text-primary-foreground hover:bg-primary-hover aria-pressed:bg-primary-active",
        variant === "default" &&
          "border-input bg-background hover:bg-accent hover:text-accent-foreground aria-pressed:bg-secondary aria-pressed:text-secondary-foreground",
        focusRing,
        disabledStyles,
        className,
      )}
      {...props}
    />
  );
}
