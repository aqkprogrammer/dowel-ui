"use client";

// Ported from SmoothUI Scrubber (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import { cva, type VariantProps } from "class-variance-authority";
import { Direction } from "radix-ui";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A design-tool number field: a labelled bar you drag across to scrub a value,
 * with the number at the end. The bar is a `role="slider"` — arrows, Shift +
 * arrows and Page Up/Down for big steps, Home/End — and typing an exact value
 * is one key away: Enter (or a double-click) swaps the number for a text field;
 * Enter or leaving the field commits, Escape cancels, and focus comes back to
 * the slider.
 *
 * The source animated the capsule thumb with a `motion` spring. It carries no
 * gesture velocity, so here it is a CSS transition on data attributes, and the
 * global reduced-motion rule stops it.
 */

const scrubberVariants = cva("relative w-full select-none", {
  variants: {
    size: {
      sm: "h-7 text-xs",
      md: "h-9 text-[0.8125rem]",
      lg: "h-11 text-sm",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

export interface ScrubberProps
  extends
    Omit<ComponentPropsWithRef<"div">, "defaultValue" | "onChange" | "children">,
    VariantProps<typeof scrubberVariants> {
  /** Visible label at the start of the bar. It also names the slider. */
  label?: ReactNode;
  value?: number;
  defaultValue?: number;
  /** Called on every change: while dragging, per key press, and on a typed entry. */
  onValueChange?: (value: number) => void;
  /** Called when an interaction ends: pointer released, key press or typed entry. */
  onValueCommit?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Steps moved by Shift + arrow and Page Up / Page Down. */
  largeStep?: number;
  /** Decimal places shown. Defaults to the precision of `step`. */
  decimals?: number;
  /** Number of evenly spaced tick marks; 0 hides them. */
  ticks?: number;
  /** Formats the displayed value and `aria-valuetext`. Defaults to `decimals` places. */
  formatValue?: (value: number) => string;
  /** Allow typing an exact value (Enter or double-click). */
  editable?: boolean;
  disabled?: boolean;
  /** Submits the value with a form under this name. */
  name?: string;
}

const clamp = (value: number, lo: number, hi: number) => Math.min(Math.max(value, lo), hi);

function precisionOf(step: number): number {
  const text = String(step);
  const exponent = /e-(\d+)$/.exec(text);
  if (exponent) return Number(exponent[1]);
  return text.split(".")[1]?.length ?? 0;
}

/** A drag-to-scrub numeric control with keyboard stepping and typed entry. */
export function Scrubber({
  className,
  size,
  label = "Value",
  value: valueProp,
  defaultValue,
  onValueChange,
  onValueCommit,
  min = 0,
  max = 1,
  step = 0.01,
  largeStep = 10,
  decimals: decimalsProp,
  ticks = 9,
  formatValue,
  editable = true,
  disabled = false,
  name,
  dir: dirProp,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  "aria-describedby": ariaDescribedBy,
  "aria-valuetext": ariaValueText,
  ...props
}: ScrubberProps) {
  const dir = Direction.useDirection(dirProp as "ltr" | "rtl" | undefined);
  const decimals = decimalsProp ?? precisionOf(step);
  const snap = (raw: number) =>
    Number(clamp(Math.round((raw - min) / step) * step + min, min, max).toFixed(10));

  const [uncontrolled, setUncontrolled] = useState(() => snap(defaultValue ?? min));
  const controlled = valueProp !== undefined;
  const value = controlled ? valueProp : uncontrolled;
  const [dragging, setDragging] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const editing = draft !== null;

  const trackRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // The value an in-progress drag last produced, reported on release.
  const latest = useRef(value);
  // Whether a typed entry is open. A ref, because refocusing the slider blurs
  // the field before React has re-rendered, and that blur must not commit an
  // entry Escape has just cancelled.
  const open = useRef(false);

  // Typed entry replaces the number the user just asked to edit.
  useEffect(() => {
    if (!editing) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [editing]);
  const labelId = useId();
  const range = max - min;
  const percent = range > 0 ? ((clamp(value, min, max) - min) / range) * 100 : 0;
  const text = formatValue ? formatValue(value) : value.toFixed(decimals);

  function setValue(raw: number) {
    const next = snap(raw);
    latest.current = next;
    if (next === value) return next;
    if (!controlled) setUncontrolled(next);
    onValueChange?.(next);
    return next;
  }

  function fromPointer(clientX: number) {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return value;
    const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
    return min + (dir === "rtl" ? 1 - ratio : ratio) * range;
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (disabled || editing || event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
    latest.current = value;
    setValue(fromPointer(event.clientX));
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    setValue(fromPointer(event.clientX));
  }

  function handlePointerEnd() {
    if (!dragging) return;
    setDragging(false);
    onValueCommit?.(latest.current);
  }

  function startEditing() {
    if (disabled || !editable) return;
    open.current = true;
    setDraft(value.toFixed(decimals));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (disabled) return;
    if (event.key === "Enter" && editable) {
      event.preventDefault();
      startEditing();
      return;
    }
    const forward = dir === "rtl" ? -1 : 1;
    const big = event.shiftKey ? largeStep : 1;
    const moves: Record<string, number> = {
      ArrowRight: forward * big,
      ArrowLeft: -forward * big,
      ArrowUp: big,
      ArrowDown: -big,
      PageUp: largeStep,
      PageDown: -largeStep,
    };
    let next: number;
    if (event.key === "Home") next = min;
    else if (event.key === "End") next = max;
    else if (event.key in moves) next = value + (moves[event.key] ?? 0) * step;
    else return;
    event.preventDefault();
    // Not inlined into the optional call: `f?.(x)` skips evaluating x when f is absent.
    const committed = setValue(next);
    onValueCommit?.(committed);
  }

  function finishEditing(commit: boolean, refocus: boolean) {
    if (!open.current || draft === null) return;
    open.current = false;
    const parsed = Number.parseFloat(draft.replace(",", "."));
    setDraft(null);
    if (commit && Number.isFinite(parsed)) {
      const committed = setValue(parsed);
      onValueCommit?.(committed);
    }
    if (refocus) trackRef.current?.focus();
  }

  const active = "group-hover/scrubber:opacity-80 group-hover/scrubber:scale-100";

  return (
    <div
      data-slot="scrubber"
      data-disabled={disabled ? "" : undefined}
      dir={dirProp}
      className={cn(scrubberVariants({ size }), disabled && "opacity-55", className)}
      {...props}
    >
      <div
        ref={trackRef}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        data-slot="scrubber-track"
        data-dragging={dragging ? "" : undefined}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabel ? undefined : (ariaLabelledBy ?? labelId)}
        aria-describedby={ariaDescribedBy}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={Number(value.toFixed(decimals))}
        aria-valuetext={ariaValueText ?? text}
        aria-orientation="horizontal"
        aria-disabled={disabled || undefined}
        aria-keyshortcuts={editable && !disabled ? "Enter" : undefined}
        className={cn(
          "group/scrubber relative size-full touch-none overflow-hidden rounded-lg bg-muted",
          disabled ? "cursor-not-allowed" : "cursor-ew-resize",
          focusRing,
        )}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onDoubleClick={startEditing}
      >
        <span
          data-slot="scrubber-fill"
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-y-0 start-0 rounded-lg bg-foreground/14",
            !dragging &&
              "transition-[width] duration-[var(--duration-fast)] ease-[var(--ease-out-quint)]",
          )}
          style={{ width: `${String(percent)}%` }}
        />
        {Array.from({ length: Math.max(0, ticks) }, (_, index) => (
          <span
            key={index}
            data-slot="scrubber-tick"
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 h-1.5 w-px -translate-y-1/2 rounded-full bg-foreground/25"
            style={{ insetInlineStart: `${String(((index + 1) / (ticks + 1)) * 100)}%` }}
          />
        ))}
        <span
          data-slot="scrubber-thumb"
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute top-1/2 z-[1] h-3/5 w-1 -translate-y-1/2 rounded-full bg-foreground/90",
            "scale-70 opacity-15 duration-[var(--duration-normal)] ease-[var(--ease-out-quint)]",
            dragging
              ? "transition-[opacity,scale]"
              : "transition-[opacity,scale,inset-inline-start]",
            "group-focus-visible/scrubber:scale-100 group-focus-visible/scrubber:opacity-80",
            "group-data-[dragging]/scrubber:scale-100 group-data-[dragging]/scrubber:opacity-80",
            !disabled && active,
          )}
          style={{
            insetInlineStart: `clamp(0.25rem, calc(${String(percent)}% - 0.5rem), calc(100% - 0.5rem))`,
          }}
        />
        <span
          id={labelId}
          data-slot="scrubber-label"
          className="pointer-events-none absolute start-3 top-1/2 z-[2] -translate-y-1/2 font-medium whitespace-nowrap text-foreground"
        >
          {label}
        </span>
        <span
          data-slot="scrubber-value"
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute end-2.5 top-1/2 z-[2] -translate-y-1/2 font-mono font-medium text-foreground tabular-nums",
            editing && "invisible",
          )}
        >
          {text}
        </span>
      </div>
      {editing ? (
        <input
          type="text"
          inputMode="decimal"
          data-slot="scrubber-input"
          aria-labelledby={ariaLabel ? undefined : (ariaLabelledBy ?? labelId)}
          aria-label={ariaLabel}
          ref={inputRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              finishEditing(true, true);
            } else if (event.key === "Escape") {
              event.preventDefault();
              finishEditing(false, true);
            }
          }}
          onBlur={() => finishEditing(true, false)}
          className={cn(
            "absolute inset-y-1 end-1 z-[3] w-20 rounded-md border border-input bg-background px-1.5",
            "text-end font-mono font-medium text-foreground tabular-nums",
            focusRing,
          )}
        />
      ) : null}
      {name ? <input type="hidden" name={name} value={value} disabled={disabled} /> : null}
    </div>
  );
}

export { scrubberVariants };
