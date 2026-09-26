"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { Button } from "@/components/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/popover";
import { Spinner } from "@/components/spinner";
import { disabledStyles, focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

import { NlFilterEditor } from "./nl-filter-editor";
import {
  describeFilter,
  filterParts,
  normaliseFilter,
  type FilterChip,
  type FilterDraft,
  type FilterField,
  type FilterParser,
  type ParsedFilter,
} from "./nl-filter-model";
import { parseFilterText } from "./nl-filter-parse";

// Installed, this file is what `@/components/ui/nl-filter` resolves to, so it
// exports everything the folder's index does: see scripts/audit/installed-imports.ts.
export { applyFilters, type FilterValueGetter } from "./nl-filter-apply";
export {
  describeFilter,
  normaliseFilter,
  operatorLabel,
  operatorsFor,
  type FilterChip,
  type FilterDraft,
  type FilterField,
  type FilterFieldType,
  type FilterOperator,
  type FilterOption,
  type FilterParser,
  type ParsedFilter,
} from "./nl-filter-model";
export {
  createFilterParser,
  parseFilterText,
  type FilterParserOptions,
} from "./nl-filter-parse";

/**
 * Natural language in, filter chips out.
 *
 * The person types what they want to see — "failed on main, took over 5" —
 * and presses Enter. A parser turns the text into filters, each shown as a
 * chip that reads as a sentence and can be edited or removed on its own.
 * Nothing is guessed silently: whatever the parser could not read stays in the
 * field and is named — "Not understood: this week" — so the person can reword
 * it rather than wonder why the list looks wrong.
 *
 * The parser is the app's. A plain one ships (`parseFilterText`: `field:value`,
 * `field>3`, option names on their own), and a model call fits the same
 * signature; it may be async, and a newer submission aborts the older one.
 * `applyFilters` runs the chips over rows in memory.
 */

type Notice = { kind: "unparsed"; text: string } | { kind: "error"; message: string };

export interface NlFilterProps extends Omit<
  ComponentPropsWithRef<"div">,
  "children" | "defaultValue" | "onChange"
> {
  /** What can be filtered on. */
  fields: FilterField[];
  /** Controlled chips. */
  value?: FilterChip[];
  /** Initial chips when uncontrolled. */
  defaultValue?: FilterChip[];
  onValueChange?: (chips: FilterChip[]) => void;
  /** Turns text into filters. Defaults to `parseFilterText`. */
  parse?: FilterParser;
  /** Names the field. */
  label?: string;
  placeholder?: string;
  /** Help under the field. Defaults to an example built from `fields`. */
  hint?: ReactNode;
  /**
   * A text field's key. When set, text that was not understood can be added
   * as "<field> contains <text>" in one click, so a failed reading still
   * narrows the list.
   */
  searchField?: string;
  disabled?: boolean;
  /** Passed to the text field. Its ref stays the filter's own, for focus after a removal. */
  inputProps?: Omit<
    ComponentPropsWithRef<"input">,
    "value" | "defaultValue" | "disabled" | "ref"
  >;
}

function isThenable(value: unknown): value is PromiseLike<ParsedFilter> {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { then?: unknown }).then === "function"
  );
}

function sameFilter(a: FilterDraft, b: FilterDraft): boolean {
  return (
    a.field === b.field && a.operator === b.operator && String(a.value) === String(b.value)
  );
}

function count(n: number): string {
  return `${String(n)} ${n === 1 ? "filter" : "filters"}`;
}

/** "Try “failed” or “status:failed”", from the first enum field that has options. */
function exampleHint(fields: readonly FilterField[]): string {
  const field = fields.find((candidate) => candidate.type === "enum" && candidate.options?.[0]);
  const option = field?.options?.[0];
  if (field && option) {
    return `Press Enter to add filters. Try “${option.label.toLowerCase()}” or “${field.key}:${option.value}”.`;
  }
  const first = fields[0];
  return first
    ? `Press Enter to add filters. Try “${first.key}:” and a value.`
    : "Press Enter to add filters.";
}

function RemoveIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-3">
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function NlFilter({
  className,
  fields,
  value,
  defaultValue,
  onValueChange,
  parse = parseFilterText,
  label = "Filter",
  placeholder = "Describe what to show",
  hint,
  searchField,
  disabled = false,
  inputProps,
  ...props
}: NlFilterProps) {
  const [uncontrolled, setUncontrolled] = useState<FilterChip[]>(defaultValue ?? []);
  const chips = value ?? uncontrolled;
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [editing, setEditing] = useState<string | null>(null);

  const uid = useId();
  const labelId = `${uid}-label`;
  const inputId = inputProps?.id ?? `${uid}-input`;
  const hintId = `${uid}-hint`;
  const noticeId = `${uid}-notice`;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const nextId = useRef(0);
  // Holds the in-flight parse's controller. An object, so unmount can abort
  // whichever one is current by then.
  const pending = useRef<{ controller: AbortController | null }>({ controller: null });

  // An async parse finishes after renders the handler never saw; it reads
  // the chips and callbacks as they are now, not as they were on Enter.
  const latest = useRef({ chips, fields, onValueChange, controlled: value !== undefined });
  useEffect(() => {
    latest.current = { chips, fields, onValueChange, controlled: value !== undefined };
  });

  useEffect(() => {
    const holder = pending.current;
    return () => {
      holder.controller?.abort();
    };
  }, []);

  function commit(next: FilterChip[]) {
    latest.current.chips = next;
    if (!latest.current.controlled) setUncontrolled(next);
    latest.current.onValueChange?.(next);
  }

  function withId(filter: FilterDraft): FilterChip {
    nextId.current += 1;
    return { ...filter, id: `${uid}-${String(nextId.current)}` };
  }

  function accept(text: string, result: ParsedFilter) {
    const current = latest.current.chips;
    const known = latest.current.fields;
    const added: FilterChip[] = [];
    const repeated: string[] = [];
    const refused: string[] = [];

    for (const raw of Array.isArray(result.chips) ? result.chips : []) {
      const filter = normaliseFilter(raw, known);
      if (!filter) {
        // A filter on a field that does not exist, or with a value the field
        // cannot take, is the parser's misreading. Say so in words.
        const described = raw as Partial<FilterDraft> | null;
        if (typeof described?.field === "string") {
          refused.push(
            `${described.field} ${String(described.operator)} ${String(described.value)}`,
          );
        }
        continue;
      }
      if ([...current, ...added].some((chip) => sameFilter(chip, filter))) {
        repeated.push(describeFilter(filter, known));
        continue;
      }
      added.push(withId(filter));
    }

    if (added.length > 0) commit([...current, ...added]);

    const leftover = [
      typeof result.unparsed === "string" ? result.unparsed.trim() : "",
      ...refused,
    ]
      .filter((part) => part.length > 0)
      .join(" ");
    setNotice(leftover ? { kind: "unparsed", text: leftover } : null);
    // Leave what was not understood in the field to reword — unless the
    // person has typed something new while the parser was working.
    setDraft((now) => (now.trim() === text ? leftover : now));

    const parts: string[] = [];
    if (added.length > 0) {
      parts.push(
        `Added ${count(added.length)}: ${added.map((chip) => describeFilter(chip, known)).join(", ")}.`,
      );
    } else if (repeated.length === 0) {
      parts.push("No filters added.");
    }
    if (repeated.length > 0) parts.push(`Already there: ${repeated.join(", ")}.`);
    if (leftover) parts.push(`Not understood: ${leftover}.`);
    setAnnouncement(parts.join(" "));
  }

  async function submit() {
    const text = draft.trim();
    if (text.length === 0) return;
    pending.current.controller?.abort();
    const controller = new AbortController();
    pending.current.controller = controller;
    setNotice(null);

    let result: ParsedFilter;
    try {
      const output = parse(text, latest.current.fields, controller.signal);
      if (isThenable(output)) {
        setBusy(true);
        setAnnouncement("Reading the filter…");
        result = await output;
      } else {
        result = output;
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      pending.current.controller = null;
      setBusy(false);
      const message =
        error instanceof Error && error.message ? error.message : "no reason given";
      setNotice({ kind: "error", message });
      setAnnouncement(`Could not read the filter: ${message}.`);
      return;
    }
    // A newer submission, Escape or unmount replaced this one: its answer is
    // to a question nobody is asking any more.
    if (controller.signal.aborted) return;
    pending.current.controller = null;
    setBusy(false);
    accept(text, result);
  }

  function stop() {
    pending.current.controller?.abort();
    pending.current.controller = null;
    setBusy(false);
    setAnnouncement("Stopped reading the filter.");
  }

  function remove(chip: FilterChip) {
    commit(chips.filter((candidate) => candidate.id !== chip.id));
    setAnnouncement(`Removed filter: ${describeFilter(chip, fields)}.`);
    inputRef.current?.focus();
  }

  function change(chip: FilterChip, next: FilterDraft) {
    setEditing(null);
    if (sameFilter(chip, next)) return;
    commit(
      chips.map((candidate) =>
        candidate.id === chip.id ? { ...next, id: chip.id } : candidate,
      ),
    );
    setAnnouncement(`Changed filter to ${describeFilter(next, fields)}.`);
  }

  function searchFor(field: string, text: string) {
    const filter = normaliseFilter({ field, operator: "contains", value: text }, fields);
    if (!filter) return;
    if (!chips.some((chip) => sameFilter(chip, filter))) commit([...chips, withId(filter)]);
    setDraft("");
    setNotice(null);
    setAnnouncement(`Added filter: ${describeFilter(filter, fields)}.`);
    inputRef.current?.focus();
  }

  const {
    onKeyDown: onInputKeyDown,
    onChange: onInputChange,
    className: inputClassName,
    "aria-describedby": inputDescribedBy,
    ...restInputProps
  } = inputProps ?? {};

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    onInputKeyDown?.(event);
    if (event.defaultPrevented) return;

    if (event.key === "Enter") {
      // Never submit a surrounding form, and never mid-composition: Enter
      // there picks an IME candidate.
      event.preventDefault();
      if (!event.nativeEvent.isComposing) void submit();
      return;
    }
    if (event.key === "Escape" && busy) {
      event.preventDefault();
      stop();
      return;
    }
    const target = event.currentTarget;
    if (
      event.key === "Backspace" &&
      target.value.length === 0 &&
      chips.length > 0 &&
      !event.repeat
    ) {
      event.preventDefault();
      const last = chips.at(-1);
      if (last) remove(last);
    }
  }

  // Only a text field can be searched with "contains".
  const searchKey = fields.some((field) => field.key === searchField && field.type === "text")
    ? searchField
    : undefined;
  const describedBy = [inputDescribedBy, hintId, notice ? noticeId : undefined]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      data-slot="nl-filter"
      data-state={busy ? "busy" : "idle"}
      className={cn("flex flex-col gap-1.5", className)}
      {...props}
    >
      <label id={labelId} htmlFor={inputId} className="w-fit text-sm font-medium">
        {label}
      </label>

      <div
        role="group"
        aria-labelledby={labelId}
        aria-busy={busy || undefined}
        data-slot="nl-filter-field"
        data-disabled={disabled || undefined}
        className={cn(
          "flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-2 py-1.5 shadow-xs",
          "transition-[border-color,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-out-quint)]",
          // Ringed when the text field is focused, not when a chip's button
          // is: the button has its own ring, and two at once is noise.
          "has-[input:focus-visible]:border-ring has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-ring/55",
          disabled && "opacity-55",
        )}
      >
        {chips.length > 0 ? (
          <ul
            aria-label="Applied filters"
            data-slot="nl-filter-chips"
            className="flex min-w-0 flex-wrap items-center gap-1.5"
          >
            {chips.map((chip) => {
              const field = fields.find((candidate) => candidate.key === chip.field);
              const parts = filterParts(chip, fields);
              const description = describeFilter(chip, fields);
              const text = (
                <>
                  <span className="font-medium">{parts.field}</span>{" "}
                  <span className="text-muted-foreground">{parts.operator}</span>{" "}
                  <span className="max-w-48 truncate">{parts.value}</span>
                </>
              );
              return (
                <li
                  key={chip.id}
                  data-slot="nl-filter-chip"
                  className="inline-flex max-w-full min-w-0 items-stretch rounded-full border border-border bg-secondary text-xs text-secondary-foreground"
                >
                  {field ? (
                    <Popover
                      open={editing === chip.id}
                      onOpenChange={(open) => {
                        setEditing(open ? chip.id : null);
                      }}
                    >
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          data-slot="nl-filter-chip-edit"
                          disabled={disabled}
                          aria-label={`Edit filter: ${description}`}
                          className={cn(
                            "inline-flex min-w-0 items-center gap-1 rounded-s-full py-0.5 ps-2.5 pe-1 text-start whitespace-nowrap",
                            "transition-colors duration-[var(--duration-fast)] hover:bg-accent hover:text-accent-foreground",
                            focusRing,
                            disabledStyles,
                          )}
                        >
                          {text}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        align="start"
                        aria-label={`Edit filter: ${description}`}
                        className="w-64 p-3"
                      >
                        <NlFilterEditor
                          chip={chip}
                          field={field}
                          onApply={(next) => {
                            change(chip, next);
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  ) : (
                    // A chip for a field this filter does not know cannot be
                    // edited, only read and removed.
                    <span className="inline-flex min-w-0 items-center gap-1 py-0.5 ps-2.5 pe-1 whitespace-nowrap">
                      {text}
                    </span>
                  )}
                  <button
                    type="button"
                    data-slot="nl-filter-chip-remove"
                    disabled={disabled}
                    aria-label={`Remove filter: ${description}`}
                    onClick={() => {
                      remove(chip);
                    }}
                    className={cn(
                      "grid place-items-center rounded-e-full ps-1 pe-2",
                      "transition-colors duration-[var(--duration-fast)] hover:bg-accent hover:text-accent-foreground",
                      focusRing,
                      disabledStyles,
                    )}
                  >
                    <RemoveIcon />
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}

        <input
          ref={inputRef}
          type="text"
          id={inputId}
          data-slot="nl-filter-input"
          value={draft}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete="off"
          enterKeyHint="search"
          aria-describedby={describedBy}
          onChange={(event) => {
            onInputChange?.(event);
            setDraft(event.target.value);
            // A notice about text that is no longer there describes nothing.
            if (event.target.value.trim().length === 0) setNotice(null);
          }}
          onKeyDown={handleKeyDown}
          className={cn(
            "min-w-32 flex-1 self-stretch bg-transparent px-1 text-sm outline-none",
            "placeholder:text-muted-foreground disabled:cursor-not-allowed",
            inputClassName,
          )}
          {...restInputProps}
        />
        {busy ? <Spinner size="sm" className="me-1 text-muted-foreground" /> : null}
      </div>

      <p id={hintId} data-slot="nl-filter-hint" className="text-xs text-muted-foreground">
        {busy ? "Reading the filter… Press Escape to stop." : (hint ?? exampleHint(fields))}
      </p>

      {notice ? (
        <div
          id={noticeId}
          data-slot="nl-filter-notice"
          data-kind={notice.kind}
          className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs"
        >
          {notice.kind === "unparsed" ? (
            <>
              <p>
                <span className="font-medium">Not understood:</span> “{notice.text}”.{" "}
                <span className="text-muted-foreground">
                  Reword it and press Enter, or write it as field:value.
                </span>
              </p>
              {searchKey ? (
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto text-xs"
                  onClick={() => {
                    searchFor(searchKey, notice.text);
                  }}
                >
                  Add filter:{" "}
                  {describeFilter(
                    { field: searchKey, operator: "contains", value: notice.text },
                    fields,
                  )}
                </Button>
              ) : null}
            </>
          ) : (
            <p>
              <span className="font-medium">Could not read the filter:</span> {notice.message}.{" "}
              <span className="text-muted-foreground">Press Enter to try again.</span>
            </p>
          )}
        </div>
      ) : null}

      {/* Present and empty from the start, so the first addition is heard. */}
      <p role="status" data-slot="nl-filter-status" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
