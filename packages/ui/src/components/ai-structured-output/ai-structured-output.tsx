"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ComponentPropsWithRef,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

/**
 * An object arriving field by field from the model.
 *
 * Most AI features inside real software are not chatbots. They are invoice
 * extraction, CRM enrichment, resume parsing, form autofill — a schema goes in
 * and a filled object comes back. Every one of them streams a partial object
 * into a layout, and almost every one reflows on each token because the fields
 * appear as they arrive.
 *
 * The honest limitation, stated here rather than discovered later: there is no
 * per-field completion signal anywhere in the stack. A streaming API hands you
 * successive partial snapshots, and a string that has stopped growing is
 * indistinguishable from one still arriving. So this component does not pretend
 * to know. It takes the field list up front, reserves the layout from it, and
 * lets the caller say which fields are settled — defaulting to the rule that a
 * field is settled once a later field has appeared, which is true of
 * depth-first JSON streaming and is documented rather than assumed silently.
 */

export type FieldState = "pending" | "streaming" | "settled" | "error";

export interface OutputField {
  /** Key in the streamed object. */
  name: string;
  label: string;
  /** Rough height reserved before the value arrives, in lines. */
  lines?: number;
}

interface StructuredOutputContextValue {
  fields: OutputField[];
  value: Record<string, unknown>;
  stateOf: (name: string) => FieldState;
  formatValue: (value: unknown, name: string) => string;
}

const StructuredOutputContext = createContext<StructuredOutputContextValue | null>(null);

function useStructuredOutputContext(component: string): StructuredOutputContextValue {
  const context = useContext(StructuredOutputContext);
  if (!context) {
    throw new Error(`${component} must be rendered inside <StructuredOutput>.`);
  }
  return context;
}

function defaultFormat(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "bigint") return String(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.map(defaultFormat).join(", ");
  return JSON.stringify(value);
}

export interface StructuredOutputProps extends Omit<ComponentPropsWithRef<"dl">, "children"> {
  /** Declared up front, so layout is reserved before anything arrives. */
  fields: OutputField[];
  /** The latest partial snapshot. */
  value: Record<string, unknown>;
  /**
   * True while more of the object is still expected. When false every present
   * field is settled, which is the only completion signal that is ever certain.
   */
  streaming?: boolean;
  /**
   * Fields the caller knows are finished. Supply this when the API gives a
   * real signal; otherwise the default rule applies.
   */
  settled?: string[];
  /** Fields that failed to extract, with the reason shown in place. */
  errors?: Record<string, string>;
  formatValue?: (value: unknown, name: string) => string;
  children?: ReactNode;
}

export function StructuredOutput({
  className,
  fields,
  value,
  streaming = false,
  settled,
  errors,
  formatValue = defaultFormat,
  children,
  ...props
}: StructuredOutputProps) {
  const stateOf = useMemo(() => {
    const explicit = settled ? new Set(settled) : null;
    const lastPresentIndex = fields.reduce(
      (last, field, index) => (value[field.name] !== undefined ? index : last),
      -1,
    );

    return (name: string): FieldState => {
      if (errors?.[name]) return "error";

      const index = fields.findIndex((field) => field.name === name);
      const present = value[name] !== undefined;

      if (!present) return "pending";
      if (explicit) return explicit.has(name) ? "settled" : "streaming";
      // No explicit signal. Once a later field has appeared this one cannot
      // still be growing, which holds for depth-first JSON streaming. The last
      // present field stays "streaming" until the caller says streaming ended.
      if (!streaming) return "settled";
      return index < lastPresentIndex ? "settled" : "streaming";
    };
  }, [fields, value, streaming, settled, errors]);

  const context = useMemo<StructuredOutputContextValue>(
    () => ({ fields, value, stateOf, formatValue }),
    [fields, value, stateOf, formatValue],
  );

  return (
    <StructuredOutputContext.Provider value={context}>
      <dl
        data-slot="structured-output"
        data-streaming={streaming || undefined}
        // Fields arrive one at a time and each is a small, self-contained fact,
        // so the region is polite and additive rather than re-reading the whole
        // object on every token.
        aria-live="polite"
        aria-busy={streaming}
        className={cn("flex flex-col gap-3", className)}
        {...props}
      >
        {children ??
          fields.map((field) => <StructuredField key={field.name} name={field.name} />)}
      </dl>
    </StructuredOutputContext.Provider>
  );
}

export interface StructuredFieldProps extends Omit<ComponentPropsWithRef<"div">, "children"> {
  name: string;
  children?: ReactNode;
}

/**
 * One field: its label, its value, and the space it will occupy before it has
 * one.
 *
 * The reserved height is what stops the layout jumping as the object fills in.
 */
export function StructuredField({ className, name, children, ...props }: StructuredFieldProps) {
  const { fields, value, stateOf, formatValue } = useStructuredOutputContext("StructuredField");

  const field = fields.find((candidate) => candidate.name === name);
  if (!field) {
    throw new Error(`StructuredField "${name}" is not declared in the fields prop.`);
  }

  const state = stateOf(name);
  const raw = value[name];

  // "A token arrived" and "this field is final" are different facts, and in a
  // streamed object they look identical. The settle makes that distinction
  // visible — so it plays on the transition into settled, and never on a field
  // that was already final when the component mounted.
  //
  // State adjusted during render rather than tracked in a ref: reading a ref
  // while rendering is unsafe under concurrent rendering, and an effect would
  // paint the plain value first and animate a frame later. React re-renders
  // immediately here and discards the intermediate pass.
  const [seenState, setSeenState] = useState<FieldState>(state);
  const [hasSettled, setHasSettled] = useState(false);

  if (seenState !== state) {
    setSeenState(state);
    if (state === "settled" && seenState !== "settled") setHasSettled(true);
  }

  return (
    <div
      data-slot="structured-field"
      data-state={state}
      data-settled={hasSettled || undefined}
      data-field={name}
      className={cn("flex flex-col gap-1", className)}
      {...props}
    >
      <dt className="text-xs text-muted-foreground">{field.label}</dt>
      <dd
        className={cn(
          "m-0 text-sm",
          state === "pending" && "text-muted-foreground",
          state === "error" && "text-destructive",
        )}
        // Height is reserved from the declared line count so the value lands in
        // space already set aside for it rather than pushing the page down.
        // Computed rather than left to calc() so the reserved height is a plain
        // value that can be asserted and reasoned about.
        style={{ minHeight: `${String((field.lines ?? 1) * 1.25)}rem` }}
      >
        {state === "pending" ? (
          <span
            data-slot="structured-field-placeholder"
            aria-hidden="true"
            className="block h-4 w-24 animate-pulse-soft rounded bg-muted"
          />
        ) : (
          <span
            data-slot="structured-field-value"
            className={cn(hasSettled && "inline-block animate-settle")}
          >
            {children ?? formatValue(raw, name)}
          </span>
        )}
      </dd>
    </div>
  );
}

/**
 * A confidence score for one field.
 *
 * Rendered as text with the number, never as a bare colour, because "how much
 * should I trust this" is exactly the thing a colour cannot answer.
 */
export function StructuredConfidence({
  className,
  value: confidence,
  lowBelow = 0.7,
  ...props
}: ComponentPropsWithRef<"p"> & { value: number; lowBelow?: number }) {
  const low = confidence < lowBelow;
  const percent = new Intl.NumberFormat(undefined, {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(confidence);

  return (
    <p
      data-slot="structured-confidence"
      data-low={low || undefined}
      className={cn("text-xs", low ? "text-warning" : "text-muted-foreground", className)}
      {...props}
    >
      {low ? `Low confidence, ${percent} — worth checking` : `${percent} confidence`}
    </p>
  );
}

/** The reason a field could not be extracted, shown where the value would be. */
export function StructuredFieldError({ className, ...props }: ComponentPropsWithRef<"p">) {
  return (
    <p
      data-slot="structured-field-error"
      className={cn("text-xs text-destructive", className)}
      {...props}
    />
  );
}
