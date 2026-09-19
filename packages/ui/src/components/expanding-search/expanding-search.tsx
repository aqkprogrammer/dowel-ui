"use client";

// Original design (pattern inspired by bencho Search; no code referenced).
import { cva, type VariantProps } from "class-variance-authority";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
  type FocusEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A search button that opens into a field.
 *
 * A search landmark holding a trigger (aria-expanded, aria-controls) and a
 * field whose inline size transitions open. Opening focuses the field;
 * Escape clears it first, then collapses and returns focus to the trigger;
 * leaving an empty field collapses it quietly. A clear button appears once
 * there is text.
 *
 * Combobox-ready: `inputProps` is spread onto the <input>, so a consumer can
 * add role="combobox", aria-activedescendant and its own key handling, and
 * render the listbox as `children`. Its onKeyDown runs first, and calling
 * preventDefault there (say, to close its listbox on Escape) stops this
 * component's own Escape handling.
 */

const expandingSearchVariants = cva(
  "relative inline-flex h-10 items-center rounded-full bg-card text-card-foreground",
  {
    variants: {
      /** A hairline ring. */
      stroke: {
        true: "shadow-[inset_0_0_0_1px_var(--color-border)]",
        false: "",
      },
    },
    defaultVariants: { stroke: true },
  },
);

const iconButton = cn(
  "grid size-10 shrink-0 place-items-center rounded-full text-muted-foreground",
  "transition-[background-color,color] duration-[var(--duration-fast)] ease-[var(--ease-out-quint)]",
  "hover:text-foreground disabled:pointer-events-none disabled:opacity-55",
  focusRing,
);

export interface ExpandingSearchProps
  extends
    Omit<ComponentPropsWithRef<"form">, "onSubmit" | "defaultValue" | "onChange">,
    VariantProps<typeof expandingSearchVariants> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Called with the text on Enter. */
  onSearch?: (value: string) => void;
  /** Names the trigger and the field. */
  label?: string;
  placeholder?: string;
  clearLabel?: string;
  /** The open field's inline size, any CSS length. */
  expandedWidth?: string;
  disabled?: boolean;
  /** Spread onto the <input> — for combobox wiring. */
  inputProps?: Omit<ComponentPropsWithRef<"input">, "value" | "defaultValue">;
}

function Glyph({ d }: { d: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-4"
    >
      <path d={d} />
    </svg>
  );
}

/** A search button that expands into a field, and collapses back with Escape. */
export function ExpandingSearch({
  className,
  stroke,
  value: valueProp,
  defaultValue = "",
  onValueChange,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  onSearch,
  label = "Search",
  placeholder = "Search…",
  clearLabel = "Clear search",
  expandedWidth = "14rem",
  disabled = false,
  inputProps = {},
  onBlur,
  style,
  children,
  ...props
}: ExpandingSearchProps) {
  const inputId = useId();
  const [innerValue, setInnerValue] = useState(defaultValue);
  const value = valueProp ?? innerValue;
  const [innerOpen, setInnerOpen] = useState(defaultOpen);
  const open = openProp ?? innerOpen;
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const focusNext = useRef<"input" | "trigger" | null>(null);

  useEffect(() => {
    const target = focusNext.current;
    focusNext.current = null;
    if (target === "input") inputRef.current?.focus();
    else if (target === "trigger") triggerRef.current?.focus();
  });

  function setValue(next: string) {
    if (valueProp === undefined) setInnerValue(next);
    onValueChange?.(next);
  }

  function setOpen(next: boolean, focus: "input" | "trigger" | null) {
    focusNext.current = focus;
    if (next === open) return;
    if (openProp === undefined) setInnerOpen(next);
    onOpenChange?.(next);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    inputProps.onKeyDown?.(event);
    if (event.defaultPrevented || event.key !== "Escape") return;
    event.preventDefault();
    if (value) setValue("");
    else setOpen(false, "trigger");
  }

  function handleBlur(event: FocusEvent<HTMLFormElement>) {
    onBlur?.(event);
    if (event.currentTarget.contains(event.relatedTarget)) return;
    if (!value) setOpen(false, null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (open) onSearch?.(value);
  }

  return (
    <form
      role="search"
      aria-label={label}
      data-slot="expanding-search"
      data-state={open ? "open" : "closed"}
      className={cn(expandingSearchVariants({ stroke }), className)}
      style={{ "--expanding-search-width": expandedWidth, ...style } as CSSProperties}
      onSubmit={handleSubmit}
      onBlur={handleBlur}
      {...props}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={inputId}
        disabled={disabled}
        data-slot="expanding-search-trigger"
        className={iconButton}
        onClick={() => {
          setOpen(!open, open ? null : "input");
        }}
      >
        <Glyph d="m21 21-4.34-4.34M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z" />
      </button>
      <div
        data-slot="expanding-search-field"
        className={cn(
          "flex h-full items-center overflow-hidden",
          "transition-[width,visibility] duration-[var(--duration-slow)] ease-[var(--ease-out-quint)]",
          open ? "visible w-[var(--expanding-search-width)]" : "invisible w-0",
        )}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="search"
          aria-label={label}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          {...inputProps}
          value={value}
          data-slot="expanding-search-input"
          className={cn(
            "h-full min-w-0 flex-1 bg-transparent pe-1 text-sm outline-none placeholder:text-muted-foreground",
            "[&::-webkit-search-cancel-button]:appearance-none",
            inputProps.className,
          )}
          onChange={(event) => {
            inputProps.onChange?.(event);
            setValue(event.target.value);
          }}
          onKeyDown={handleKeyDown}
        />
        {value ? (
          <button
            type="button"
            aria-label={clearLabel}
            data-slot="expanding-search-clear"
            className={cn(iconButton, "size-8 hover:bg-foreground/6")}
            onClick={() => {
              setValue("");
              focusNext.current = "input";
              inputRef.current?.focus();
            }}
          >
            <Glyph d="M18 6 6 18M6 6l12 12" />
          </button>
        ) : null}
      </div>
      {children}
    </form>
  );
}

export { expandingSearchVariants };
