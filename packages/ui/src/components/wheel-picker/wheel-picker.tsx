"use client";

import { cva, type VariantProps } from "class-variance-authority";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type KeyboardEvent,
  type PointerEvent,
} from "react";

import { cn } from "@/lib/utils";

/*
 * A drum of options you spin to pick one, like a phone's time picker.
 *
 * The column is a native scroll container with mandatory scroll snapping, so
 * a wheel, a trackpad and a finger all scroll and settle the way the platform
 * does. Each frame the rows are turned around a horizontal axis by their
 * distance from the centre and fade as they turn away, which is what makes a
 * flat list read as a cylinder. A mouse can also grab and fling the column;
 * snapping is paused while it drags and the nearest row is settled on release.
 *
 * To assistive technology it is a listbox: focus stays on the drum, the
 * centred row is the active descendant and the selected option, and arrows,
 * Page Up/Down, Home/End and type-ahead move it. Selection commits when the
 * scroll settles, not on every row that passes the band.
 */

export interface WheelPickerOption {
  value: string;
  label: string;
  disabled?: boolean;
}

const ROW = { sm: 32, md: 40 } as const;

const wheelPickerVariants = cva(
  cn(
    "relative w-full overflow-hidden rounded-lg bg-card text-card-foreground select-none",
    "[perspective:600px]",
    "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-55",
    // The focusable listbox is the scroller inside; the frame shows its ring.
    // It is the only focusable descendant (options use aria-activedescendant),
    // so `has-focus-visible` is exactly "the listbox has keyboard focus".
    "has-focus-visible:ring-2 has-focus-visible:ring-ring/55",
    "has-focus-visible:ring-offset-2 has-focus-visible:ring-offset-background",
  ),
  {
    variants: {
      size: {
        sm: "text-sm [--wheel-row:32px]",
        md: "text-base [--wheel-row:40px]",
      },
    },
    defaultVariants: { size: "md" },
  },
);

export interface WheelPickerProps
  extends
    Omit<ComponentPropsWithRef<"div">, "defaultValue" | "onChange">,
    VariantProps<typeof wheelPickerVariants> {
  options: WheelPickerOption[];
  /** Controlled selected value. */
  value?: string;
  /** Initial value when uncontrolled; the first enabled option otherwise. */
  defaultValue?: string;
  /** Called when the drum settles on a different option. */
  onValueChange?: (value: string) => void;
  /** Rows in view, odd so one sits in the middle. Default 5. */
  visibleCount?: number;
  /** Submits the selected value under this name in a surrounding form. */
  name?: string;
  disabled?: boolean;
}

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia(REDUCED_MOTION).matches;

/** Degrees a row turns per row of distance from the centre. */
const TURN = 20;

export function WheelPicker({
  className,
  size,
  options,
  value: valueProp,
  defaultValue,
  onValueChange,
  visibleCount: visibleProp = 5,
  name,
  disabled = false,
  onKeyDown,
  ref,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  "aria-describedby": ariaDescribedBy,
  ...props
}: WheelPickerProps) {
  const id = useId();
  const row = ROW[size ?? "md"];
  const visible = Math.max(3, visibleProp % 2 === 0 ? visibleProp + 1 : visibleProp);
  const pad = ((visible - 1) / 2) * row;

  const firstEnabled = options.findIndex((o) => !o.disabled);
  const indexOf = useCallback(
    (v: string | undefined) => {
      const found = v === undefined ? -1 : options.findIndex((o) => o.value === v);
      return found === -1 ? Math.max(0, firstEnabled) : found;
    },
    [options, firstEnabled],
  );

  const [uncontrolled, setUncontrolled] = useState(() => indexOf(defaultValue));
  const controlled = valueProp !== undefined;
  const selected = controlled ? indexOf(valueProp) : uncontrolled;

  const scroller = useRef<HTMLDivElement>(null);
  const rows = useRef<(HTMLDivElement | null)[]>([]);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const drag = useRef<{ y: number; top: number; moved: boolean } | null>(null);
  const typeahead = useRef({ text: "", at: 0 });
  /**
   * Where a key press or click sent the drum. A smooth scroll interrupted by
   * the next press can come to rest on a row in between; until the drum
   * reaches this row, settling heads on to it instead of committing that one.
   */
  const target = useRef<number | null>(null);
  /** A drag that just ended also fires a click; that click is not a choice. */
  const justDragged = useRef(false);

  /** Turns and fades every row by its distance from the band. */
  const paint = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const centre = el.scrollTop / row;
    rows.current.forEach((node, index) => {
      if (!node) return;
      const offset = index - centre;
      const distance = Math.abs(offset);
      const hidden = distance > (visible + 1) / 2;
      node.style.transform = `rotateX(${String(-offset * TURN)}deg)`;
      node.style.opacity = hidden ? "0" : String(Math.max(0.15, 1 - distance * 0.28));
    });
  }, [row, visible]);

  const scrollToIndex = useCallback(
    (index: number, smooth: boolean) => {
      const el = scroller.current;
      if (!el) return;
      const top = index * row;
      if (typeof el.scrollTo === "function") {
        el.scrollTo({ top, behavior: smooth && !reducedMotion() ? "smooth" : "auto" });
      } else {
        el.scrollTop = top;
      }
      paint();
    },
    [row, paint],
  );

  /** Nearest enabled row to `index`, searching outwards. */
  const nearestEnabled = useCallback(
    (index: number) => {
      const clamped = Math.min(Math.max(index, 0), options.length - 1);
      for (let d = 0; d < options.length; d++) {
        for (const i of [clamped + d, clamped - d]) {
          if (i >= 0 && i < options.length && !options[i]?.disabled) return i;
        }
      }
      return clamped;
    },
    [options],
  );

  const commit = useCallback(
    (index: number) => {
      const option = options[index];
      if (!option || option.disabled || index === selected) return;
      if (!controlled) setUncontrolled(index);
      onValueChange?.(option.value);
    },
    [options, selected, controlled, onValueChange],
  );

  /** Moves the selection and the drum together. */
  const select = useCallback(
    (index: number, smooth = true) => {
      const next = nearestEnabled(index);
      target.current = next;
      commit(next);
      scrollToIndex(next, smooth);
    },
    [nearestEnabled, commit, scrollToIndex],
  );

  // Start on the selected row, without animating.
  useLayoutEffect(() => {
    scrollToIndex(selected, false);
    // Only on mount and when the geometry changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row, visible]);

  // A controlled value moved from outside: bring the drum to it.
  useEffect(() => {
    const el = scroller.current;
    if (!el || drag.current) return;
    if (Math.round(el.scrollTop / row) !== selected) scrollToIndex(selected, true);
  }, [selected, row, scrollToIndex]);

  useEffect(() => () => clearTimeout(settleTimer.current), []);

  function handleScroll() {
    paint();
    if (drag.current) return;
    // Commit once the scroll has come to rest on a row.
    clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      const el = scroller.current;
      if (!el) return;
      const index = Math.round(el.scrollTop / row);
      const pending = target.current;
      if (pending !== null) {
        if (pending !== index) {
          scrollToIndex(pending, true);
          return;
        }
        target.current = null;
      }
      const next = nearestEnabled(index);
      if (next !== index) scrollToIndex(next, true);
      commit(next);
    }, 120);
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    // Touch and pens scroll natively; the mouse gets a grab-and-fling.
    if (disabled || event.pointerType !== "mouse" || event.button !== 0) return;
    const el = scroller.current;
    if (!el) return;
    target.current = null;
    drag.current = { y: event.clientY, top: el.scrollTop, moved: false };
    el.style.scrollSnapType = "none";
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const state = drag.current;
    const el = scroller.current;
    if (!state || !el) return;
    const dy = event.clientY - state.y;
    if (Math.abs(dy) > 3) state.moved = true;
    el.scrollTop = state.top - dy;
    paint();
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    const state = drag.current;
    const el = scroller.current;
    if (!state || !el) return;
    drag.current = null;
    el.style.scrollSnapType = "";
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    justDragged.current = state.moved;
    if (state.moved) select(Math.round(el.scrollTop / row));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    onKeyDown?.(event);
    if (event.defaultPrevented || disabled) return;
    const page = visible - 1;
    // Count from where the drum is headed, so quick presses add up.
    const from = target.current ?? selected;
    const step = (from: number, delta: number) => {
      let i = from + delta;
      while (i >= 0 && i < options.length && options[i]?.disabled) i += Math.sign(delta);
      return i < 0 || i >= options.length ? from : i;
    };
    let next: number | null = null;
    switch (event.key) {
      case "ArrowDown":
        next = step(from, 1);
        break;
      case "ArrowUp":
        next = step(from, -1);
        break;
      case "PageDown":
        next = nearestEnabled(from + page);
        break;
      case "PageUp":
        next = nearestEnabled(from - page);
        break;
      case "Home":
        next = nearestEnabled(0);
        break;
      case "End":
        next = nearestEnabled(options.length - 1);
        break;
      default:
        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          const now = event.timeStamp;
          const ta = typeahead.current;
          ta.text = (now - ta.at > 600 ? "" : ta.text) + event.key.toLowerCase();
          ta.at = now;
          const order = [...options.keys()].map((k) => (selected + 1 + k) % options.length);
          const match =
            order.find(
              (i) =>
                !options[i]?.disabled && options[i]?.label.toLowerCase().startsWith(ta.text),
            ) ?? null;
          next = match;
        }
    }
    if (next === null) return;
    event.preventDefault();
    select(next);
  }

  const optionId = (index: number) => `${id}-option-${String(index)}`;
  const current = options[selected];

  return (
    <div
      data-slot="wheel-picker"
      data-disabled={disabled ? "" : undefined}
      className={cn(wheelPickerVariants({ size }), className)}
      style={{ height: row * visible }}
      {...props}
    >
      {/* The selection band, behind the rows. */}
      <div
        aria-hidden="true"
        data-slot="wheel-picker-band"
        className="pointer-events-none absolute inset-x-1.5 top-1/2 h-(--wheel-row) -translate-y-1/2 rounded-md bg-muted"
      />
      {/*
       * The scroller is the listbox, so the element that scrolls is the one
       * that takes focus (axe: scrollable-region-focusable). It owns the keys too;
       * a consumer's onKeyDown runs first, as before.
       */}
      <div
        ref={(node) => {
          scroller.current = node;
          if (typeof ref === "function") return ref(node);
          if (ref) ref.current = node;
        }}
        role="listbox"
        tabIndex={disabled ? -1 : 0}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        aria-activedescendant={current ? optionId(selected) : undefined}
        aria-disabled={disabled || undefined}
        data-slot="wheel-picker-viewport"
        onKeyDown={handleKeyDown}
        className={cn(
          "relative size-full snap-y snap-mandatory [scrollbar-width:none] overflow-y-scroll overscroll-contain outline-none [&::-webkit-scrollbar]:hidden",
          "[mask-image:linear-gradient(to_bottom,transparent,var(--color-foreground)_35%,var(--color-foreground)_65%,transparent)]",
          disabled ? "pointer-events-none" : "cursor-grab active:cursor-grabbing",
        )}
        style={{ paddingBlock: pad }}
        onScroll={handleScroll}
        onWheel={() => (target.current = null)}
        onTouchStart={() => (target.current = null)}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {options.map((option, index) => (
          // Focus stays on the listbox, which owns the keys and points
          // aria-activedescendant at an option; options are only clickable.
          // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/interactive-supports-focus
          <div
            key={option.value}
            ref={(node) => {
              rows.current[index] = node;
            }}
            id={optionId(index)}
            role="option"
            aria-selected={index === selected}
            aria-disabled={option.disabled || undefined}
            data-slot="wheel-picker-option"
            data-selected={index === selected ? "" : undefined}
            className={cn(
              "flex h-(--wheel-row) snap-center items-center justify-center px-3 tabular-nums [backface-visibility:hidden]",
              "text-muted-foreground data-[selected]:font-medium data-[selected]:text-foreground",
              option.disabled && "line-through opacity-40",
            )}
            onClick={() => {
              if (justDragged.current) {
                justDragged.current = false;
                return;
              }
              if (!disabled && !option.disabled) select(index);
            }}
          >
            {option.label}
          </div>
        ))}
      </div>
      {name ? <input type="hidden" name={name} value={current?.value ?? ""} /> : null}
    </div>
  );
}

export { wheelPickerVariants };
