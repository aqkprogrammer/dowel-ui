"use client";

import { Popover as PopoverPrimitive } from "radix-ui";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/**
 * A searchable single-select.
 *
 * Implements the ARIA combobox pattern directly on a popover rather than
 * depending on a command-menu package: the input owns `role="combobox"`, the
 * list owns `role="listbox"`, and the active option is tracked with
 * `aria-activedescendant` so focus never leaves the input while typing.
 *
 * Navigation reads the rendered options from the DOM rather than a registry,
 * which keeps the active option correct as filtering adds and removes items —
 * a registry has to be kept in sync with what is actually on screen, and drifts.
 *
 * This version is single-select and flat. Multi-select and grouping can be
 * added without changing this API.
 */

/** Default match: case-insensitive substring over the value and any keywords. */
export function defaultComboboxFilter(search: string, haystack: string[]): boolean {
  const needle = search.trim().toLowerCase();
  if (!needle) return true;
  return haystack.some((entry) => entry.toLowerCase().includes(needle));
}

interface ComboboxContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  search: string;
  setSearch: (search: string) => void;
  value: string | undefined;
  select: (value: string) => void;
  activeValue: string | undefined;
  setActiveValue: (value: string | undefined) => void;
  filter: (search: string, haystack: string[]) => boolean;
  listId: string;
  inputId: string;
  optionId: (value: string) => string;
  listRef: React.RefObject<HTMLDivElement | null>;
  registerVisible: (value: string, visible: boolean) => void;
  visibleCount: number;
}

const ComboboxContext = createContext<ComboboxContextValue | null>(null);

function useCombobox(component: string): ComboboxContextValue {
  const context = useContext(ComboboxContext);
  if (!context) {
    throw new Error(`${component} must be rendered inside <Combobox>.`);
  }
  return context;
}

export interface ComboboxProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Overrides how a search string is matched against an option. */
  filter?: (search: string, haystack: string[]) => boolean;
  children?: ReactNode;
}

export function Combobox({
  value: valueProp,
  defaultValue,
  onValueChange,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  filter = defaultComboboxFilter,
  children,
}: ComboboxProps) {
  const uid = useId();

  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const value = valueProp === undefined ? uncontrolledValue : valueProp;

  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const open = openProp === undefined ? uncontrolledOpen : openProp;

  const [search, setSearch] = useState("");
  const [activeValue, setActiveValue] = useState<string | undefined>(undefined);
  const listRef = useRef<HTMLDivElement | null>(null);

  // Counted rather than listed: the empty state only needs to know whether
  // anything survived the filter.
  const visibleValues = useRef(new Set<string>());
  const [visibleCount, setVisibleCount] = useState(0);

  const registerVisible = useCallback((optionValue: string, visible: boolean) => {
    const set = visibleValues.current;
    const had = set.has(optionValue);
    if (visible && !had) set.add(optionValue);
    else if (!visible && had) set.delete(optionValue);
    else return;
    setVisibleCount(set.size);
  }, []);

  const setOpen = useCallback(
    (next: boolean) => {
      if (openProp === undefined) setUncontrolledOpen(next);
      onOpenChange?.(next);
      // Reopening should start from a clean search rather than resuming a
      // half-typed query the user has forgotten about.
      if (!next) {
        setSearch("");
        setActiveValue(undefined);
      }
    },
    [openProp, onOpenChange],
  );

  const select = useCallback(
    (next: string) => {
      if (valueProp === undefined) setUncontrolledValue(next);
      onValueChange?.(next);
      setOpen(false);
    },
    [valueProp, onValueChange, setOpen],
  );

  const context = useMemo<ComboboxContextValue>(
    () => ({
      open,
      setOpen,
      search,
      setSearch,
      value,
      select,
      activeValue,
      setActiveValue,
      filter,
      listId: `${uid}-list`,
      inputId: `${uid}-input`,
      optionId: (optionValue: string) =>
        `${uid}-option-${optionValue.replace(/\s+/g, "-").toLowerCase()}`,
      listRef,
      registerVisible,
      visibleCount,
    }),
    [
      open,
      setOpen,
      search,
      value,
      select,
      activeValue,
      filter,
      uid,
      registerVisible,
      visibleCount,
    ],
  );

  return (
    <ComboboxContext.Provider value={context}>
      <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
        {children}
      </PopoverPrimitive.Root>
    </ComboboxContext.Provider>
  );
}

export interface ComboboxTriggerProps extends ComponentPropsWithRef<"button"> {
  /** Shown when nothing is selected. */
  placeholder?: string;
}

export function ComboboxTrigger({
  className,
  placeholder = "Select…",
  children,
  ...props
}: ComboboxTriggerProps) {
  const { value, open } = useCombobox("ComboboxTrigger");

  return (
    <PopoverPrimitive.Trigger asChild>
      <button
        type="button"
        data-slot="combobox-trigger"
        aria-expanded={open}
        className={cn(
          "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-background",
          "px-3 text-sm shadow-xs transition-[border-color,box-shadow] duration-[var(--duration-fast)]",
          "focus-visible:border-ring",
          "disabled:cursor-not-allowed disabled:opacity-55",
          "aria-invalid:border-destructive",
          focusRing,
          className,
        )}
        {...props}
      >
        <span className={cn("truncate", !value && "text-muted-foreground")}>
          {children ?? value ?? placeholder}
        </span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className="size-4 shrink-0 opacity-60"
        >
          <path
            d="m7 10 5 5 5-5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </PopoverPrimitive.Trigger>
  );
}

export interface ComboboxContentProps extends ComponentPropsWithRef<
  typeof PopoverPrimitive.Content
> {
  /** Names the popover, which carries role="dialog". */
  label?: string;
}

export function ComboboxContent({
  className,
  align = "start",
  sideOffset = 6,
  label = "Search options",
  children,
  ...props
}: ComboboxContentProps) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="combobox-content"
        align={align}
        sideOffset={sideOffset}
        aria-label={label}
        // Focus belongs in the search input, which the input claims on mount.
        onOpenAutoFocus={(event) => {
          event.preventDefault();
        }}
        className={cn(
          "z-[var(--z-popover)] w-[var(--radix-popover-trigger-width)] min-w-48 overflow-hidden",
          "rounded-lg border border-border bg-popover p-0 text-popover-foreground shadow-lg",
          "origin-[var(--radix-popover-content-transform-origin)]",
          "data-[state=closed]:animate-float-out data-[state=open]:animate-float-in",
          className,
        )}
        {...props}
      >
        {children}
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  );
}

/** Options currently rendered, in DOM order and excluding disabled ones. */
function visibleOptions(list: HTMLElement | null): HTMLElement[] {
  if (!list) return [];
  return Array.from(list.querySelectorAll<HTMLElement>('[role="option"]:not([data-disabled])'));
}

export type ComboboxInputProps = Omit<ComponentPropsWithRef<"input">, "value" | "onChange">;

export function ComboboxInput({ className, ...props }: ComboboxInputProps) {
  const {
    search,
    setSearch,
    activeValue,
    setActiveValue,
    select,
    setOpen,
    listId,
    inputId,
    optionId,
    listRef,
  } = useCombobox("ComboboxInput");

  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const move = useCallback(
    (delta: number | "first" | "last") => {
      const options = visibleOptions(listRef.current);
      if (options.length === 0) return;

      const currentIndex = options.findIndex((option) => option.dataset.value === activeValue);

      let nextIndex: number;
      if (delta === "first") nextIndex = 0;
      else if (delta === "last") nextIndex = options.length - 1;
      else if (currentIndex === -1) nextIndex = delta > 0 ? 0 : options.length - 1;
      // Wraps, so holding an arrow key never dead-ends at the edge of the list.
      else nextIndex = (currentIndex + delta + options.length) % options.length;

      const next = options[nextIndex];
      if (!next) return;
      setActiveValue(next.dataset.value);
      next.scrollIntoView({ block: "nearest" });
    },
    [activeValue, listRef, setActiveValue],
  );

  function handleKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        move(1);
        break;
      case "ArrowUp":
        event.preventDefault();
        move(-1);
        break;
      case "Home":
        event.preventDefault();
        move("first");
        break;
      case "End":
        event.preventDefault();
        move("last");
        break;
      case "Enter": {
        if (activeValue === undefined) return;
        event.preventDefault();
        select(activeValue);
        break;
      }
      case "Escape":
        event.preventDefault();
        setOpen(false);
        break;
      default:
        break;
    }
  }

  return (
    <div className="flex items-center gap-2 border-b border-border px-3">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="size-4 shrink-0 opacity-55"
      >
        <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
        <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <input
        ref={inputRef}
        id={inputId}
        data-slot="combobox-input"
        type="text"
        role="combobox"
        autoComplete="off"
        aria-expanded="true"
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={activeValue ? optionId(activeValue) : undefined}
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
          // The previous active option may have just been filtered out.
          setActiveValue(undefined);
        }}
        onKeyDown={handleKeyDown}
        className={cn(
          "h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground",
          className,
        )}
        {...props}
      />
    </div>
  );
}

export function ComboboxList({ className, ...props }: ComponentPropsWithRef<"div">) {
  const { listId, listRef } = useCombobox("ComboboxList");

  return (
    <div
      ref={listRef}
      id={listId}
      role="listbox"
      data-slot="combobox-list"
      className={cn("max-h-64 overflow-y-auto overscroll-contain p-1", className)}
      {...props}
    />
  );
}

export interface ComboboxItemProps extends Omit<
  ComponentPropsWithRef<"div">,
  "onSelect" | "children"
> {
  /** The value reported by onValueChange, and the primary search term. */
  value: string;
  /** Extra search terms that are not shown, such as synonyms or an id. */
  keywords?: string[];
  disabled?: boolean;
  children?: ReactNode;
}

export function ComboboxItem({
  className,
  value,
  keywords,
  disabled,
  children,
  ...props
}: ComboboxItemProps) {
  const {
    search,
    filter,
    value: selectedValue,
    activeValue,
    setActiveValue,
    select,
    optionId,
    registerVisible,
  } = useCombobox("ComboboxItem");

  // A string child is the visible label, so it is searchable for free. Richer
  // children cannot be read purely, so those pass `keywords` instead.
  const haystack = useMemo(
    () => [value, ...(keywords ?? []), typeof children === "string" ? children : ""],
    [value, keywords, children],
  );

  const visible = filter(search, haystack);
  const selected = selectedValue === value;
  const active = activeValue === value;

  useEffect(() => {
    registerVisible(value, visible && !disabled);
    return () => {
      registerVisible(value, false);
    };
  }, [registerVisible, value, visible, disabled]);

  if (!visible) return null;

  return (
    <div
      id={optionId(value)}
      role="option"
      data-slot="combobox-item"
      data-value={value}
      data-active={active || undefined}
      data-disabled={disabled || undefined}
      aria-selected={selected}
      aria-disabled={disabled || undefined}
      // Programmatically focusable but out of the tab order: in an
      // aria-activedescendant listbox the input keeps real focus and options are
      // only virtually focused, so they must never become tab stops.
      tabIndex={-1}
      onPointerMove={() => {
        if (!disabled) setActiveValue(value);
      }}
      onMouseDown={(event) => {
        // Without this, pressing on an option blurs the search input, which
        // breaks aria-activedescendant and can dismiss the popover before the
        // click ever lands.
        event.preventDefault();
      }}
      onClick={() => {
        if (!disabled) select(value);
      }}
      onKeyDown={(event) => {
        // Reachable only if a consumer focuses an option directly; the normal
        // path is Enter on the input, handled by ComboboxInput.
        if (disabled) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          select(value);
        }
      }}
      className={cn(
        "relative flex cursor-default items-center gap-2 rounded-md py-1.5 pr-8 pl-2 text-sm outline-none select-none",
        "transition-colors duration-[var(--duration-instant)]",
        "data-[active]:bg-accent data-[active]:text-accent-foreground",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-55",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      {children ?? value}
      {selected ? (
        <span className="absolute right-2 grid size-4 place-items-center">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-3.5">
            <path
              d="m5 13 4 4L19 7"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      ) : null}
    </div>
  );
}

/** Shown only when the filter leaves nothing. */
export function ComboboxEmpty({ className, children, ...props }: ComponentPropsWithRef<"div">) {
  const { visibleCount } = useCombobox("ComboboxEmpty");
  if (visibleCount > 0) return null;

  return (
    <div
      data-slot="combobox-empty"
      role="presentation"
      className={cn("px-3 py-6 text-center text-sm text-muted-foreground", className)}
      {...props}
    >
      {children ?? "No results found."}
    </div>
  );
}
