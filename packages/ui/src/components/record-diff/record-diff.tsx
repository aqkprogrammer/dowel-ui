"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ComponentPropsWithRef,
} from "react";

import { cn } from "@/lib/utils";

/**
 * What changed about a record, field by field.
 *
 * Every diff package on npm compares lines of text. That is the wrong shape for
 * an audit entry, a settings revision or a config history, where the change is
 * "role went from viewer to admin" and rendering it as two lines of JSON makes
 * the reader do the comparison themselves.
 *
 * Scope is deliberately flat records. Nested objects and arrays are formatted as
 * values rather than recursed into, because a recursive differ is a different
 * and much larger component, and pretending otherwise would produce a shallow
 * one that quietly lies about deep changes. `formatValue` is the escape hatch.
 *
 * Redaction is by key pattern and applied before formatting, so a secret is
 * never handed to a formatter that might log it.
 */

export type FieldChange = "added" | "removed" | "changed" | "unchanged";

export interface RecordField {
  key: string;
  label: string;
  change: FieldChange;
  before: unknown;
  after: unknown;
  redacted: boolean;
}

/** Values that read as absent, so "" → null is not reported as a change. */
function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || value === "";
}

function classify(before: unknown, after: unknown): FieldChange {
  const hadBefore = !isEmpty(before);
  const hasAfter = !isEmpty(after);

  if (!hadBefore && hasAfter) return "added";
  if (hadBefore && !hasAfter) return "removed";
  // Both absent. Falling through would compare "" against null, which
  // serialise differently and would report a change that did not happen.
  if (!hadBefore && !hasAfter) return "unchanged";
  // Structural comparison, so {a:1} and {a:1} are equal. Key order differences
  // would report a false change, so keys are sorted before comparing.
  return stableStringify(before) === stableStringify(after) ? "unchanged" : "changed";
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "";
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
    a.localeCompare(b),
  );
  return `{${entries.map(([k, v]) => `${k}:${stableStringify(v)}`).join(",")}}`;
}

function defaultFormatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (value === "") return "empty";
  if (typeof value === "string") return value;
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (typeof value === "number" || typeof value === "bigint") return String(value);
  if (Array.isArray(value)) {
    return value.length === 0 ? "none" : value.map(defaultFormatValue).join(", ");
  }
  if (typeof value === "object") return JSON.stringify(value);
  // Symbols and functions have no sensible representation as a field value, and
  // String() would yield "[object Object]" or a function body. Say what it is.
  return `[${typeof value}]`;
}

/** Keys whose values must never be rendered, however the record was built. */
const DEFAULT_REDACT = /password|secret|token|api[-_]?key|authorization|credential/i;

export interface RecordDiffProps extends Omit<ComponentPropsWithRef<"div">, "children"> {
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  /** Overrides the humanised key. */
  labels?: Record<string, string>;
  /** Keys to render as redacted. Defaults to common secret-shaped names. */
  redact?: RegExp;
  /** Only these keys, in this order. Anything else is ignored. */
  fields?: string[];
  /** Hides unchanged fields behind a toggle. */
  collapseUnchanged?: boolean;
  formatValue?: (value: unknown, key: string) => string;
  children?: React.ReactNode;
}

interface RecordDiffContextValue {
  fields: RecordField[];
  changedCount: number;
  formatValue: (value: unknown, key: string) => string;
}

const RecordDiffContext = createContext<RecordDiffContextValue | null>(null);

function useRecordDiffContext(component: string): RecordDiffContextValue {
  const context = useContext(RecordDiffContext);
  if (!context) {
    throw new Error(`${component} must be rendered inside <RecordDiff>.`);
  }
  return context;
}

/** "billingEmail" and "billing_email" both read as "Billing email". */
function humanise(key: string): string {
  const spaced = key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

export function diffRecords(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  options: { labels?: Record<string, string>; redact?: RegExp; fields?: string[] } = {},
): RecordField[] {
  const { labels = {}, redact = DEFAULT_REDACT, fields } = options;

  // The union of both sides, so a removed key is still reported. Iterating only
  // `after` is how removals go missing from audit logs.
  const keys = fields ?? [...new Set([...Object.keys(before), ...Object.keys(after)])];

  return keys.map((key) => ({
    key,
    label: labels[key] ?? humanise(key),
    change: classify(before[key], after[key]),
    before: before[key],
    after: after[key],
    redacted: redact.test(key),
  }));
}

const CHANGE_STYLES: Record<FieldChange, string> = {
  added: "text-success",
  removed: "text-destructive",
  changed: "text-foreground",
  unchanged: "text-muted-foreground",
};

export function RecordDiff({
  className,
  before,
  after,
  labels,
  redact = DEFAULT_REDACT,
  fields: fieldKeys,
  collapseUnchanged = true,
  formatValue = defaultFormatValue,
  children,
  ...props
}: RecordDiffProps) {
  const fields = useMemo(
    () => diffRecords(before, after, { labels, redact, fields: fieldKeys }),
    [before, after, labels, redact, fieldKeys],
  );

  const changedCount = fields.filter((field) => field.change !== "unchanged").length;

  const context = useMemo<RecordDiffContextValue>(
    () => ({ fields, changedCount, formatValue }),
    [fields, changedCount, formatValue],
  );

  return (
    <RecordDiffContext.Provider value={context}>
      <div
        data-slot="record-diff"
        data-changed={changedCount}
        className={cn("flex flex-col gap-2", className)}
        {...props}
      >
        {children ?? (
          <>
            <RecordDiffSummary />
            <RecordDiffTable collapseUnchanged={collapseUnchanged} />
          </>
        )}
      </div>
    </RecordDiffContext.Provider>
  );
}

/** "3 fields changed" — the thing a reviewer scanning a log needs first. */
export function RecordDiffSummary({ className, ...props }: ComponentPropsWithRef<"p">) {
  const { changedCount, fields } = useRecordDiffContext("RecordDiffSummary");

  return (
    <p
      data-slot="record-diff-summary"
      className={cn("text-xs text-muted-foreground", className)}
      {...props}
    >
      {changedCount === 0
        ? "No fields changed"
        : `${String(changedCount)} of ${String(fields.length)} field${fields.length === 1 ? "" : "s"} changed`}
    </p>
  );
}

export interface RecordDiffTableProps extends ComponentPropsWithRef<"table"> {
  collapseUnchanged?: boolean;
}

export function RecordDiffTable({
  className,
  collapseUnchanged = true,
  ...props
}: RecordDiffTableProps) {
  const { fields, formatValue, changedCount } = useRecordDiffContext("RecordDiffTable");
  const [showUnchanged, setShowUnchanged] = useState(!collapseUnchanged);

  const unchangedCount = fields.length - changedCount;
  const visible = showUnchanged
    ? fields
    : fields.filter((field) => field.change !== "unchanged");

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-x-auto">
        <table
          data-slot="record-diff-table"
          className={cn("w-full border-collapse text-sm", className)}
          {...props}
        >
          <thead>
            <tr className="border-b border-border">
              <th
                scope="col"
                className="px-3 py-2 text-start text-xs font-medium text-muted-foreground"
              >
                Field
              </th>
              <th
                scope="col"
                className="px-3 py-2 text-start text-xs font-medium text-muted-foreground"
              >
                Before
              </th>
              <th
                scope="col"
                className="px-3 py-2 text-start text-xs font-medium text-muted-foreground"
              >
                After
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((field) => (
              <tr
                key={field.key}
                data-slot="record-diff-row"
                data-change={field.change}
                className="border-b border-border last:border-0"
              >
                {/* scope="row" so each value is announced with its field name
                    rather than as a loose cell in a wall of table. */}
                <th
                  scope="row"
                  className="px-3 py-2 text-start align-top font-medium whitespace-nowrap"
                >
                  {field.label}
                  {/* The change kind must not be carried by row colour alone. */}
                  <span className="sr-only">{`, ${field.change}`}</span>
                </th>
                <td className="px-3 py-2 align-top text-muted-foreground">
                  {field.redacted ? (
                    <RedactedValue />
                  ) : field.change === "added" ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <span className="line-through decoration-muted-foreground/50">
                      {formatValue(field.before, field.key)}
                    </span>
                  )}
                </td>
                <td className={cn("px-3 py-2 align-top", CHANGE_STYLES[field.change])}>
                  {field.redacted ? (
                    <RedactedValue />
                  ) : field.change === "removed" ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    formatValue(field.after, field.key)
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {collapseUnchanged && unchangedCount > 0 ? (
        <button
          type="button"
          data-slot="record-diff-toggle"
          aria-expanded={showUnchanged}
          onClick={() => {
            setShowUnchanged((shown) => !shown);
          }}
          className={cn(
            "self-start rounded-md px-1.5 py-0.5 text-xs text-muted-foreground",
            "transition-colors hover:text-foreground",
            "outline-none focus-visible:ring-2 focus-visible:ring-ring/55",
          )}
        >
          {showUnchanged
            ? `Hide ${String(unchangedCount)} unchanged`
            : `Show ${String(unchangedCount)} unchanged`}
        </button>
      ) : null}
    </div>
  );
}

/**
 * A value that is never rendered.
 *
 * Redaction happens before formatting, so a secret is not passed to a formatter
 * that might log or transform it — the value simply does not reach the DOM.
 */
function RedactedValue() {
  return (
    <span data-slot="record-diff-redacted" className="text-muted-foreground italic">
      redacted
    </span>
  );
}
