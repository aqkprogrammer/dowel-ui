"use client";

import { cva, type VariantProps } from "class-variance-authority";
import {
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type AriaAttributes,
  type ChangeEvent,
  type ComponentPropsWithRef,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from "react";

import { Popover, PopoverAnchor, PopoverContent } from "@/components/popover";
import { focusRingInset, invalidStyles } from "@/lib/styles";
import { cn } from "@/lib/utils";

import { tokenize } from "./expression";
import { getExpressionCompletions, type ExpressionCompletion } from "./expression-complete";
import { formatExpressionValue, runExpression, type ExpressionResult } from "./expression-eval";
import {
  defaultExpressionFunctions,
  type ExpressionFunctions,
  type ExpressionValue,
  type ExpressionVariables,
} from "./expression-functions";
import { paint, visibleRange } from "./expression-highlight";

// Installed, this file is what `@/components/ui/expression-editor` resolves to, so it
// exports everything the folder's index does: see scripts/audit/installed-imports.ts.
export {
  ExpressionError,
  parseExpression,
  tokenize,
  type ExpressionBinaryOperator,
  type ExpressionErrorKind,
  type ExpressionNode,
  type ExpressionToken,
  type ExpressionTokenType,
} from "./expression";
export {
  getExpressionCompletions,
  type ExpressionCompletion,
  type ExpressionCompletionOptions,
  type ExpressionCompletions,
} from "./expression-complete";
export {
  evaluateExpression,
  formatExpressionValue,
  runExpression,
  type ExpressionContext,
  type ExpressionResult,
} from "./expression-eval";
export {
  defaultExpressionFunctions,
  ExpressionArgumentError,
  type ExpressionFunction,
  type ExpressionFunctionDefinition,
  type ExpressionFunctions,
  type ExpressionValue,
  type ExpressionVariables,
} from "./expression-functions";

/**
 * A formula field: highlighting, suggestions for variables and functions, the
 * error where it is, and the result as you type.
 *
 * The field is a real input — or a textarea when `multiline` — laid over a
 * highlighted copy of its own text. The field's text is transparent and its
 * caret is not, so selection, undo, spellcheck-off, IME and every keyboard
 * shortcut are the browser's own, and the copy underneath only paints. Both
 * layers take the same classes so their metrics cannot drift apart.
 *
 * Nothing is evaluated with `eval`: see `expression-eval.ts` for what a name
 * can reach and why division by zero is an error rather than Infinity.
 */

const expressionEditorVariants = cva(
  cn(
    "block w-full min-w-0 rounded-md border font-mono",
    // Ligatures would turn != into one glyph in some fonts; it reads as code.
    "[tab-size:2] [font-variant-ligatures:none]",
  ),
  {
    variants: {
      editorSize: {
        sm: "px-2.5 py-1 text-xs leading-5",
        md: "px-3 py-1.5 text-sm leading-6",
        lg: "px-3.5 py-2 text-base leading-6",
      },
    },
    defaultVariants: { editorSize: "md" },
  },
);

const NAME_CHARACTER = /[\p{L}\p{N}_.]/u;

export interface ExpressionEditorProps
  extends
    Omit<
      ComponentPropsWithRef<"div">,
      | "defaultValue"
      | "onChange"
      | "children"
      | "aria-label"
      | "aria-labelledby"
      | "aria-describedby"
      | "aria-invalid"
    >,
    VariantProps<typeof expressionEditorVariants> {
  /** The expression. Controlled. */
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** What names refer to. Nested objects are reached with dotted paths: `user.age`. */
  variables?: ExpressionVariables;
  /**
   * The functions that can be called. Replaces the defaults; spread
   * `defaultExpressionFunctions` to add to them.
   */
  functions?: ExpressionFunctions;
  /** Visible label. Without one, pass `aria-label` or `aria-labelledby`. */
  label?: ReactNode;
  /** A hint under the label, read with the field. */
  description?: ReactNode;
  /** Shows "= 36" under the field. Errors show either way. */
  showResult?: boolean;
  /** A textarea, where Enter starts a new line. Otherwise Enter never does. */
  multiline?: boolean;
  /** Visible lines when `multiline`. */
  rows?: number;
  /** Milliseconds of quiet typing before the result and any error update. */
  resultDelay?: number;
  /** For numbers in the result and the suggestions. */
  locale?: string;
  /** Replaces how the result is written after "=". */
  formatResult?: (value: ExpressionValue) => string;
  /** Called with each settled result, including the first. */
  onResultChange?: (result: ExpressionResult) => void;
  placeholder?: string;
  name?: string;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  /** The field's id, for a `<label htmlFor>` outside the component. */
  fieldId?: string;
  /** The input or textarea itself. `ref` is the root. */
  fieldRef?: Ref<HTMLInputElement | HTMLTextAreaElement>;
  /** Goes to the field, where the role is. */
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: AriaAttributes["aria-invalid"];
}

type Field = HTMLInputElement | HTMLTextAreaElement;

export function ExpressionEditor({
  className,
  editorSize,
  value: valueProp,
  defaultValue = "",
  onValueChange,
  variables,
  functions = defaultExpressionFunctions,
  label,
  description,
  showResult = true,
  multiline = false,
  rows = 3,
  resultDelay = 300,
  locale,
  formatResult,
  onResultChange,
  placeholder,
  name,
  disabled = false,
  readOnly = false,
  required,
  fieldId: fieldIdProp,
  fieldRef,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  ...props
}: ExpressionEditorProps) {
  const uid = useId();
  const fieldId = fieldIdProp ?? `${uid}-field`;
  const descriptionId = `${uid}-description`;
  const feedbackId = `${uid}-feedback`;
  const listId = `${uid}-suggestions`;

  const [uncontrolled, setUncontrolled] = useState(defaultValue);
  const raw = valueProp ?? uncontrolled;
  // An input drops line breaks; replacing each with a space keeps every offset.
  const text = multiline ? raw : raw.replace(/[\r\n]/g, " ");

  const tokens = useMemo(() => tokenize(text), [text]);
  const fieldElement = useRef<Field | null>(null);
  const highlightRef = useRef<HTMLPreElement | null>(null);
  const pendingCaret = useRef<number | null>(null);

  // No dependency list: the field is an input or a textarea depending on
  // `multiline`, so the handle is refreshed with every render.
  useImperativeHandle(fieldRef, () => fieldElement.current as Field);

  /* Result, settled after a pause --------------------------------------- */

  const [settled, setSettled] = useState(text);
  const [typed, setTyped] = useState<string | null>(null);
  // A value that changes from outside — a reset, a template — is shown at
  // once. Only typing waits for a pause.
  if (text !== settled && text !== typed) setSettled(text);

  useEffect(() => {
    if (settled === text || resultDelay <= 0) return;
    const timer = setTimeout(() => {
      setSettled(text);
    }, resultDelay);
    return () => {
      clearTimeout(timer);
    };
  }, [text, settled, resultDelay]);

  const current = resultDelay <= 0 ? text : settled;
  const result = useMemo(
    () => runExpression(current, { variables, functions }),
    [current, variables, functions],
  );
  const error = !result.ok && result.error.kind !== "empty" ? result.error : null;
  // The range belongs to the settled text, so it is only drawn once that is
  // what is on screen; mid-typing, a stale underline would point at the wrong
  // characters.
  const underline = error && current === text ? visibleRange(error, text.length) : null;
  const invalid = error !== null || ariaInvalid === true || ariaInvalid === "true";

  const onResultChangeRef = useRef(onResultChange);
  useEffect(() => {
    onResultChangeRef.current = onResultChange;
  }, [onResultChange]);
  useEffect(() => {
    onResultChangeRef.current?.(result);
  }, [result]);

  /* Suggestions --------------------------------------------------------- */

  const [caret, setCaret] = useState(0);
  const [open, setOpen] = useState(false);
  const [explicit, setExplicit] = useState(false);
  const [active, setActive] = useState({ key: "", index: 0 });
  const [focused, setFocused] = useState(false);

  const completions = useMemo(
    () =>
      open && !readOnly && !disabled
        ? getExpressionCompletions(text, caret, { variables, functions, explicit, locale })
        : null,
    [open, readOnly, disabled, text, caret, variables, functions, explicit, locale],
  );
  const listKey = completions ? `${String(completions.start)}:${completions.prefix}` : "";
  const count = completions?.options.length ?? 0;
  const activeIndex = active.key === listKey ? Math.min(active.index, count - 1) : 0;
  const optionId = (index: number) => `${listId}-${String(index)}`;

  const setValue = (next: string) => {
    setTyped(next);
    if (valueProp === undefined) setUncontrolled(next);
    onValueChange?.(next);
  };

  const syncScroll = useCallback(() => {
    const field = fieldElement.current;
    const highlight = highlightRef.current;
    if (!field || !highlight) return;
    highlight.scrollTop = field.scrollTop;
    highlight.scrollLeft = field.scrollLeft;
  }, []);

  // After every render: place a caret an accepted suggestion asked for, and
  // keep the painted copy scrolled exactly with the field.
  useLayoutEffect(() => {
    const field = fieldElement.current;
    const at = pendingCaret.current;
    if (field && at !== null && field.value === text) {
      field.setSelectionRange(at, at);
      pendingCaret.current = null;
    }
    syncScroll();
  });

  useEffect(() => {
    if (!completions) return;
    const option = document.getElementById(`${listId}-${String(activeIndex)}`);
    option?.scrollIntoView({ block: "nearest" });
  }, [completions, activeIndex, listId]);

  function accept(option: ExpressionCompletion) {
    if (!completions) return;
    const before = text.slice(0, completions.start);
    const after = text.slice(completions.end);
    let insert = option.name;
    let at = completions.start + insert.length;
    if (option.kind === "function") {
      // Into the parentheses: after the ones already there, or new ones.
      const existing = /^\s*\(/.exec(after);
      if (existing) at += existing[0].length;
      else at += (insert += "(").length - option.name.length;
    } else if (option.kind === "group") {
      insert += ".";
      at += 1;
    }
    const next = before + insert + after;
    pendingCaret.current = at;
    setValue(next);
    setCaret(at);
    // A group's fields come next, so the list stays open for them.
    setOpen(option.kind === "group");
    setExplicit(false);
  }

  function handleChange(event: ChangeEvent<Field>) {
    const next = event.target.value;
    const at = event.target.selectionStart ?? next.length;
    setValue(next);
    setCaret(at);
    // One character typed opens the list if it continues a name; a paste, a
    // deletion or an undo leaves it as it was.
    if (next.length - text.length === 1) {
      setOpen(NAME_CHARACTER.test(next.slice(at - 1, at)));
      setExplicit(false);
    }
  }

  function handleSelect() {
    const field = fieldElement.current;
    if (!field) return;
    const start = field.selectionStart ?? 0;
    // Leaving the name, or selecting text, dismisses the list, and coming back
    // to a name later does not bring it back unasked. Checked against the
    // field's own value, which is never a render behind.
    const context = () =>
      getExpressionCompletions(field.value, start, { variables, functions, explicit, locale });
    if (start !== field.selectionEnd || (open && !context())) setOpen(false);
    setCaret(start);
    syncScroll();
  }

  function handleKeyDown(event: KeyboardEvent<Field>) {
    if (event.nativeEvent.isComposing) return;

    if (completions) {
      switch (event.key) {
        case "ArrowDown":
        case "ArrowUp": {
          event.preventDefault();
          const step = event.key === "ArrowDown" ? 1 : -1;
          // Wraps, so holding a key never dead-ends at the edge of the list.
          setActive({ key: listKey, index: (activeIndex + step + count) % count });
          return;
        }
        case "Tab":
        case "Enter": {
          // Shift+Tab is leaving, not choosing.
          if (event.key === "Tab" && event.shiftKey) {
            setOpen(false);
            return;
          }
          event.preventDefault();
          const option = completions.options[activeIndex];
          if (option) accept(option);
          return;
        }
        case "Escape":
          event.preventDefault();
          setOpen(false);
          return;
        default:
          return;
      }
    }

    const asked =
      (event.key === " " && event.ctrlKey) || (event.key === "ArrowDown" && event.altKey);
    if (asked && !readOnly) {
      event.preventDefault();
      setCaret(event.currentTarget.selectionStart ?? text.length);
      setOpen(true);
      setExplicit(true);
    }
  }

  /* Names and descriptions ---------------------------------------------- */

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    if (label ?? ariaLabel ?? ariaLabelledBy) return;
    console.warn(
      "[ExpressionEditor] Missing accessible name. Pass label, aria-label or aria-labelledby.",
    );
  }, [label, ariaLabel, ariaLabelledBy]);

  const format =
    formatResult ?? ((value: ExpressionValue) => formatExpressionValue(value, locale));
  const showsResult = result.ok && showResult;
  const describedBy =
    [
      ariaDescribedBy,
      description ? descriptionId : null,
      error || showsResult ? feedbackId : null,
    ]
      .filter(Boolean)
      .join(" ") || undefined;

  /* Render --------------------------------------------------------------- */

  const layer = cn(
    expressionEditorVariants({ editorSize }),
    multiline
      ? "[scrollbar-gutter:stable] break-words whitespace-pre-wrap"
      : "overflow-x-auto whitespace-pre",
  );

  const anchor = completions ? (
    <PopoverAnchor key="anchor" asChild>
      <span data-slot="expression-editor-anchor" />
    </PopoverAnchor>
  ) : null;

  const shared = {
    id: fieldId,
    value: text,
    name,
    placeholder,
    disabled,
    readOnly,
    required,
    dir: "ltr",
    spellCheck: false,
    autoComplete: "off",
    autoCapitalize: "off",
    autoCorrect: "off",
    "data-slot": "expression-editor-field",
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy,
    "aria-describedby": describedBy,
    "aria-invalid": invalid || undefined,
    "aria-autocomplete": "list",
    "aria-activedescendant": completions ? optionId(activeIndex) : undefined,
    onChange: handleChange,
    onKeyDown: handleKeyDown,
    onSelect: handleSelect,
    onScroll: syncScroll,
    onFocus: () => {
      setFocused(true);
    },
    onBlur: () => {
      setFocused(false);
      setOpen(false);
    },
  } as const;

  const fieldClass = cn(
    layer,
    "relative border-input bg-transparent text-transparent caret-foreground shadow-xs",
    "transition-[border-color,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-out-quint)]",
    "selection:bg-primary/25 selection:text-transparent placeholder:text-muted-foreground",
    "focus-visible:border-ring disabled:cursor-not-allowed",
    focusRingInset,
    invalidStyles,
  );

  return (
    <div
      data-slot="expression-editor"
      data-invalid={invalid || undefined}
      className={cn("flex flex-col gap-1.5", className)}
      {...props}
    >
      {label ? (
        <label
          htmlFor={fieldId}
          data-slot="expression-editor-label"
          className="text-sm font-medium"
        >
          {label}
        </label>
      ) : null}
      {description ? (
        <p
          id={descriptionId}
          data-slot="expression-editor-description"
          className="text-xs text-muted-foreground"
        >
          {description}
        </p>
      ) : null}

      <Popover
        open={completions !== null}
        onOpenChange={(next) => {
          if (!next) setOpen(false);
        }}
      >
        <div
          data-slot="expression-editor-control"
          data-disabled={disabled || undefined}
          className="relative rounded-md bg-background data-[disabled]:opacity-55"
        >
          {/* Paints the text the field above it holds invisibly. Hidden from
              assistive technology, which reads the field itself. */}
          <pre
            ref={highlightRef}
            aria-hidden="true"
            dir="ltr"
            data-slot="expression-editor-highlight"
            className={cn(
              layer,
              "pointer-events-none absolute inset-0 m-0 overflow-hidden border-transparent text-foreground select-none",
            )}
          >
            {paint(text, tokens, underline, completions?.start ?? null, anchor)}
            {/* Keeps a trailing line break as tall as the textarea draws it. */}
            {multiline ? " " : null}
          </pre>
          {multiline ? (
            <textarea
              {...shared}
              ref={(node) => {
                fieldElement.current = node;
              }}
              rows={rows}
              aria-controls={completions ? listId : undefined}
              className={cn(fieldClass, "resize-y")}
            />
          ) : (
            // role="combobox" belongs on an input; ARIA in HTML allows no role
            // on a textarea, so the multiline field stays a textbox.
            <input
              {...shared}
              ref={(node) => {
                fieldElement.current = node;
              }}
              type="text"
              role="combobox"
              aria-expanded={completions !== null}
              aria-controls={completions ? listId : undefined}
              className={cn(fieldClass, "resize-none")}
            />
          )}
        </div>

        {completions ? (
          <PopoverContent
            id={listId}
            role="listbox"
            aria-label="Suggestions"
            side="bottom"
            align="start"
            sideOffset={6}
            data-slot="expression-editor-suggestions"
            // Focus stays in the field: the list is navigated with
            // aria-activedescendant, never by moving focus into it.
            onOpenAutoFocus={(event) => {
              event.preventDefault();
            }}
            onCloseAutoFocus={(event) => {
              event.preventDefault();
            }}
            className="max-h-[min(16rem,var(--radix-popover-content-available-height))] w-auto max-w-[min(24rem,var(--radix-popover-content-available-width))] min-w-56 overflow-y-auto p-1"
          >
            {completions.options.map((option, index) => {
              const selected = index === activeIndex;
              const spoken =
                option.kind === "function"
                  ? `${option.name}, function${option.description ? `: ${option.description}` : ""}`
                  : `${option.name}, ${option.detail}`;
              return (
                <div
                  key={option.name}
                  id={optionId(index)}
                  role="option"
                  aria-selected={selected}
                  aria-label={spoken}
                  // Virtually focused through aria-activedescendant, never a tab stop.
                  tabIndex={-1}
                  data-slot="expression-editor-option"
                  data-kind={option.kind}
                  data-active={selected || undefined}
                  onPointerMove={() => {
                    if (!selected) setActive({ key: listKey, index });
                  }}
                  // Keeps focus, and so the caret, in the field.
                  onMouseDown={(event) => {
                    event.preventDefault();
                  }}
                  onClick={() => {
                    accept(option);
                  }}
                  onKeyDown={(event) => {
                    // Reachable only if something focuses an option directly;
                    // the usual path is Enter in the field.
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      accept(option);
                    }
                  }}
                  className={cn(
                    "flex cursor-pointer items-baseline justify-between gap-4 rounded-sm border-s-2 border-transparent px-2 py-1 text-sm",
                    // A bar as well as a fill, so the active option is not told by colour alone.
                    "data-[active]:border-primary data-[active]:bg-accent data-[active]:text-accent-foreground",
                  )}
                >
                  <span className="truncate font-mono">
                    {option.kind === "function" ? option.detail : option.name}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {option.kind === "function" ? "function" : option.detail}
                  </span>
                </div>
              );
            })}
          </PopoverContent>
        ) : null}
      </Popover>

      {multiline ? (
        // A textarea cannot say it is expanded, so the count is said instead.
        <span role="status" className="sr-only">
          {completions ? `${String(count)} ${count === 1 ? "suggestion" : "suggestions"}` : ""}
        </span>
      ) : null}

      {/* One element for the result and the error, so a reader hears one
          replace the other. Live only while the field has focus and the list
          is closed: a page of formulas recalculating, or a result read over
          the list, is noise. */}
      <p
        id={feedbackId}
        data-slot="expression-editor-feedback"
        data-state={error ? "error" : showsResult ? "result" : "empty"}
        aria-live={focused && !completions ? "polite" : "off"}
        className={cn("min-h-5 text-sm", error ? "text-destructive" : "text-muted-foreground")}
      >
        {error ? (
          error.message
        ) : showsResult ? (
          <>
            ={" "}
            <span
              data-slot="expression-editor-result"
              className="font-mono text-foreground tabular-nums"
            >
              {format(result.value)}
            </span>
          </>
        ) : null}
      </p>
    </div>
  );
}

export { expressionEditorVariants };
