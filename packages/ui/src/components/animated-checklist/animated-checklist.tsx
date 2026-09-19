"use client";

// Ported from bencho Checklist (MIT, © 2026 Lorenzo Cabra). See THIRD_PARTY_NOTICES.md.
import { cva, type VariantProps } from "class-variance-authority";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
  type KeyboardEvent,
} from "react";

import { Checkbox } from "@/components/checkbox";
import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A small task list whose boxes fill with a bounce, whose ticks draw in, and
 * whose done tasks fade and are struck through.
 *
 * Every row is Dowel's Checkbox inside a <label>, so the whole row toggles and
 * the checkbox semantics, focus ring and tick-drawing are the Checkbox's own.
 * This component only restyles the box — a fill that scales in from the centre
 * with an overshoot (the source's JS spring, as a CSS transition whose bezier
 * takes the `bounce` amount) — and adds the strike, the list and the add row.
 *
 * Added over the source, which lists them as missing: a labelled group and a
 * real list, Escape to cancel adding (focus returns to "Add new task"),
 * optional removal, and polite announcements when a task is added or removed.
 */

const animatedChecklistVariants = cva(
  "flex w-[18.75rem] max-w-full flex-col rounded-[1.125rem] bg-card px-3.5 py-0.75 text-card-foreground",
  {
    variants: {
      /** A hairline ring — the source's Stroke switch. */
      stroke: {
        true: "shadow-[inset_0_0_0_1px_var(--color-border)]",
        false: "",
      },
    },
    defaultVariants: { stroke: false },
  },
);

/** Dowel's Checkbox, restyled: an outline box that fills from the centre. */
const box = cn(
  "relative size-[var(--animated-checklist-box)] overflow-hidden rounded-[32%] border-[1.5px] border-foreground/28 bg-transparent shadow-none",
  "before:absolute before:inset-0 before:scale-0 before:rounded-[inherit] before:bg-foreground before:content-['']",
  "before:transition-[scale] before:duration-[var(--duration-slower)] before:ease-[var(--animated-checklist-ease)]",
  "data-[state=checked]:border-transparent data-[state=checked]:bg-transparent data-[state=checked]:text-card data-[state=checked]:before:scale-100",
  "[&_svg]:size-[68%] [&>[data-slot=checkbox-indicator]]:relative",
);

export interface ChecklistItem {
  id: string;
  label: string;
  done?: boolean;
}

export interface AnimatedChecklistProps
  extends
    Omit<ComponentPropsWithRef<"div">, "defaultValue" | "onChange">,
    VariantProps<typeof animatedChecklistVariants> {
  /** Controlled tasks. */
  items?: ChecklistItem[];
  /** Initial tasks when uncontrolled. */
  defaultItems?: ChecklistItem[];
  /** Called with the new list whenever a task is checked, added or removed. */
  onItemsChange?: (items: ChecklistItem[]) => void;
  /** Show the "Add new task" row. */
  allowAdd?: boolean;
  /** The add row hides once the list reaches this many tasks. */
  maxItems?: number;
  /** Show a remove button on each task. */
  removable?: boolean;
  addLabel?: string;
  placeholder?: string;
  /** Longest task label, in characters. */
  maxLength?: number;
  /** Fill overshoot, 0–100. */
  bounce?: number;
  /** Checkbox size in pixels. The corner stays 32% of it. */
  boxSize?: number;
  /** Card corner radius in pixels. Defaults to 18. */
  radius?: number;
}

/** A task list with bouncing checkboxes, drawn ticks and struck-through done tasks. */
export function AnimatedChecklist({
  className,
  stroke,
  items: itemsProp,
  defaultItems = [],
  onItemsChange,
  allowAdd = true,
  maxItems = Number.POSITIVE_INFINITY,
  removable = false,
  addLabel = "Add new task",
  placeholder = "New task",
  maxLength = 40,
  bounce = 50,
  boxSize = 18,
  radius,
  style,
  ...props
}: AnimatedChecklistProps) {
  const uid = useId();
  const [uncontrolled, setUncontrolled] = useState(defaultItems);
  const items = itemsProp ?? uncontrolled;
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [announced, setAnnounced] = useState("");
  const created = useRef(0);
  const addRef = useRef<HTMLButtonElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const pendingFocus = useRef<string | null>(null);
  const full = items.length >= maxItems;

  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  // Focus that has to wait for the list to re-render: after a removal, or
  // after an add that filled the list.
  useEffect(() => {
    const target = pendingFocus.current;
    if (target === null) return;
    pendingFocus.current = null;
    if (target === "add") {
      addRef.current?.focus();
      return;
    }
    const rows = listRef.current?.querySelectorAll<HTMLElement>("[data-item]") ?? [];
    const row = [...rows].find((element) => element.dataset.item === target);
    row?.querySelector<HTMLElement>("[role=checkbox]")?.focus();
  });

  function commit(next: ChecklistItem[]) {
    if (itemsProp === undefined) setUncontrolled(next);
    onItemsChange?.(next);
  }

  function toggle(id: string, done: boolean) {
    commit(items.map((item) => (item.id === id ? { ...item, done } : item)));
  }

  function add() {
    const label = draft.trim();
    if (!label) return;
    created.current += 1;
    const item = { id: `${uid}-${String(created.current)}`, label, done: false };
    const next = [...items, item];
    commit(next);
    setDraft("");
    setAnnounced(`Added: ${label}`);
    if (next.length >= maxItems) {
      setAdding(false);
      pendingFocus.current = item.id;
    }
  }

  function remove(index: number) {
    const item = items[index];
    if (!item) return;
    const next = items.filter((_, position) => position !== index);
    commit(next);
    setAnnounced(`Removed: ${item.label}`);
    const neighbour = next[index] ?? next[index - 1];
    pendingFocus.current = neighbour ? neighbour.id : "add";
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      add();
    } else if (event.key === "Escape") {
      event.preventDefault();
      setDraft("");
      setAdding(false);
      pendingFocus.current = "add";
    }
  }

  const ease = `cubic-bezier(0.34, ${String(1 + (bounce / 100) * 1.1)}, 0.64, 1)`;

  return (
    <div
      role="group"
      data-slot="animated-checklist"
      className={cn(animatedChecklistVariants({ stroke }), className)}
      style={
        {
          ...(radius === undefined ? {} : { borderRadius: `${String(radius)}px` }),
          "--animated-checklist-box": `${String(boxSize)}px`,
          "--animated-checklist-ease": ease,
          ...style,
        } as CSSProperties
      }
      {...props}
    >
      <ul ref={listRef} data-slot="animated-checklist-list" className="flex flex-col">
        {items.map((item, index) => (
          <li
            key={item.id}
            data-item={item.id}
            data-done={item.done || undefined}
            className={cn(
              "group/row flex h-10 items-center gap-1 rounded-xl",
              "transition-[opacity,translate] duration-[var(--duration-normal)] ease-[var(--ease-out-quint)]",
              "starting:-translate-y-1 starting:opacity-0",
            )}
          >
            <label className="flex h-full min-w-0 flex-1 cursor-pointer items-center gap-3">
              <Checkbox
                checked={item.done ?? false}
                onCheckedChange={(checked) => {
                  toggle(item.id, checked === true);
                }}
                className={box}
              />
              <span
                data-slot="animated-checklist-text"
                className={cn(
                  "relative min-w-0 truncate text-sm leading-tight font-[450] tracking-[-0.01em]",
                  "transition-opacity duration-[var(--duration-normal)] group-data-[done]/row:opacity-42",
                )}
              >
                {item.label}
                <span
                  aria-hidden="true"
                  data-slot="animated-checklist-rule"
                  className={cn(
                    "absolute inset-x-0 top-[46%] h-[1.5px] origin-left scale-x-0 rounded-sm bg-current rtl:origin-right",
                    "transition-[scale] duration-[var(--duration-normal)] ease-[var(--ease-out-quint)]",
                    "group-data-[done]/row:scale-x-100",
                  )}
                />
              </span>
            </label>
            {removable ? (
              <button
                type="button"
                aria-label={`Remove ${item.label}`}
                data-slot="animated-checklist-remove"
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground opacity-0",
                  "transition-opacity duration-[var(--duration-fast)] group-hover/row:opacity-100 focus-visible:opacity-100",
                  "hover:bg-foreground/6 hover:text-foreground",
                  focusRing,
                )}
                onClick={() => {
                  remove(index);
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden="true"
                  className="size-3.5"
                >
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            ) : null}
          </li>
        ))}
      </ul>
      {allowAdd && !full ? (
        <div data-slot="animated-checklist-add" className="flex h-10 items-center gap-3">
          <span
            aria-hidden="true"
            className="size-[var(--animated-checklist-box)] shrink-0 rounded-[32%] shadow-[inset_0_0_0_1.5px_color-mix(in_oklab,var(--color-foreground)_16%,transparent)]"
          />
          {adding ? (
            <input
              ref={inputRef}
              aria-label={placeholder}
              placeholder={placeholder}
              maxLength={maxLength}
              value={draft}
              data-slot="animated-checklist-input"
              className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-foreground/34"
              onChange={(event) => {
                setDraft(event.target.value);
              }}
              onKeyDown={handleInputKeyDown}
              onBlur={() => {
                if (!draft.trim()) setAdding(false);
              }}
            />
          ) : (
            <button
              ref={addRef}
              type="button"
              data-slot="animated-checklist-new"
              className={cn(
                "rounded-sm text-sm opacity-34 transition-opacity duration-[var(--duration-fast)] hover:opacity-62",
                focusRing,
                "focus-visible:opacity-62",
              )}
              onClick={() => {
                setAdding(true);
              }}
            >
              {addLabel}
            </button>
          )}
        </div>
      ) : null}
      <span role="status" aria-live="polite" className="sr-only">
        {announced}
      </span>
    </div>
  );
}

export { animatedChecklistVariants };
