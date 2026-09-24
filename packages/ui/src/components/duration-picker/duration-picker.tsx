"use client";

// Original design (pattern inspired by Rare UI Duration Picker; no code referenced).
import { cva, type VariantProps } from "class-variance-authority";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentPropsWithRef,
  type CSSProperties,
  type KeyboardEvent,
} from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A duration shown as one pill — "2 hr 30 min" and a pen — that springs apart
 * into three pieces to be edited: an hours field, a minutes field and a tick.
 *
 * Layout never changes. The root is a three-column grid laid out *apart*, with
 * the gap reserved; at rest the outer pieces are translated inward over the
 * gap until they meet the middle one, and their inner corners are squared, so
 * the three read as a single pill. Editing drops the translation and rounds
 * every corner on an overshooting transition, which is the spring. Only
 * `translate`, `border-radius` and colour move; nothing reflows, and the pill
 * sits in the same box open or shut (the reserved gap shows as a little air at
 * either end when it is shut).
 *
 * The melt is an SVG goo filter (blur, alpha threshold, composite) on a layer
 * of blank blobs drawn behind the content. A subgrid gives that layer the same
 * columns as the content above it, so each blob sits exactly under its piece.
 * As the blobs part, the filter necks them together and snaps the neck, and on
 * the way back it fuses them before they touch. The text and inputs are never
 * filtered. Without filter support or under reduced motion the goo is dropped;
 * the blobs still meet edge to edge, and the reduced-motion blanket makes the
 * change instant.
 *
 * Typing past the ceiling clamps to it, shakes that piece (a keyframe that
 * alternates between two names so each clamp replays it without remounting the
 * focused input) and announces the maximum politely. `onValueChange` fires on
 * every keystroke with the clamped value; `onConfirm` once, from the tick or
 * Enter. Escape puts back the value from before editing.
 */

const PREFIX = "dowel-duration-picker";

const SHAKE =
  "{0%,100%{transform:translateX(0)}18%{transform:translateX(-5px)}36%{transform:translateX(4px)}54%{transform:translateX(-3px)}72%{transform:translateX(2px)}}";

const STYLES = `
@keyframes ${PREFIX}-shake-a${SHAKE}
@keyframes ${PREFIX}-shake-b${SHAKE}
[data-slot=duration-picker] [data-shake=a]{animation:${PREFIX}-shake-a calc(380ms * var(--motion-scale,1)) var(--ease-out-quint)}
[data-slot=duration-picker] [data-shake=b]{animation:${PREFIX}-shake-b calc(380ms * var(--motion-scale,1)) var(--ease-out-quint)}
`;

const REDUCE = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const query = window.matchMedia(REDUCE);
  query.addEventListener("change", onChange);
  return () => {
    query.removeEventListener("change", onChange);
  };
}

/** Whether the goo filter can run: supported, and motion not reduced. */
function gooSnapshot() {
  const supported =
    typeof CSS !== "undefined" &&
    typeof CSS.supports === "function" &&
    CSS.supports("filter", "url(#x)");
  return supported && !window.matchMedia(REDUCE).matches;
}

const durationPickerVariants = cva(
  cn(
    "group/duration relative isolate inline-grid grid-cols-[repeat(3,auto)] items-stretch",
    "gap-x-[var(--dp-gap)] text-secondary-foreground",
    "data-[disabled]:opacity-55",
  ),
  {
    variants: {
      size: {
        sm: "h-8 text-xs [--dp-gap:0.5rem] [--dp-h:2rem] [--dp-radius:1rem]",
        md: "h-10 text-sm [--dp-gap:0.625rem] [--dp-h:2.5rem] [--dp-radius:1.25rem]",
        lg: "h-12 text-base [--dp-gap:0.75rem] [--dp-h:3rem] [--dp-radius:1.5rem]",
      },
    },
    defaultVariants: { size: "md" },
  },
);

export interface DurationValue {
  hours: number;
  minutes: number;
}

export interface DurationPickerLabels {
  /** Accessible name of the hours field. */
  hours: string;
  /** Accessible name of the minutes field. */
  minutes: string;
  /** The pen's accessible name. */
  edit: string;
  /** The tick's accessible name. */
  confirm: string;
  /** Announced before the ceiling when a field is clamped: "Maximum 24". */
  maximum: string;
}

const DEFAULT_LABELS: DurationPickerLabels = {
  hours: "Hours",
  minutes: "Minutes",
  edit: "Edit duration",
  confirm: "Confirm duration",
  maximum: "Maximum",
};

export interface DurationPickerProps
  extends
    Omit<ComponentPropsWithRef<"div">, "defaultValue" | "onChange" | "children">,
    VariantProps<typeof durationPickerVariants> {
  /** Controlled value. */
  value?: DurationValue;
  /** Initial value when uncontrolled. Default 0 hr 0 min. */
  defaultValue?: DurationValue;
  /** Called on every keystroke with the clamped value, and when Escape reverts it. */
  onValueChange?: (value: DurationValue) => void;
  /** Called once with the final value when the tick is pressed or Enter is. */
  onConfirm?: (value: DurationValue) => void;
  /** Controlled edit mode. */
  editing?: boolean;
  /** Starts in edit mode when uncontrolled. */
  defaultEditing?: boolean;
  onEditingChange?: (editing: boolean) => void;
  /** Ceiling for hours; typing past it clamps and shakes. Default 24. */
  maxHours?: number;
  /** Ceiling for minutes. Default 59. */
  maxMinutes?: number;
  /** Unit shown after the hours. Default "hr". */
  hoursLabel?: string;
  /** Unit shown after the minutes. Default "min". */
  minutesLabel?: string;
  /** Accessible names and announcements, for translation. */
  labels?: Partial<DurationPickerLabels>;
  /** Dims the pill and keeps it shut. */
  disabled?: boolean;
}

type Field = "hours" | "minutes";

const clamp = (value: number, max: number) =>
  Math.min(Math.max(Math.floor(Number.isFinite(value) ? value : 0), 0), Math.max(0, max));

function Pen() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 20l1-4.5L15.5 5a2.12 2.12 0 0 1 3 3L8 18.5 4 20Z" />
      <path d="m13.5 7 3 3" />
    </svg>
  );
}

function Tick() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

/** Where a piece sits at rest: the outer two slide inward over the gap to meet the middle. */
function piece(position: "start" | "middle" | "end", editing: boolean) {
  if (editing) return "translate-x-0 rounded-[var(--dp-radius)]";
  if (position === "start") {
    return "translate-x-[var(--dp-gap)] rtl:-translate-x-[var(--dp-gap)] rounded-s-[var(--dp-radius)] rounded-e-none";
  }
  if (position === "end") {
    return "-translate-x-[var(--dp-gap)] rtl:translate-x-[var(--dp-gap)] rounded-e-[var(--dp-radius)] rounded-s-none";
  }
  return "rounded-none";
}

/** Parting is an entrance and takes longer; merging back is quicker. */
const springy = (editing: boolean) =>
  cn(
    "transition-[translate,border-radius,background-color,color]",
    "ease-[var(--ease-overshoot),var(--ease-out-quint),var(--ease-out-quint),var(--ease-out-quint)]",
    editing
      ? "duration-[var(--duration-slower),var(--duration-normal),var(--duration-normal),var(--duration-normal)]"
      : "duration-[var(--duration-slow),var(--duration-fast),var(--duration-normal),var(--duration-normal)]",
  );

const iconLayer = cn(
  "col-start-1 row-start-1 flex items-center justify-center [&_svg]:size-[1.1em]",
  "transition-[opacity,scale,rotate] duration-[var(--duration-normal)] ease-[var(--ease-overshoot)]",
  "data-[state=hidden]:scale-50 data-[state=hidden]:opacity-0 data-[state=hidden]:ease-[var(--ease-out-quint)]",
);

/** A duration pill that springs apart into hours, minutes and a tick to be edited. */
export function DurationPicker({
  className,
  size,
  value: valueProp,
  defaultValue = { hours: 0, minutes: 0 },
  onValueChange,
  onConfirm,
  editing: editingProp,
  defaultEditing = false,
  onEditingChange,
  maxHours = 24,
  maxMinutes = 59,
  hoursLabel = "hr",
  minutesLabel = "min",
  labels: labelsProp,
  disabled = false,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  ...props
}: DurationPickerProps) {
  const labels = { ...DEFAULT_LABELS, ...labelsProp };
  const max = { hours: maxHours, minutes: maxMinutes };
  const [uncontrolled, setUncontrolled] = useState<DurationValue>(defaultValue);
  const raw = valueProp ?? uncontrolled;
  const value: DurationValue = {
    hours: clamp(raw.hours, maxHours),
    minutes: clamp(raw.minutes, maxMinutes),
  };
  const [editingState, setEditingState] = useState(defaultEditing);
  const editing = !disabled && (editingProp ?? editingState);
  const [drafts, setDrafts] = useState<Record<Field, string | null>>({
    hours: null,
    minutes: null,
  });
  const [shakes, setShakes] = useState<Record<Field, number>>({ hours: 0, minutes: 0 });
  const [announced, setAnnounced] = useState("");

  const gooId = `${PREFIX}-${useId().replace(/[^\w-]/g, "")}`;
  const gooOn = useSyncExternalStore(subscribe, gooSnapshot, () => false);
  const hoursInput = useRef<HTMLInputElement | null>(null);
  const toggle = useRef<HTMLButtonElement | null>(null);

  // The value from before editing began, which Escape puts back.
  const latestValue = useRef(value);
  const snapshot = useRef(value);
  const wasEditing = useRef(editing);
  useLayoutEffect(() => {
    latestValue.current = value;
  });

  useEffect(() => {
    if (editing && !wasEditing.current) {
      snapshot.current = latestValue.current;
      hoursInput.current?.focus();
      hoursInput.current?.select();
    } else if (!editing && wasEditing.current) {
      // Closing unmounts the fields; if one held focus, it lands on the toggle.
      const active = document.activeElement;
      if (!active || active === document.body) toggle.current?.focus({ preventScroll: true });
    }
    wasEditing.current = editing;
  }, [editing]);

  function setEditing(next: boolean) {
    if (editingProp === undefined) setEditingState(next);
    onEditingChange?.(next);
  }

  function commit(next: DurationValue) {
    if (valueProp === undefined) setUncontrolled(next);
    onValueChange?.(next);
  }

  function handleInput(field: Field, input: string) {
    const digits = input.replace(/\D/g, "");
    let text = digits;
    let number = digits === "" ? 0 : Number(digits);
    if (number > max[field]) {
      number = max[field];
      text = String(number);
      setShakes((current) => ({ ...current, [field]: current[field] + 1 }));
      // A trailing space alternates so a repeated clamp is announced again.
      setAnnounced((current) => {
        const message = `${labels.maximum} ${String(number)}`;
        return current === message ? `${message}\u00a0` : message;
      });
    }
    setDrafts((current) => ({ ...current, [field]: text }));
    commit({ ...value, [field]: number });
  }

  function open() {
    if (disabled) return;
    setDrafts({ hours: null, minutes: null });
    setAnnounced("");
    setEditing(true);
  }

  function confirm() {
    toggle.current?.focus();
    setDrafts({ hours: null, minutes: null });
    setEditing(false);
    onConfirm?.(value);
  }

  function cancel() {
    toggle.current?.focus();
    const before = snapshot.current;
    setDrafts({ hours: null, minutes: null });
    if (before.hours !== value.hours || before.minutes !== value.minutes) commit(before);
    setEditing(false);
  }

  /** Escape reverts from any piece; Enter in a field confirms (on the tick it is a click). */
  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (!editing) return;
    if (event.key === "Escape") {
      event.preventDefault();
      cancel();
    } else if (event.key === "Enter" && event.currentTarget instanceof HTMLInputElement) {
      event.preventDefault();
      confirm();
    }
  }

  function text(field: Field): string {
    const draft = drafts[field];
    const number = value[field];
    return draft !== null && (draft === "" ? 0 : Number(draft)) === number
      ? draft
      : String(number);
  }

  const shake = (field: Field) =>
    shakes[field] === 0 ? undefined : shakes[field] % 2 === 1 ? "a" : "b";

  const segment = (field: Field, position: "start" | "middle") => {
    const width: CSSProperties = { width: `${String(String(max[field]).length + 0.25)}ch` };
    const unit = field === "hours" ? hoursLabel : minutesLabel;
    return (
      <span
        data-slot="duration-picker-segment"
        data-field={field}
        data-shake={shake(field)}
        className={cn(
          "relative z-[1] row-start-1 flex items-center justify-center gap-1 px-[calc(var(--dp-h)*0.3)]",
          position === "start" ? "col-start-1" : "col-start-2",
          "focus-within:ring-2 focus-within:ring-ring/55",
          piece(position, editing),
          springy(editing),
        )}
      >
        {editing ? (
          <input
            ref={field === "hours" ? hoursInput : undefined}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            maxLength={String(max[field]).length}
            aria-label={labels[field]}
            data-slot="duration-picker-input"
            data-field={field}
            value={text(field)}
            onChange={(event) => {
              handleInput(field, event.target.value);
            }}
            onFocus={(event) => {
              event.currentTarget.select();
            }}
            onKeyDown={handleKeyDown}
            className="min-w-0 bg-transparent p-0 text-center font-medium tabular-nums outline-none"
            style={width}
          />
        ) : (
          <span
            data-slot="duration-picker-value"
            data-field={field}
            className="text-center font-medium tabular-nums"
            style={width}
          >
            {value[field]}
          </span>
        )}
        {/* The spaces collapse away in the flex layout but keep the text "2 hr 30 min" for
            screen readers and copying. */}
        <span data-slot="duration-picker-unit" className="text-muted-foreground">
          {` ${unit} `}
        </span>
      </span>
    );
  };

  return (
    <div
      role="group"
      aria-label={ariaLabel ?? (ariaLabelledBy ? undefined : "Duration")}
      aria-labelledby={ariaLabelledBy}
      data-slot="duration-picker"
      data-editing={editing ? "" : undefined}
      data-disabled={disabled ? "" : undefined}
      className={cn(durationPickerVariants({ size }), className)}
      {...props}
    >
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      {gooOn ? (
        <svg aria-hidden="true" focusable="false" className="absolute size-0">
          <filter id={gooId} x="-20%" y="-50%" width="140%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
              result="goo"
            />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </svg>
      ) : null}
      {/* The filtered layer never moves; only the blobs inside it do. */}
      <span
        aria-hidden="true"
        data-slot="duration-picker-goo"
        className="pointer-events-none col-span-3 col-start-1 row-start-1 grid grid-cols-subgrid"
        style={gooOn ? { filter: `url(#${gooId})` } : undefined}
      >
        {(["start", "middle", "end"] as const).map((position) => (
          <span
            key={position}
            data-slot="duration-picker-blob"
            data-shake={
              position === "start"
                ? shake("hours")
                : position === "middle"
                  ? shake("minutes")
                  : undefined
            }
            className={cn(
              "row-start-1 bg-secondary",
              // The middle blob overlaps its neighbours by a pixel, so a merged pill has no seam.
              position === "middle" && "-mx-px",
              position === "end" && editing && "bg-primary",
              piece(position, editing),
              springy(editing),
            )}
          />
        ))}
      </span>
      {segment("hours", "start")}
      {segment("minutes", "middle")}
      <button
        ref={toggle}
        type="button"
        disabled={disabled}
        aria-label={editing ? labels.confirm : labels.edit}
        data-slot="duration-picker-toggle"
        data-state={editing ? "confirm" : "edit"}
        className={cn(
          "relative z-[1] col-start-3 row-start-1 grid w-[var(--dp-h)] place-items-center",
          "cursor-pointer disabled:cursor-not-allowed",
          editing ? "text-primary-foreground" : "text-secondary-foreground",
          piece("end", editing),
          springy(editing),
          focusRing,
        )}
        onClick={() => {
          if (editing) confirm();
          else open();
        }}
        onKeyDown={handleKeyDown}
      >
        <span
          data-slot="duration-picker-icon"
          data-icon="edit"
          data-state={editing ? "hidden" : "visible"}
          className={cn(iconLayer, "data-[state=hidden]:-rotate-45")}
        >
          <Pen />
        </span>
        <span
          data-slot="duration-picker-icon"
          data-icon="confirm"
          data-state={editing ? "visible" : "hidden"}
          className={cn(iconLayer, "data-[state=hidden]:rotate-45")}
        >
          <Tick />
        </span>
      </button>
      <span role="status" aria-live="polite" className="sr-only">
        {announced}
      </span>
    </div>
  );
}

export { durationPickerVariants };
