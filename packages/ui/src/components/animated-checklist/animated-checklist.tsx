"use client";

// Ported from bencho Checklist (MIT, © 2026 Lorenzo Cabra). See THIRD_PARTY_NOTICES.md.
import { cva, type VariantProps } from "class-variance-authority";
import { MotionConfig, motion } from "motion/react";
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
 *
 * `sortDone` and `size` are Dowel additions; `sortDone` is inspired by the
 * Rare UI task-list pattern (no code referenced). A ticked task first finishes
 * its tick — the fill, the strike, the fade — and only then glides to the
 * bottom; unticked, it glides straight back to its place. Only the displayed
 * order changes: `items` and `onItemsChange` keep the order they were given.
 * The glide is a `motion` layout animation, the shared-layout case ADR 0014
 * gives to the library: each row is FLIPped from its old position to its new
 * one on a spring, so nothing snaps. React moves the row's DOM node and puts
 * focus back on the checkbox that had it, so someone ticking with Space stays
 * on the task they ticked wherever it lands. `size` scales the text, the box,
 * the row height, the padding and the corner together, keeping the box exactly
 * one line of its label tall (1.25 × the font size, the label's line height).
 */

const animatedChecklistVariants = cva(
  "flex w-[18.75rem] max-w-full flex-col bg-card text-card-foreground",
  {
    variants: {
      /** A hairline ring — the source's Stroke switch. */
      stroke: {
        true: "shadow-[inset_0_0_0_1px_var(--color-border)]",
        false: "",
      },
      /** Scales text, box, rows, padding and corner together. `md` is the source's size. */
      size: {
        sm: "rounded-[0.875rem] px-3 py-0.5",
        md: "rounded-[1.125rem] px-3.5 py-0.75",
        lg: "rounded-[1.375rem] px-4 py-1",
      },
    },
    defaultVariants: { stroke: false, size: "md" },
  },
);

/** The row at each size. `box` is the label's line height: 1.25 × its font size. */
const SIZES = {
  sm: { box: 15, row: "h-8", gap: "gap-2.5", text: "text-xs", remove: "size-6" },
  md: { box: 18, row: "h-10", gap: "gap-3", text: "text-sm", remove: "size-7" },
  lg: { box: 20, row: "h-12", gap: "gap-3.5", text: "text-base", remove: "size-8" },
} as const;

/** How long a ticked task rests before it sinks: its fill, strike and fade, and a beat. */
const SETTLE = 600;

/** The glide to a new place. Just under-damped, so it lands softly rather than snapping. */
const GLIDE = { type: "spring", visualDuration: 0.45, bounce: 0.12 } as const;

/** The theme's motion scale where the list is, so the settle pause follows it. */
function motionScale(element: Element | null): number {
  if (!element) return 1;
  const value = Number.parseFloat(getComputedStyle(element).getPropertyValue("--motion-scale"));
  return Number.isFinite(value) ? value : 1;
}

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
  /** Checkbox size in pixels. The corner stays 32% of it. Defaults to one line of the label at `size`. */
  boxSize?: number;
  /**
   * Once a task has finished its tick, glide it to the bottom of the list, and
   * back to its place when unticked. Changes only the order shown.
   */
  sortDone?: boolean;
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
  boxSize,
  size,
  sortDone = false,
  radius,
  style,
  ...props
}: AnimatedChecklistProps) {
  const uid = useId();
  const scale = SIZES[size ?? "md"];
  const [uncontrolled, setUncontrolled] = useState(defaultItems);
  const items = itemsProp ?? uncontrolled;
  // Tasks shown in the done group at the bottom. A task already done on first
  // paint starts there; one ticked later joins after its tick has played.
  const [sunk, setSunk] = useState<ReadonlySet<string>>(
    () => new Set(sortDone ? items.filter((item) => item.done).map((item) => item.id) : []),
  );
  const timers = useRef(
    new Map<string, { down: boolean; timer: ReturnType<typeof setTimeout> }>(),
  );
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [announced, setAnnounced] = useState("");
  const created = useRef(0);
  const addRef = useRef<HTMLButtonElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const pendingFocus = useRef<string | null>(null);
  const full = items.length >= maxItems;

  // Unticking lifts a task at once; only sinking waits for the tick to finish.
  const isSunk = (item: ChecklistItem) => sortDone && item.done === true && sunk.has(item.id);
  const shown = sortDone
    ? [...items.filter((item) => !isSunk(item)), ...items.filter(isSunk)]
    : items;
  const order = shown.map((item) => item.id).join("\u0000");

  // One timer per task whose group is about to change. A task ticked and
  // unticked again before its timer fires never moves.
  useEffect(() => {
    const pending = timers.current;
    const present = new Set<string>();
    for (const item of items) {
      present.add(item.id);
      const down = sortDone && item.done === true;
      const waiting = pending.get(item.id);
      if (down === sunk.has(item.id)) {
        if (waiting) {
          clearTimeout(waiting.timer);
          pending.delete(item.id);
        }
        continue;
      }
      if (waiting?.down === down) continue;
      if (waiting) clearTimeout(waiting.timer);
      const timer = setTimeout(
        () => {
          pending.delete(item.id);
          setSunk((current) => {
            const next = new Set(current);
            if (down) next.add(item.id);
            else next.delete(item.id);
            return next;
          });
        },
        down ? SETTLE * motionScale(listRef.current) : 0,
      );
      pending.set(item.id, { down, timer });
    }
    for (const [id, waiting] of pending) {
      if (present.has(id)) continue;
      clearTimeout(waiting.timer);
      pending.delete(id);
    }
  }, [items, sunk, sortDone]);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const waiting of pending.values()) clearTimeout(waiting.timer);
    };
  }, []);

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

  function remove(id: string) {
    const index = shown.findIndex((item) => item.id === id);
    const item = shown[index];
    if (!item) return;
    commit(items.filter((entry) => entry.id !== id));
    setAnnounced(`Removed: ${item.label}`);
    // The neighbour on screen, which with sortDone is not always the one in `items`.
    const rest = shown.filter((entry) => entry.id !== id);
    const neighbour = rest[index] ?? rest[index - 1];
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
    <MotionConfig reducedMotion="user">
      <div
        role="group"
        data-slot="animated-checklist"
        data-size={size ?? "md"}
        className={cn(animatedChecklistVariants({ stroke, size }), className)}
        style={
          {
            ...(radius === undefined ? {} : { borderRadius: `${String(radius)}px` }),
            "--animated-checklist-box": `${String(boxSize ?? scale.box)}px`,
            "--animated-checklist-ease": ease,
            ...style,
          } as CSSProperties
        }
        {...props}
      >
        <ul ref={listRef} data-slot="animated-checklist-list" className="flex flex-col">
          {shown.map((item) => (
            <motion.li
              key={item.id}
              layout={sortDone ? "position" : false}
              layoutDependency={order}
              transition={GLIDE}
              data-item={item.id}
              data-done={item.done || undefined}
              data-sunk={isSunk(item) || undefined}
              className={cn(
                "group/row relative flex items-center gap-1 rounded-xl",
                scale.row,
                "transition-[opacity,translate] duration-[var(--duration-normal)] ease-[var(--ease-out-quint)]",
                "starting:-translate-y-1 starting:opacity-0",
              )}
            >
              <label
                className={cn(
                  "flex h-full min-w-0 flex-1 cursor-pointer items-center",
                  scale.gap,
                )}
              >
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
                    // The size before the leading: a later font size would drop it.
                    scale.text,
                    "relative min-w-0 truncate leading-tight font-[450] tracking-[-0.01em]",
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
                    "grid shrink-0 place-items-center rounded-md text-muted-foreground opacity-0",
                    scale.remove,
                    "transition-opacity duration-[var(--duration-fast)] group-hover/row:opacity-100 focus-visible:opacity-100",
                    "hover:bg-foreground/6 hover:text-foreground",
                    focusRing,
                  )}
                  onClick={() => {
                    remove(item.id);
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
            </motion.li>
          ))}
        </ul>
        {allowAdd && !full ? (
          <div
            data-slot="animated-checklist-add"
            className={cn("flex items-center", scale.row, scale.gap)}
          >
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
                className={cn(
                  "h-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-foreground/34",
                  scale.text,
                )}
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
                  "rounded-sm opacity-34 transition-opacity duration-[var(--duration-fast)] hover:opacity-62",
                  scale.text,
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
    </MotionConfig>
  );
}

export { animatedChecklistVariants };
