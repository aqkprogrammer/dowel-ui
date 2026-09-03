"use client";

import {
  cloneElement,
  isValidElement,
  useId,
  useState,
  type ComponentPropsWithRef,
  type ReactElement,
  type ReactNode,
} from "react";

import { disabledStyles, focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/**
 * An AI-proposed value for a form control, offered beside it rather than
 * written into it.
 *
 * Autofill is the most common shape AI takes inside ordinary software —
 * enrich this contact, fill this form from the upload, guess the category —
 * and nearly every implementation writes the value straight into the field
 * as if the person had typed it. Two things go wrong. A plausible, wrong
 * value rides through on the person's own Submit, because nothing marked it
 * as needing a look. And once submitted, the record cannot tell a value the
 * model supplied from one a human typed, which is the one fact an audit later
 * needs.
 *
 * So the suggestion stays pending until it is accepted, and acceptance is
 * reported rather than performed: the component hands the value to `onAccept`
 * and never touches the control. That is also what lets it wrap any control —
 * a select, a date, a number, a combobox — where ghost text can only complete
 * a string. Afterwards the field says it was filled by AI, says if it was
 * edited since, and offers to put back what was there.
 *
 * Deliberately no "accept all". A button that takes every suggestion at once
 * is the review deleting itself, and every product that ships one watches its
 * users press it without reading.
 */

export interface Suggestion<T = string> {
  value: T;
  /** How the value reads — a select's option text, a formatted date. Defaults to the value. */
  label?: string;
  /** Where it came from, in the reader's language: "from the invoice header". */
  source?: string;
  /** 0 to 1. Shown as a number, never only as a colour. */
  confidence?: number;
}

export type SuggestionStatus = "pending" | "accepted" | "dismissed";

export interface SuggestedValueProps<T = string> extends Omit<
  ComponentPropsWithRef<"div">,
  "children" | "id" | "aria-describedby" | "aria-invalid"
> {
  /** The field, for the buttons' names: "Accept suggestion — Company". */
  label: string;
  /** Null or undefined offers nothing. A different suggestion starts pending again. */
  suggestion?: Suggestion<T> | null;
  /**
   * The control's current value. Lets the marker say the fill was edited
   * since, and lets Undo restore what the field held before.
   */
  value?: T;
  /** Supply to own the status; otherwise it is kept here. */
  status?: SuggestionStatus;
  onAccept: (value: T, suggestion: Suggestion<T>) => void;
  onDismiss?: (suggestion: Suggestion<T>) => void;
  /** Called with the value the field held before the fill, so it can be put back. */
  onRevert?: (previous: T | undefined) => void;
  /** How to compare values. Object.is by default. */
  equals?: (a: T, b: T) => boolean;
  /** Confidence below this is called low, in words. */
  lowConfidenceBelow?: number;
  /**
   * Announce a suggestion when it arrives. Off by default: a form that fills
   * twenty fields at once would narrate all twenty, and the description on
   * the control already tells a reader when they reach the field.
   */
  announce?: boolean;
  /** The control. Receives the description, and any id or ARIA a FormControl passes down. */
  children: ReactElement<Record<string, unknown>>;
  /* Passed through to the control, so this can sit inside a FormControl. */
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: ComponentPropsWithRef<"input">["aria-invalid"];
}

function defaultLabel(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "bigint") return String(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value instanceof Date) return value.toLocaleDateString();
  return JSON.stringify(value);
}

function sameSuggestion<T>(
  a: Suggestion<T> | null | undefined,
  b: Suggestion<T> | null | undefined,
  equals: (x: T, y: T) => boolean,
): boolean {
  if (!a || !b) return a === b;
  return equals(a.value, b.value) && a.label === b.label && a.source === b.source;
}

export function SuggestedValue<T = string>({
  className,
  label,
  suggestion,
  value,
  status: controlledStatus,
  onAccept,
  onDismiss,
  onRevert,
  equals = Object.is,
  lowConfidenceBelow = 0.7,
  announce = false,
  children,
  id,
  "aria-describedby": describedByProp,
  "aria-invalid": ariaInvalid,
  ...props
}: SuggestedValueProps<T>) {
  const descriptionId = useId();

  const [internalStatus, setInternalStatus] = useState<SuggestionStatus>("pending");
  const [previous, setPrevious] = useState<T | undefined>(undefined);

  // A new suggestion starts pending, whatever happened to the last one.
  // Compared by content rather than identity, so a parent that rebuilds the
  // object on every keystroke does not reopen a suggestion already accepted.
  const [seen, setSeen] = useState(suggestion);
  if (!sameSuggestion(seen, suggestion, equals)) {
    setSeen(suggestion);
    setInternalStatus("pending");
  }

  const status = controlledStatus ?? internalStatus;
  const offered = suggestion ?? null;
  const pending = offered !== null && status === "pending";
  const accepted = offered !== null && status === "accepted";
  const edited = accepted && value !== undefined && !equals(value, offered.value);

  const low = offered?.confidence !== undefined && offered.confidence < lowConfidenceBelow;
  const percent =
    offered?.confidence === undefined
      ? null
      : new Intl.NumberFormat(undefined, { style: "percent", maximumFractionDigits: 0 }).format(
          offered.confidence,
        );

  const source = offered?.source ? ` ${offered.source}` : "";

  // What the control's description says. This is how a reader who lands on
  // the field learns there is a suggestion, without any announcement.
  let description: ReactNode = null;
  if (pending) {
    description = (
      <>
        Suggested:{" "}
        <strong className="font-medium text-foreground">
          {offered.label ?? defaultLabel(offered.value)}
        </strong>
        {source ? `,${source}` : null}
        {percent !== null ? (
          <span className={cn(low && "text-warning")}>
            {low ? `. Low confidence, ${percent} — worth checking` : `. ${percent} confidence`}
          </span>
        ) : null}
      </>
    );
  } else if (accepted) {
    description = edited
      ? `Filled by AI${source ? `,${source}` : ""}, then edited`
      : `Filled by AI${source ? `,${source}` : ""}`;
  }

  // Merged with whatever already describes the control — a FormControl's
  // description and message, or the child's own — rather than replacing it.
  const childDescribedBy = isValidElement(children)
    ? (children.props["aria-describedby"] as string | undefined)
    : undefined;
  const describedBy =
    [childDescribedBy, describedByProp, description !== null ? descriptionId : null]
      .filter(Boolean)
      .join(" ") || undefined;

  const control = isValidElement(children)
    ? cloneElement(children, {
        id: id ?? children.props.id,
        "aria-describedby": describedBy,
        "aria-invalid": ariaInvalid ?? children.props["aria-invalid"],
      })
    : children;

  const accept = () => {
    if (!offered) return;
    setPrevious(value);
    setInternalStatus("accepted");
    onAccept(offered.value, offered);
  };

  return (
    <div
      data-slot="suggested-value"
      data-status={offered ? status : undefined}
      data-filled-by={accepted ? "ai" : undefined}
      data-edited={edited || undefined}
      className={cn("flex flex-col gap-1.5", className)}
      {...props}
    >
      {control}

      {/* Present from the start and never display:none, so that with `announce`
          a suggestion arriving after mount is heard — a region that enters the
          accessibility tree at the same moment as its content announces
          nothing. Empty, it has no height. */}
      <div
        data-slot="suggested-value-row"
        aria-live={announce ? "polite" : undefined}
        className={cn(
          "flex flex-wrap items-center gap-x-3 gap-y-1 text-xs",
          pending && "rounded-md border border-primary/40 bg-primary/5 px-2.5 py-1.5",
        )}
      >
        {description !== null ? (
          <p
            id={descriptionId}
            data-slot="suggested-value-description"
            className="m-0 flex-1 text-muted-foreground"
          >
            {description}
          </p>
        ) : null}

        {pending ? (
          <span className="flex items-center gap-2">
            <RowButton
              variant="primary"
              aria-label={`Accept suggestion — ${label}`}
              onClick={accept}
            >
              Accept
            </RowButton>
            <RowButton
              aria-label={`Dismiss suggestion — ${label}`}
              onClick={() => {
                setInternalStatus("dismissed");
                onDismiss?.(offered);
              }}
            >
              Dismiss
            </RowButton>
          </span>
        ) : null}

        {accepted && onRevert ? (
          <RowButton
            aria-label={`Undo — ${label}`}
            onClick={() => {
              setInternalStatus("pending");
              onRevert(previous);
            }}
          >
            Undo
          </RowButton>
        ) : null}
      </div>
    </div>
  );
}

function RowButton({
  className,
  variant = "default",
  ...props
}: ComponentPropsWithRef<"button"> & { variant?: "default" | "primary" }) {
  return (
    <button
      type="button"
      className={cn(
        "rounded-md border px-2 py-0.5 text-xs font-medium transition-colors",
        variant === "primary"
          ? "border-primary bg-primary text-primary-foreground hover:bg-primary-hover"
          : "border-input bg-background hover:bg-accent hover:text-accent-foreground",
        focusRing,
        disabledStyles,
        className,
      )}
      {...props}
    />
  );
}
