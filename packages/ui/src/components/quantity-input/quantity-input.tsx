"use client";

import { cva, type VariantProps } from "class-variance-authority";
import {
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  useSyncExternalStore,
  type ClipboardEvent,
  type ComponentPropsWithRef,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from "react";

import { focusRingInset, invalidStyles } from "@/lib/styles";
import { cn } from "@/lib/utils";

import {
  boundIn,
  convertQuantity,
  decimalsFor,
  findUnit,
  formatQuantity,
  readQuantity,
  roundTo,
  type Quantity,
  type QuantityUnit,
} from "./quantity";

// Installed, this file is what `@/components/ui/quantity-input` resolves to, so it
// exports everything the folder's index does: see scripts/audit/installed-imports.ts.
export {
  clampQuantity,
  convertQuantity,
  formatQuantity,
  parseQuantity,
  type FormatQuantityOptions,
  type ParseQuantityOptions,
  type Quantity,
  type QuantityBounds,
  type QuantityUnit,
} from "./quantity";
export {
  DATA_UNITS,
  DATA_UNITS_IEC,
  DURATION_UNITS,
  LENGTH_UNITS,
  MASS_UNITS,
  TEMPERATURE_UNITS,
  pickUnits,
} from "./quantity-units";

/*
 * A number with a unit: a text field that is a spinbutton, − and + buttons,
 * and a native <select> for the unit.
 *
 * The unit is a native select rather than Dowel's Select because it is one
 * short list inside a field: the platform's keyboard model, its mobile picker
 * and its form behaviour are exactly what is wanted, with no popover or portal
 * to manage.
 *
 * Bounds are quantities, not numbers, so "at most 30 kg" still means 30 kg
 * after someone switches to pounds. Every amount the field holds is rounded to
 * its unit's decimals, so what is shown is what is reported and submitted.
 */

const quantityInputVariants = cva(
  cn(
    "flex w-full min-w-0 items-stretch rounded-md border border-input bg-background text-foreground shadow-xs",
    "transition-[border-color] duration-[var(--duration-fast)] ease-[var(--ease-out-quint)]",
    "data-[invalid]:border-destructive",
  ),
  {
    variants: {
      inputSize: {
        sm: "h-8 text-sm",
        md: "h-9 text-sm",
        lg: "h-10 text-base",
      },
    },
    defaultVariants: {
      inputSize: "md",
    },
  },
);

/** Copy the field writes, for translation. Units' own names live on the units. */
export interface QuantityInputLabels {
  /** Name of the − button, given the step with its unit: "Decrease by 1 kg". */
  decrease: (step: string) => string;
  /** Name of the + button: "Increase by 1 kg". */
  increase: (step: string) => string;
  /** Joined to the field's name to name the unit selector: "Weight unit". */
  unit: string;
  /** Shown when the field is left empty. */
  empty: string;
  /** Shown when the text is not a number; `example` is 1.5 written the locale's way. */
  notANumber: (example: string) => string;
  /** Shown when the text names a unit the field does not offer. */
  unknownUnit: (typed: string, offered: readonly string[]) => string;
  /** Shown when a typed amount is under the minimum, given with its unit. */
  tooLow: (min: string) => string;
  /** Shown when a typed amount is over the maximum, given with its unit. */
  tooHigh: (max: string) => string;
}

const DEFAULT_LABELS: QuantityInputLabels = {
  decrease: (step) => `Decrease by ${step}`,
  increase: (step) => `Increase by ${step}`,
  unit: "unit",
  empty: "Enter an amount.",
  notANumber: (example) => `Enter a number, like ${example}.`,
  unknownUnit: (typed, offered) =>
    `“${typed}” is not a unit this field takes. Use ${new Intl.ListFormat("en", { type: "disjunction" }).format(offered)}.`,
  tooLow: (min) => `Enter ${min} or more.`,
  tooHigh: (max) => `Enter ${max} or less.`,
};

export interface QuantityInputProps
  extends
    Omit<ComponentPropsWithRef<"div">, "defaultValue" | "onChange" | "children">,
    VariantProps<typeof quantityInputVariants> {
  /** The units offered, all of one dimension. The first is the default. */
  units: readonly QuantityUnit[];
  /** Controlled value. */
  value?: Quantity;
  /** Initial value when uncontrolled. Defaults to 0 in the first unit, within the bounds. */
  defaultValue?: Quantity;
  /** Called with each committed change: a step, a unit change, or typed text on blur or Enter. */
  onValueChange?: (value: Quantity) => void;
  /** Lowest quantity, in any of the units. It follows the field into whichever unit is chosen. */
  min?: Quantity;
  /** Highest quantity, in any of the units. */
  max?: Quantity;
  /** Step for every unit. Leave unset to use each unit's own step, or 1. */
  step?: number;
  /** Steps taken by Shift+Arrow and Page Up/Down. */
  largeStep?: number;
  /** Converts the amount when the unit changes (5 kg → 11.02 lb). Off, the number stays. */
  convertOnUnitChange?: boolean;
  /**
   * Locale for writing and reading numbers. Defaults to the browser's, used
   * once hydrated: the server and hydration write en-US, so the two agree.
   */
  locale?: string;
  /** Visible label, linked to the field. Without it, pass aria-label or aria-labelledby. */
  label?: ReactNode;
  /** Submits the amount under this name, as a plain number ("11.02"). */
  name?: string;
  /** Submits the unit's value under this name. Defaults to `${name}Unit`. */
  unitName?: string;
  disabled?: boolean;
  readOnly?: boolean;
  /** Ref to the text field, for focusing it. A form library's field ref goes here. */
  inputRef?: Ref<HTMLInputElement>;
  /** Replaces any of the field's own copy. */
  labels?: Partial<QuantityInputLabels>;
}

type Reading = { ok: true; quantity: Quantity } | { ok: false; message: string };

/** A number field with a unit selector that converts between units and reads "5 lb" when typed. */
const unsubscribe = () => () => undefined;

/** The runtime's locale in the browser, en-US on the server and while hydrating. */
function useLocale(locale: string | undefined): string | undefined {
  const runtime = useSyncExternalStore<string | undefined>(
    unsubscribe,
    () => undefined,
    () => "en-US",
  );
  return locale ?? runtime;
}

export function QuantityInput({
  className,
  inputSize,
  units,
  value: valueProp,
  defaultValue,
  onValueChange,
  min,
  max,
  step: stepProp,
  largeStep = 10,
  convertOnUnitChange = true,
  locale: localeProp,
  label,
  name,
  unitName,
  disabled = false,
  readOnly = false,
  inputRef,
  labels: labelsProp,
  id: idProp,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  ...props
}: QuantityInputProps) {
  const locale = useLocale(localeProp);
  const first = units[0];
  if (!first) throw new Error("QuantityInput needs at least one unit.");
  const labels = { ...DEFAULT_LABELS, ...labelsProp };
  const uid = useId();
  const inputId = idProp ?? `${uid}field`;
  const labelId = `${uid}label`;
  const errorId = `${uid}error`;
  const unitWordId = `${uid}unit`;

  const unitOf = (quantity: Quantity) => findUnit(units, quantity.unit) ?? first;
  const stepOf = (unit: QuantityUnit) => stepProp ?? unit.step ?? 1;
  const decimalsOf = (unit: QuantityUnit) => decimalsFor(unit, stepOf(unit));
  /** Bounds in `unit`, rounded inward so that anything shown in range is in range. */
  const limitsOf = (unit: QuantityUnit) => {
    const lo = boundIn(min, units, unit);
    const hi = boundIn(max, units, unit);
    return {
      lo: lo === undefined ? undefined : roundTo(lo, decimalsOf(unit), "ceil"),
      hi: hi === undefined ? undefined : roundTo(hi, decimalsOf(unit), "floor"),
    };
  };
  const fit = (amount: number, unit: QuantityUnit) => {
    const { lo, hi } = limitsOf(unit);
    const rounded = roundTo(amount, decimalsOf(unit));
    if (lo !== undefined && rounded < lo) return lo;
    if (hi !== undefined && rounded > hi) return hi;
    return rounded;
  };
  const convertTo = (quantity: Quantity, unit: QuantityUnit) =>
    fit(convertQuantity(quantity.amount, unitOf(quantity), unit), unit);
  const format = (quantity: Quantity, unitDisplay: "none" | "label" | "spoken") =>
    formatQuantity(quantity, units, {
      locale,
      decimals: decimalsOf(unitOf(quantity)),
      unitDisplay,
    });

  const [initial] = useState<Quantity>(
    () => defaultValue ?? { amount: fit(0, first), unit: first.value },
  );
  const [inner, setInner] = useState(initial);
  const controlled = valueProp !== undefined;
  const value = controlled ? valueProp : inner;
  const unit = unitOf(value);
  const step = stepOf(unit);
  const { lo, hi } = limitsOf(unit);

  // Text being typed, not yet read. Null shows the value, written for the locale.
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // The last amount someone entered, which conversions start from.
  const source = useRef<Quantity | null>(null);
  const input = useRef<HTMLInputElement | null>(null);

  // Handles are read after mount, when the field exists.
  useImperativeHandle(inputRef, () => input.current as HTMLInputElement, []);

  function change(next: Quantity) {
    setDraft(null);
    setError(null);
    if (next.amount === value.amount && next.unit === value.unit) return;
    if (!controlled) setInner(next);
    onValueChange?.(next);
  }

  function enter(next: Quantity) {
    source.current = null;
    change(next);
  }

  function read(text: string): Reading {
    const reading = readQuantity(text, units, locale);
    switch (reading.status) {
      case "empty":
        return { ok: false, message: labels.empty };
      case "number": {
        const example = formatQuantity({ amount: 1.5, unit: unit.value }, units, {
          locale,
          decimals: 1,
          unitDisplay: "none",
        });
        return { ok: false, message: labels.notANumber(example) };
      }
      case "unit":
        return {
          ok: false,
          message: labels.unknownUnit(
            reading.text,
            units.map((option) => option.label),
          ),
        };
    }
    const target = reading.unit ?? unit;
    const amount = roundTo(reading.amount, decimalsOf(target));
    const limits = limitsOf(target);
    if (limits.lo !== undefined && amount < limits.lo) {
      return {
        ok: false,
        message: labels.tooLow(format({ amount: limits.lo, unit: target.value }, "label")),
      };
    }
    if (limits.hi !== undefined && amount > limits.hi) {
      return {
        ok: false,
        message: labels.tooHigh(format({ amount: limits.hi, unit: target.value }, "label")),
      };
    }
    return { ok: true, quantity: { amount, unit: target.value } };
  }

  /** Reads the draft into the value, or shows why it cannot. Leaves the value alone if not. */
  function commit(): boolean {
    if (draft === null) return true;
    const reading = read(draft);
    if (!reading.ok) {
      setError(reading.message);
      return false;
    }
    enter(reading.quantity);
    return true;
  }

  function stepBy(multiplier: number) {
    const reading = draft === null ? null : read(draft);
    const base = reading?.ok ? reading.quantity : value;
    const baseUnit = unitOf(base);
    const size = stepOf(baseUnit);
    // Off-step values land on the next step in that direction, as a native
    // number input does, rather than keeping their odd remainder forever.
    const steps = base.amount / size;
    const whole =
      Math.abs(steps - Math.round(steps)) < 1e-9
        ? Math.round(steps)
        : multiplier > 0
          ? Math.floor(steps)
          : Math.ceil(steps);
    enter({ amount: fit((whole + multiplier) * size, baseUnit), unit: baseUnit.value });
  }

  function changeUnit(next: string) {
    const to = findUnit(units, next);
    if (!to) return;
    if (!convertOnUnitChange) {
      enter({ amount: fit(value.amount, to), unit: to.value });
      return;
    }
    // Converting from what was entered rather than from the rounded amount on
    // screen, so kg → lb → kg comes back to exactly what was typed. Once the
    // value has moved on some other way, it is the new starting point.
    const from =
      source.current && convertTo(source.current, unit) === value.amount
        ? source.current
        : value;
    source.current = from;
    change({ amount: convertTo(from, to), unit: to.value });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      // An unreadable draft must not submit the form with the old value behind it.
      if (!commit()) event.preventDefault();
      return;
    }
    if (event.key === "Escape") {
      if (draft === null && error === null) return;
      event.preventDefault();
      setDraft(null);
      setError(null);
      return;
    }
    if (readOnly) return;
    const large = event.shiftKey ? largeStep : 1;
    if (event.key === "ArrowUp") stepBy(large);
    else if (event.key === "ArrowDown") stepBy(-large);
    else if (event.key === "PageUp") stepBy(largeStep);
    else if (event.key === "PageDown") stepBy(-largeStep);
    else if (event.key === "Home" && lo !== undefined) enter({ amount: lo, unit: unit.value });
    else if (event.key === "End" && hi !== undefined) enter({ amount: hi, unit: unit.value });
    else return;
    event.preventDefault();
  }

  function handleChange(text: string) {
    setDraft(text);
    // An error clears as soon as the text is fixed; a new one waits for blur or
    // Enter, so nobody is told off halfway through typing.
    if (error !== null && read(text).ok) setError(null);
  }

  /** A pasted "2.5 lb" that makes the whole field readable is taken at once, unit and all. */
  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    const field = event.currentTarget;
    const start = field.selectionStart ?? field.value.length;
    const end = field.selectionEnd ?? start;
    const text =
      field.value.slice(0, start) +
      event.clipboardData.getData("text/plain") +
      field.value.slice(end);
    const reading = readQuantity(text, units, locale);
    if (reading.status !== "ok" || !reading.unit) return;
    const result = read(text);
    if (!result.ok) return;
    event.preventDefault();
    enter(result.quantity);
  }

  // Native form validation sees the same error the field shows.
  useEffect(() => {
    input.current?.setCustomValidity(error ?? "");
  }, [error]);

  // A form reset puts an uncontrolled field back, as it does a native input.
  useEffect(() => {
    const form = input.current?.form;
    if (!form) return;
    const reset = () => {
      source.current = null;
      setDraft(null);
      setError(null);
      if (!controlled) setInner(initial);
    };
    form.addEventListener("reset", reset);
    return () => {
      form.removeEventListener("reset", reset);
    };
  }, [controlled, initial]);

  useMissingNameWarning(input, Boolean(label) || Boolean(ariaLabel) || Boolean(ariaLabelledBy));

  const invalid =
    error !== null ||
    (ariaInvalid !== undefined && ariaInvalid !== false && ariaInvalid !== "false");
  const describedBy = [ariaDescribedBy, error === null ? undefined : errorId]
    .filter(Boolean)
    .join(" ");
  const nameSource = label ? labelId : ariaLabelledBy;
  const stepText = `${format({ amount: step, unit: unit.value }, "none")} ${unit.label}`;
  const atMin = readOnly || (lo !== undefined && value.amount <= lo);
  const atMax = readOnly || (hi !== undefined && value.amount >= hi);

  const stepButton = (direction: 1 | -1) => {
    const blocked = direction > 0 ? atMax : atMin;
    return (
      <button
        type="button"
        // The arrow keys do this from the field, so the buttons stay out of the
        // Tab order; screen readers and pointers still reach them.
        tabIndex={-1}
        data-slot={direction > 0 ? "quantity-input-increment" : "quantity-input-decrement"}
        aria-label={direction > 0 ? labels.increase(stepText) : labels.decrease(stepText)}
        aria-disabled={blocked || undefined}
        disabled={disabled}
        // Keeps focus, and a phone's keyboard, in the field while stepping.
        onMouseDown={(event) => {
          event.preventDefault();
        }}
        onClick={() => {
          if (!blocked) stepBy(direction);
        }}
        className={cn(
          "m-0.5 flex shrink-0 items-center justify-center rounded-sm px-2 text-muted-foreground",
          "transition-colors duration-[var(--duration-fast)] hover:bg-accent hover:text-accent-foreground",
          "aria-disabled:opacity-40 aria-disabled:hover:bg-transparent aria-disabled:hover:text-muted-foreground",
          "disabled:pointer-events-none",
          focusRingInset,
        )}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          aria-hidden="true"
          className="size-4"
        >
          <path d="M6 12h12" />
          {direction > 0 ? <path d="M12 6v12" /> : null}
        </svg>
      </button>
    );
  };

  return (
    <div
      role="group"
      aria-labelledby={nameSource}
      data-slot="quantity-input"
      data-invalid={invalid ? "" : undefined}
      data-disabled={disabled ? "" : undefined}
      className={cn("flex w-full flex-col data-[disabled]:opacity-55", className)}
      {...props}
    >
      {label ? (
        <label
          id={labelId}
          htmlFor={inputId}
          data-slot="quantity-input-label"
          className="mb-2 text-sm leading-none font-medium select-none"
        >
          {label}
        </label>
      ) : null}
      <div
        data-slot="quantity-input-control"
        data-invalid={invalid ? "" : undefined}
        className={quantityInputVariants({ inputSize })}
      >
        {stepButton(-1)}
        <input
          ref={input}
          id={inputId}
          type="text"
          role="spinbutton"
          // Phones' decimal pads have no minus key, so it is offered only when
          // the field cannot go below zero.
          inputMode={lo !== undefined && lo >= 0 ? "decimal" : "text"}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          data-slot="quantity-input-field"
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
          aria-describedby={describedBy || undefined}
          aria-invalid={invalid || undefined}
          aria-valuenow={value.amount}
          aria-valuemin={lo}
          aria-valuemax={hi}
          aria-valuetext={format(value, "spoken")}
          disabled={disabled}
          readOnly={readOnly}
          value={draft ?? format(value, "none")}
          onChange={(event) => {
            handleChange(event.target.value);
          }}
          onKeyDown={handleKeyDown}
          onBlur={commit}
          onPaste={handlePaste}
          className={cn(
            "min-w-0 flex-1 rounded-sm bg-transparent px-1 text-center tabular-nums",
            "disabled:cursor-not-allowed",
            focusRingInset,
            invalidStyles,
          )}
        />
        {stepButton(1)}
        {units.length > 1 ? (
          <span data-slot="quantity-input-unit" className="relative flex border-s border-input">
            <select
              data-slot="quantity-input-unit-select"
              value={unit.value}
              disabled={disabled || readOnly}
              onChange={(event) => {
                changeUnit(event.target.value);
              }}
              {...(nameSource
                ? { "aria-labelledby": `${nameSource} ${unitWordId}` }
                : { "aria-label": ariaLabel ? `${ariaLabel} ${labels.unit}` : labels.unit })}
              className={cn(
                "h-full min-w-0 cursor-pointer appearance-none rounded-e-md bg-transparent ps-2.5 pe-7 font-medium",
                "disabled:cursor-not-allowed [&>option]:bg-popover [&>option]:text-popover-foreground",
                focusRingInset,
              )}
            >
              {units.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              className="pointer-events-none absolute end-2 top-1/2 size-4 -translate-y-1/2 opacity-60"
            >
              <path
                d="m7 10 5 5 5-5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {nameSource ? (
              <span id={unitWordId} hidden>
                {labels.unit}
              </span>
            ) : null}
          </span>
        ) : (
          // One unit needs no choice; the spoken value already names it.
          <span
            data-slot="quantity-input-unit"
            aria-hidden="true"
            className="flex items-center pe-3 text-muted-foreground"
          >
            {unit.label}
          </span>
        )}
      </div>
      {/* Present from the start and empty, so an error arriving later is announced. */}
      <div data-slot="quantity-input-message" aria-live="polite">
        {error === null ? null : (
          <p id={errorId} className="mt-1.5 flex items-start gap-1.5 text-sm text-destructive">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              aria-hidden="true"
              className="mt-0.5 size-3.5 shrink-0"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7.5v5M12 16.5h.01" />
            </svg>
            {error}
          </p>
        )}
      </div>
      {name ? (
        <>
          <input type="hidden" name={name} value={String(value.amount)} disabled={disabled} />
          <input
            type="hidden"
            name={unitName ?? `${name}Unit`}
            value={value.unit}
            disabled={disabled}
          />
        </>
      ) : null}
    </div>
  );
}

/**
 * Warns, in development only, when the field would render unnamed.
 *
 * Checks the field's own `labels` as well as the props, because a <label for>
 * elsewhere on the page, or FormLabel, names it without passing anything here.
 */
function useMissingNameWarning(input: { current: HTMLInputElement | null }, named: boolean) {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" || named) return;
    if ((input.current?.labels?.length ?? 0) > 0) return;
    console.warn(
      "[QuantityInput] The field has no accessible name. Pass label, aria-label or " +
        "aria-labelledby, or point a <label> at its id.",
    );
  }, [input, named]);
}

export { quantityInputVariants };
