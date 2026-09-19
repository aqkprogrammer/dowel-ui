"use client";

// Ported from bencho Assignees (MIT, © 2026 Lorenzo Cabra). See THIRD_PARTY_NOTICES.md.
import { cva, type VariantProps } from "class-variance-authority";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
  type KeyboardEvent,
} from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/popover";
import { focusRing, focusRingInset } from "@/lib/styles";
import { cn } from "@/lib/utils";

import { springEasing } from "./assignee-picker-spring";

/*
 * A pill showing who is assigned, as an overlapping stack of faces, that opens
 * a multi-select list of people.
 *
 * Dowel's Popover (Radix) owns the portal, placement, outside click, Escape
 * and focus return. The content itself is the `role="listbox"`: the trigger
 * says `aria-haspopup="listbox"`, focus moves onto the first selected option
 * when it opens, and the options rove with the arrow keys.
 *
 * Every movement is CSS. The card and the rows run keyframes from the hoisted
 * stylesheet on Radix's data-state (Presence waits for the close keyframe
 * before unmounting). A face that joins the stack flies in with a keyframe; one
 * that leaves is kept mounted for its exit keyframe, then dropped. The tick is
 * a transition on a spring expressed as `linear()`. Under reduced motion every
 * duration collapses through --motion-scale and each state simply appears.
 */

const FACE = 28;
const LEAVE_MS = 200;

const STYLES = `
@keyframes dowel-assignee-picker-open {
  0% { opacity: 0; transform: translateY(-10px) scale(.86, .72); }
  30% { opacity: 1; }
  53% { transform: translateY(1.1px) scale(1, 1.03); }
  100% { opacity: 1; transform: none; }
}
@keyframes dowel-assignee-picker-close {
  to { opacity: 0; transform: translateY(-9px) scale(.91, .85); }
}
@keyframes dowel-assignee-picker-row {
  from { opacity: 0; transform: translateY(-8px); }
}
@keyframes dowel-assignee-picker-face-in {
  0% { opacity: 0; transform: translateY(-10px) scale(.2) rotate(-22deg); }
  45% { opacity: 1; }
  65% { transform: scale(1.02) rotate(3.8deg); }
  100% { opacity: 1; transform: none; }
}
@keyframes dowel-assignee-picker-face-out {
  to { opacity: 0; transform: translateY(-6px) scale(.2) rotate(-22deg); }
}
[data-slot="assignee-picker-content"][data-state="open"] {
  animation: dowel-assignee-picker-open calc(340ms * var(--motion-scale)) var(--ease-out-quint) both;
}
[data-slot="assignee-picker-content"][data-state="closed"] {
  animation: dowel-assignee-picker-close calc(120ms * var(--motion-scale)) var(--ease-in-quint) both;
}
[data-slot="assignee-picker-content"][data-state="open"] [data-slot="assignee-picker-option"] {
  animation: dowel-assignee-picker-row calc(150ms * var(--motion-scale)) var(--ease-out-quint)
    calc((50ms + var(--assignee-picker-i, 0) * 33ms) * var(--motion-scale)) both;
}
[data-slot="assignee-picker-face"][data-state="enter"] {
  animation: dowel-assignee-picker-face-in calc(250ms * var(--motion-scale)) var(--ease-out-quint) both;
}
[data-slot="assignee-picker-face"][data-state="leave"] {
  animation: dowel-assignee-picker-face-out calc(${String(LEAVE_MS)}ms * var(--motion-scale)) var(--ease-in-quint) both;
}
@supports (transition-timing-function: linear(0, 1)) {
  [data-slot="assignee-picker-tick"] { transition-timing-function: var(--assignee-picker-spring); }
}
`;

/** The pill and card surfaces. `inverted` is the workbench's dark fill. */
const assigneePickerVariants = cva("", {
  variants: {
    tone: {
      default: "bg-card text-card-foreground [--assignee-picker-surface:var(--color-card)]",
      inverted:
        "bg-foreground text-background [--assignee-picker-surface:var(--color-foreground)]",
    },
    /** A 1px inset hairline around both surfaces. */
    stroke: {
      true: "ring-1 ring-border ring-inset",
      false: "",
    },
  },
  defaultVariants: {
    tone: "default",
    stroke: false,
  },
});

export interface AssigneePickerPerson {
  id: string;
  name: string;
  /** Secondary line, such as a role or team. */
  description?: string;
  /** Image URL. Initials are shown while it loads and if it fails. */
  avatar?: string;
}

export interface AssigneePickerProps
  extends
    Omit<ComponentPropsWithRef<"div">, "defaultValue" | "onChange" | "children">,
    VariantProps<typeof assigneePickerVariants> {
  people: AssigneePickerPerson[];
  /** Controlled selection, as person ids in the order they were assigned. */
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Names the listbox and prefixes the trigger's name ("Assignees: Adam Marsh"). */
  label?: string;
  /** Shown in the pill, and in its name, when nobody is assigned. */
  placeholder?: string;
  /** Pixels each face overlaps the previous one in a `row` stack (0–22). */
  overlap?: number;
  /** Radius of the pill and card in pixels. Rows take a concentric radius. */
  corner?: number;
  /** `row` overlaps the faces; `grid` packs up to four into a 2×2 square. */
  stack?: "row" | "grid";
  /** Most slots in the stack; beyond it the last slot becomes "+N". */
  maxFaces?: number;
  /** Width of the card. Numbers are pixels. */
  contentWidth?: number | string;
  triggerClassName?: string;
  contentClassName?: string;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase();
}

/**
 * Tracks which faces are arriving and which are leaving, so a new face can fly
 * in and a removed one can stay mounted for its exit. Runs in a layout effect
 * so the arriving face is never painted at rest before its keyframe starts.
 */
function useFacePresence(ids: string[]) {
  const [entering, setEntering] = useState<ReadonlySet<string>>(() => new Set());
  const [leaving, setLeaving] = useState<{ id: string; index: number }[]>([]);
  const previous = useRef(ids);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const key = JSON.stringify(ids);

  useLayoutEffect(() => {
    const before = previous.current;
    previous.current = ids;
    const added = ids.filter((id) => !before.includes(id));
    const removed = before
      .map((id, index) => ({ id, index }))
      .filter((face) => !ids.includes(face.id));
    if (added.length > 0) setEntering((set) => new Set([...set, ...added]));
    if (removed.length === 0) return;
    setLeaving((list) => [...list.filter((face) => !ids.includes(face.id)), ...removed]);
    const timer = setTimeout(() => {
      timers.current.delete(timer);
      setLeaving((list) => list.filter((face) => !removed.some((gone) => gone.id === face.id)));
    }, LEAVE_MS);
    timers.current.add(timer);
    // `key` stands for `ids`: a new array with the same people is no change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of pending) clearTimeout(timer);
    };
  }, []);

  return { entering, leaving: leaving.filter((face) => !ids.includes(face.id)) };
}

function Face({
  person,
  className,
  style,
  state,
}: {
  person: AssigneePickerPerson;
  className?: string;
  style: CSSProperties;
  state: "idle" | "enter" | "leave";
}) {
  return (
    <Avatar
      data-slot="assignee-picker-face"
      data-state={state}
      className={cn("absolute top-0 ring-(--assignee-picker-surface)", className)}
      style={style}
    >
      {person.avatar ? <AvatarImage src={person.avatar} alt="" /> : null}
      <AvatarFallback className="bg-muted text-[0.5625rem]">
        {initials(person.name)}
      </AvatarFallback>
    </Avatar>
  );
}

/** A pill of overlapping faces that opens a multi-select list of people. */
export function AssigneePicker({
  className,
  style,
  people,
  value: valueProp,
  defaultValue,
  onValueChange,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  label = "Assignees",
  placeholder = "Unassigned",
  overlap = 10,
  corner = 22,
  stack = "row",
  maxFaces,
  contentWidth = 264,
  tone,
  stroke,
  triggerClassName,
  contentClassName,
  ...props
}: AssigneePickerProps) {
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue ?? []);
  const value = valueProp ?? uncontrolledValue;
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const open = openProp ?? uncontrolledOpen;
  const [active, setActive] = useState(() =>
    Math.max(
      0,
      people.findIndex((person) => value.includes(person.id)),
    ),
  );
  const options = useRef<(HTMLDivElement | null)[]>([]);
  const baseId = useId();

  const byId = new Map(people.map((person) => [person.id, person]));
  const assigned = value.filter((id) => byId.has(id));
  const { entering, leaving } = useFacePresence(assigned);

  const setValue = (next: string[]) => {
    if (valueProp === undefined) setUncontrolledValue(next);
    onValueChange?.(next);
  };

  const setOpen = (next: boolean) => {
    if (next) {
      // Open on the first assigned person, or the top of the list.
      setActive(
        Math.max(
          0,
          people.findIndex((person) => value.includes(person.id)),
        ),
      );
    }
    if (openProp === undefined) setUncontrolledOpen(next);
    onOpenChange?.(next);
  };

  const toggle = (id: string) => {
    setValue(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  };

  const focusOption = (index: number) => {
    setActive(index);
    options.current[index]?.focus();
  };

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const last = people.length - 1;
    const current = Math.min(active, last);
    const moves: Record<string, number> = {
      ArrowDown: current >= last ? 0 : current + 1,
      ArrowUp: current <= 0 ? last : current - 1,
      Home: 0,
      End: last,
    };
    const target = moves[event.key];
    if (target !== undefined) {
      event.preventDefault();
      focusOption(target);
      return;
    }
    const person = people[current];
    if ((event.key === " " || event.key === "Enter") && person) {
      event.preventDefault();
      toggle(person.id);
    } else if (event.key === "Tab") {
      // A listbox popup is one stop: Tab closes it and focus goes home.
      event.preventDefault();
      setOpen(false);
    }
  }

  // The stack: assigned faces, with the last slot as "+N" past `maxFaces`.
  const grid = stack === "grid";
  const limit = Math.max(1, grid ? Math.min(maxFaces ?? 4, 4) : (maxFaces ?? Infinity));
  const overflow = assigned.length > limit ? assigned.length - limit + 1 : 0;
  const shown = overflow > 0 ? assigned.slice(0, limit - 1) : assigned;
  const slots = shown.length + (overflow > 0 ? 1 : 0);
  const step = FACE - Math.min(Math.max(overlap, 0), FACE);
  const packed = grid && slots > 1;
  const railWidth = slots === 0 ? 0 : grid ? FACE : FACE + (slots - 1) * step;

  const place = (index: number): CSSProperties => {
    if (packed) {
      const cell = (FACE - 2) / 2;
      return {
        width: cell,
        height: cell,
        insetInlineStart: (index % 2) * (cell + 2),
        top: Math.floor(index / 2) * (cell + 2),
        zIndex: slots - index,
      };
    }
    return { width: FACE, height: FACE, insetInlineStart: index * step, zIndex: slots - index };
  };

  const faceRing = packed ? "ring-1" : "ring-2";
  const names = assigned.map((id) => byId.get(id)?.name).join(", ");
  const surfaces = assigneePickerVariants({ tone, stroke });
  const rowRadius = Math.max(0, corner - 6);

  return (
    <div
      data-slot="assignee-picker"
      className={cn("relative inline-flex", className)}
      style={{ "--assignee-picker-spring": springEasing(0.55), ...style } as CSSProperties}
      {...props}
    >
      <style href="dowel-assignee-picker" precedence="dowel">
        {STYLES}
      </style>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            data-slot="assignee-picker-trigger"
            aria-haspopup="listbox"
            aria-label={`${label}: ${names || placeholder}`}
            className={cn(
              "group/trigger inline-flex h-11 items-center gap-2.5 ps-2 pe-3 text-sm font-medium select-none",
              surfaces,
              focusRing,
              triggerClassName,
            )}
            style={{ borderRadius: corner }}
          >
            <span
              data-slot="assignee-picker-rail"
              aria-hidden="true"
              className="relative h-7 shrink-0 transition-[width] duration-[calc(300ms*var(--motion-scale))] ease-[cubic-bezier(.33,.55,.2,1)]"
              style={{ width: railWidth }}
            >
              {shown.map((id, index) => (
                <Face
                  key={id}
                  person={byId.get(id) as AssigneePickerPerson}
                  state={entering.has(id) ? "enter" : "idle"}
                  className={cn(
                    faceRing,
                    "transition-[inset-inline-start,top,width,height] duration-[calc(300ms*var(--motion-scale))] ease-[cubic-bezier(.33,.55,.2,1)]",
                  )}
                  style={place(index)}
                />
              ))}
              {leaving.map((face) => {
                const person = byId.get(face.id);
                return person ? (
                  <Face
                    key={face.id}
                    person={person}
                    state="leave"
                    className={faceRing}
                    style={place(Math.min(face.index, Math.max(slots - 1, 0)))}
                  />
                ) : null;
              })}
              {overflow > 0 ? (
                <span
                  data-slot="assignee-picker-overflow"
                  className={cn(
                    "absolute top-0 flex items-center justify-center rounded-full bg-muted text-[0.625rem] font-semibold text-muted-foreground ring-(--assignee-picker-surface)",
                    faceRing,
                  )}
                  style={place(slots - 1)}
                >
                  +{overflow}
                </span>
              ) : null}
            </span>
            {assigned.length === 0 ? (
              <span data-slot="assignee-picker-placeholder" className="-ms-1.5">
                {placeholder}
              </span>
            ) : null}
            <svg
              data-slot="assignee-picker-chevron"
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className={cn(
                "size-4 shrink-0 opacity-40 transition-[rotate,opacity] duration-[calc(240ms*var(--motion-scale))] ease-[var(--ease-out-quint)]",
                "group-hover/trigger:opacity-75 group-data-[state=open]/trigger:rotate-180",
              )}
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
        </PopoverTrigger>
        <PopoverContent
          role="listbox"
          aria-multiselectable="true"
          aria-label={label}
          side="bottom"
          align="start"
          sideOffset={10}
          data-slot="assignee-picker-content"
          className={cn("w-auto border-0 p-1.5 shadow-lg", surfaces, contentClassName)}
          style={{ width: contentWidth, borderRadius: corner }}
        >
          {people.map((person, index) => {
            const selected = value.includes(person.id);
            return (
              <div
                key={person.id}
                ref={(node) => {
                  options.current[index] = node;
                }}
                role="option"
                aria-selected={selected}
                aria-labelledby={`${baseId}-${String(index)}-name`}
                aria-describedby={
                  person.description ? `${baseId}-${String(index)}-description` : undefined
                }
                tabIndex={index === Math.min(active, people.length - 1) ? 0 : -1}
                data-slot="assignee-picker-option"
                className={cn(
                  "group/option flex h-12 cursor-pointer items-center gap-2.5 px-2 select-none",
                  "transition-[background-color] duration-[var(--duration-fast)] hover:bg-current/5 focus-visible:bg-current/7",
                  focusRingInset,
                )}
                style={
                  { borderRadius: rowRadius, "--assignee-picker-i": index } as CSSProperties
                }
                onClick={() => {
                  setActive(index);
                  toggle(person.id);
                }}
                onFocus={() => setActive(index)}
                onKeyDown={handleKeyDown}
              >
                <Avatar size="sm" aria-hidden="true">
                  {person.avatar ? <AvatarImage src={person.avatar} alt="" /> : null}
                  <AvatarFallback>{initials(person.name)}</AvatarFallback>
                </Avatar>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span
                    id={`${baseId}-${String(index)}-name`}
                    className="truncate text-[0.8125rem] font-medium"
                  >
                    {person.name}
                  </span>
                  {person.description ? (
                    <span
                      id={`${baseId}-${String(index)}-description`}
                      className="truncate text-[0.71875rem] text-current/45"
                    >
                      {person.description}
                    </span>
                  ) : null}
                </span>
                <span
                  data-slot="assignee-picker-mark"
                  aria-hidden="true"
                  className={cn(
                    "flex size-4.5 shrink-0 items-center justify-center rounded-[5.5px]",
                    "shadow-[inset_0_0_0_1.5px_color-mix(in_oklab,currentColor_22%,transparent)]",
                    "transition-[background-color,box-shadow] duration-[calc(160ms*var(--motion-scale))]",
                    "group-aria-selected/option:bg-current group-aria-selected/option:shadow-none",
                  )}
                >
                  <svg
                    data-slot="assignee-picker-tick"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={cn(
                      "size-3 scale-40 text-(--assignee-picker-surface) opacity-0",
                      "transition-[scale,opacity] duration-[calc(160ms*var(--motion-scale))] ease-[var(--ease-overshoot)]",
                      "group-aria-selected/option:scale-100 group-aria-selected/option:opacity-100",
                    )}
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </span>
              </div>
            );
          })}
        </PopoverContent>
      </Popover>
    </div>
  );
}

export { assigneePickerVariants };
