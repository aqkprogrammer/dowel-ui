"use client";

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

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/dialog";
import { cn } from "@/lib/utils";

/**
 * A searchable list of commands.
 *
 * Shares its navigation model with Combobox — the input owns `role="combobox"`,
 * the list owns `role="listbox"`, and the active item is tracked with
 * `aria-activedescendant` so focus never leaves the input. Ordering is read
 * from the DOM rather than a registry, which stays correct as filtering adds
 * and removes items.
 *
 * Unlike Combobox this has no selected value: items run actions. It also
 * supports groups, and a group whose items have all been filtered out hides its
 * own heading rather than leaving a label over nothing.
 */

/** Default match: case-insensitive substring over the value and any keywords. */
export function defaultCommandFilter(search: string, haystack: string[]): boolean {
  const needle = search.trim().toLowerCase();
  if (!needle) return true;
  return haystack.some((entry) => entry.toLowerCase().includes(needle));
}

interface CommandContextValue {
  search: string;
  setSearch: (search: string) => void;
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

const CommandContext = createContext<CommandContextValue | null>(null);

function useCommand(component: string): CommandContextValue {
  const context = useContext(CommandContext);
  if (!context) {
    throw new Error(`${component} must be rendered inside <Command>.`);
  }
  return context;
}

/** Lets a group count how many of its own items survived the filter. */
const CommandGroupContext = createContext<((value: string, visible: boolean) => void) | null>(
  null,
);

/** Counts visible entries by name, so re-registration cannot double-count. */
function useVisibilityCounter() {
  const visible = useRef(new Set<string>());
  const [count, setCount] = useState(0);

  const register = useCallback((value: string, isVisible: boolean) => {
    const set = visible.current;
    const had = set.has(value);
    if (isVisible && !had) set.add(value);
    else if (!isVisible && had) set.delete(value);
    else return;
    setCount(set.size);
  }, []);

  return { count, register };
}

export interface CommandProps extends Omit<ComponentPropsWithRef<"div">, "onSelect"> {
  /** Overrides how a search string is matched against an item. */
  filter?: (search: string, haystack: string[]) => boolean;
  /** Controls the search text. */
  value?: string;
  onValueChange?: (search: string) => void;
}

export function Command({
  className,
  filter = defaultCommandFilter,
  value,
  onValueChange,
  ...props
}: CommandProps) {
  const uid = useId();
  const [uncontrolledSearch, setUncontrolledSearch] = useState("");
  const search = value ?? uncontrolledSearch;
  const [activeValue, setActiveValue] = useState<string | undefined>(undefined);
  const listRef = useRef<HTMLDivElement | null>(null);
  const { count, register } = useVisibilityCounter();

  const setSearch = useCallback(
    (next: string) => {
      if (value === undefined) setUncontrolledSearch(next);
      onValueChange?.(next);
    },
    [value, onValueChange],
  );

  const context = useMemo<CommandContextValue>(
    () => ({
      search,
      setSearch,
      activeValue,
      setActiveValue,
      filter,
      listId: `${uid}-list`,
      inputId: `${uid}-input`,
      optionId: (itemValue: string) =>
        `${uid}-item-${itemValue.replace(/\s+/g, "-").toLowerCase()}`,
      listRef,
      registerVisible: register,
      visibleCount: count,
    }),
    [search, setSearch, activeValue, filter, uid, register, count],
  );

  return (
    <CommandContext.Provider value={context}>
      <div
        data-slot="command"
        className={cn(
          "flex size-full flex-col overflow-hidden rounded-lg bg-popover text-popover-foreground",
          className,
        )}
        {...props}
      />
    </CommandContext.Provider>
  );
}

/** Items currently rendered, in DOM order and excluding disabled ones. */
function visibleItems(list: HTMLElement | null): HTMLElement[] {
  if (!list) return [];
  return Array.from(list.querySelectorAll<HTMLElement>('[role="option"]:not([data-disabled])'));
}

export type CommandInputProps = Omit<ComponentPropsWithRef<"input">, "value" | "onChange">;

export function CommandInput({ className, ...props }: CommandInputProps) {
  const { search, setSearch, activeValue, setActiveValue, listId, inputId, optionId, listRef } =
    useCommand("CommandInput");

  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const move = useCallback(
    (delta: number | "first" | "last") => {
      const items = visibleItems(listRef.current);
      if (items.length === 0) return;

      const currentIndex = items.findIndex((item) => item.dataset.value === activeValue);

      let nextIndex: number;
      if (delta === "first") nextIndex = 0;
      else if (delta === "last") nextIndex = items.length - 1;
      else if (currentIndex === -1) nextIndex = delta > 0 ? 0 : items.length - 1;
      else nextIndex = (currentIndex + delta + items.length) % items.length;

      const next = items[nextIndex];
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
        // Running the item by clicking it keeps one code path for pointer and
        // keyboard, so the two can never drift apart.
        const item = visibleItems(listRef.current).find(
          (candidate) => candidate.dataset.value === activeValue,
        );
        item?.click();
        break;
      }
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
        data-slot="command-input"
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
          // The active item may have just been filtered away.
          setActiveValue(undefined);
        }}
        onKeyDown={handleKeyDown}
        className={cn(
          "h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground",
          className,
        )}
        {...props}
      />
    </div>
  );
}

export function CommandList({ className, ...props }: ComponentPropsWithRef<"div">) {
  const { listId, listRef } = useCommand("CommandList");

  return (
    <div
      ref={listRef}
      id={listId}
      role="listbox"
      data-slot="command-list"
      className={cn("max-h-80 overflow-y-auto overscroll-contain p-1", className)}
      {...props}
    />
  );
}

export function CommandEmpty({ className, children, ...props }: ComponentPropsWithRef<"div">) {
  const { visibleCount } = useCommand("CommandEmpty");
  if (visibleCount > 0) return null;

  return (
    <div
      data-slot="command-empty"
      role="presentation"
      className={cn("px-3 py-8 text-center text-sm text-muted-foreground", className)}
      {...props}
    >
      {children ?? "No results found."}
    </div>
  );
}

export interface CommandGroupProps extends ComponentPropsWithRef<"div"> {
  heading?: ReactNode;
}

export function CommandGroup({ className, heading, children, ...props }: CommandGroupProps) {
  const uid = useId();
  const { count, register } = useVisibilityCounter();
  const empty = count === 0;

  return (
    <div
      data-slot="command-group"
      role="group"
      aria-labelledby={heading && !empty ? `${uid}-heading` : undefined}
      // Hidden rather than unmounted: the items inside are what report whether
      // anything matched, and unmounting them would stop the reports and leave
      // the group permanently empty.
      hidden={empty || undefined}
      className={cn("py-1 first:pt-0", className)}
      {...props}
    >
      {heading && !empty ? (
        <div
          id={`${uid}-heading`}
          className="px-2 py-1.5 text-xs font-medium text-muted-foreground"
        >
          {heading}
        </div>
      ) : null}
      <CommandGroupContext.Provider value={register}>{children}</CommandGroupContext.Provider>
    </div>
  );
}

export interface CommandItemProps extends Omit<
  ComponentPropsWithRef<"div">,
  "onSelect" | "children"
> {
  /** Identifies the item, and is the primary search term. */
  value: string;
  /** Extra search terms that are not shown. */
  keywords?: string[];
  disabled?: boolean;
  onSelect?: (value: string) => void;
  children?: ReactNode;
}

export function CommandItem({
  className,
  value,
  keywords,
  disabled,
  onSelect,
  children,
  ...props
}: CommandItemProps) {
  const { search, filter, activeValue, setActiveValue, optionId, registerVisible } =
    useCommand("CommandItem");
  const registerInGroup = useContext(CommandGroupContext);

  const haystack = useMemo(
    () => [value, ...(keywords ?? []), typeof children === "string" ? children : ""],
    [value, keywords, children],
  );

  const visible = filter(search, haystack);
  const active = activeValue === value;
  const counts = visible && !disabled;

  useEffect(() => {
    registerVisible(value, counts);
    registerInGroup?.(value, counts);
    return () => {
      registerVisible(value, false);
      registerInGroup?.(value, false);
    };
  }, [registerVisible, registerInGroup, value, counts]);

  if (!visible) return null;

  return (
    <div
      id={optionId(value)}
      role="option"
      data-slot="command-item"
      data-value={value}
      data-active={active || undefined}
      data-disabled={disabled || undefined}
      aria-selected={active}
      aria-disabled={disabled || undefined}
      // Programmatically focusable but never a tab stop: the input keeps focus
      // and items are only virtually focused via aria-activedescendant.
      tabIndex={-1}
      onPointerMove={() => {
        if (!disabled) setActiveValue(value);
      }}
      onMouseDown={(event) => {
        // Keeps focus in the input, so aria-activedescendant stays valid and a
        // hosting dialog does not close before the click lands.
        event.preventDefault();
      }}
      onClick={() => {
        if (!disabled) onSelect?.(value);
      }}
      onKeyDown={(event) => {
        if (disabled) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect?.(value);
        }
      }}
      className={cn(
        "relative flex cursor-default items-center gap-2 rounded-md px-2 py-2 text-sm outline-none select-none",
        "transition-colors duration-[var(--duration-instant)]",
        "data-[active]:bg-accent data-[active]:text-accent-foreground",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-55",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      {children ?? value}
    </div>
  );
}

export function CommandSeparator({ className, ...props }: ComponentPropsWithRef<"div">) {
  return (
    <div
      data-slot="command-separator"
      aria-hidden="true"
      className={cn("-mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  );
}

/** Keyboard hint. Decorative — bind the shortcut for real at the app level. */
export function CommandShortcut({ className, ...props }: ComponentPropsWithRef<"span">) {
  return (
    <span
      data-slot="command-shortcut"
      aria-hidden="true"
      className={cn("ms-auto text-2xs tracking-wide text-muted-foreground", className)}
      {...props}
    />
  );
}

export interface CommandDialogProps extends ComponentPropsWithRef<typeof Dialog> {
  /** Names the dialog for assistive technology. Visually hidden by default. */
  title?: string;
  description?: string;
  className?: string;
}

/**
 * The palette in a modal, for the ⌘K pattern.
 *
 * The title and description are rendered but visually hidden: a dialog needs an
 * accessible name whether or not the design shows one, and leaving it out is
 * the most common defect in hand-rolled command menus.
 */
export function CommandDialog({
  title = "Command palette",
  description = "Search for a command to run.",
  children,
  className,
  ...props
}: CommandDialogProps) {
  return (
    <Dialog {...props}>
      <DialogContent
        showCloseButton={false}
        className={cn("max-w-lg overflow-hidden p-0", className)}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <Command className="rounded-none">{children}</Command>
      </DialogContent>
    </Dialog>
  );
}
