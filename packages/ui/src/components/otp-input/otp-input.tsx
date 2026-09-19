"use client";

// Ported from SmoothUI Animated OTP Input (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import { cva, type VariantProps } from "class-variance-authority";
import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type ComponentPropsWithRef,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type Ref,
} from "react";

import { cn } from "@/lib/utils";

/*
 * One real <input> drives N painted slots.
 *
 * The input is transparent and laid over the slots, so it receives every
 * click, tap, paste and SMS autofill a native field would — `autocomplete=
 * "one-time-code"` only works on a real text input, and a row of six inputs
 * breaks paste, autofill and screen-reader reading all at once. The slots
 * are aria-hidden paint: what a screen reader meets is one labelled text
 * field holding the code.
 *
 * The caret lives on a slot rather than in the input. A collapsed caret in
 * front of a filled character is widened to select that character, so typing
 * overwrites it and moves on — the behaviour people expect from a code field.
 *
 * Motion is CSS: slots rise in with a stagger, a digit flips in when it lands,
 * the active slot rings. All of it is decoration and stops under reduced
 * motion; the caret settles visible instead of blinking.
 */

const PREFIX = "dowel-otp-input";

const STYLES = `
@keyframes ${PREFIX}-enter{from{opacity:0;transform:translateY(10px) scale(.8)}}
@keyframes ${PREFIX}-char{from{opacity:0;transform:rotateY(-90deg) scale(.5)}}
@keyframes ${PREFIX}-caret{0%,100%{opacity:0}50%{opacity:1}}
[data-slot=otp-input-slot]{animation:${PREFIX}-enter calc(200ms * var(--motion-scale)) var(--ease-out-quint) both;animation-delay:calc(var(--${PREFIX}-index) * 50ms * var(--motion-scale))}
[data-slot=otp-input-char]{animation:${PREFIX}-char calc(200ms * var(--motion-scale)) var(--ease-out-quint) both}
[data-slot=otp-input-caret]{animation:${PREFIX}-caret calc(1s * var(--motion-scale)) var(--ease-in-out-quint) infinite}
`;

/** A painted slot. */
const otpInputVariants = cva(
  cn(
    "relative flex items-center justify-center rounded-md border border-input bg-background font-medium text-foreground shadow-xs",
    "transition-[border-color,box-shadow,scale] duration-[var(--duration-fast)] ease-[var(--ease-out-quint)] [perspective:20em]",
    "data-[filled]:scale-105",
    "data-[active]:z-10 data-[active]:border-ring data-[active]:ring-2 data-[active]:ring-ring/55",
    "data-[invalid]:border-destructive data-[invalid]:data-[active]:ring-destructive/40",
  ),
  {
    variants: {
      slotSize: {
        sm: "size-8 text-sm",
        md: "size-10 text-base",
        lg: "size-12 text-lg",
      },
    },
    defaultVariants: {
      slotSize: "md",
    },
  },
);

/** Which characters a slot accepts. A RegExp is tested against one character. */
export type OtpInputAllow = "numeric" | "alphanumeric" | "alpha" | RegExp;

const ALLOW: Record<Exclude<OtpInputAllow, RegExp>, RegExp> = {
  numeric: /^\d$/,
  alphanumeric: /^[\p{L}\p{N}]$/u,
  alpha: /^\p{L}$/u,
};

export interface OtpInputProps
  extends
    Omit<
      ComponentPropsWithRef<"input">,
      "value" | "defaultValue" | "onChange" | "type" | "maxLength" | "size" | "children"
    >,
    VariantProps<typeof otpInputVariants> {
  /** Number of characters in the code. */
  length?: number;
  /** Controlled value. */
  value?: string;
  /** Initial value when uncontrolled. */
  defaultValue?: string;
  /** Called with the sanitised code whenever it changes. */
  onValueChange?: (value: string) => void;
  /** Called once each time the last slot is filled. */
  onComplete?: (value: string) => void;
  /** Characters accepted; anything else typed or pasted is dropped. */
  allow?: OtpInputAllow;
  /** Paints each filled slot with a dot, or the given character, instead of its value. */
  mask?: boolean | string;
  /** Slot counts per group, e.g. `[3, 3]`. A separator is drawn between groups. */
  groups?: number[];
  /** Drawn between groups. Decorative. */
  separator?: ReactNode;
  /** Classes for each painted slot. */
  slotClassName?: string;
}

function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === "function") ref(value);
  else if (ref) ref.current = value;
}

function sanitize(text: string, allow: OtpInputAllow, length: number): string {
  const test = typeof allow === "string" ? ALLOW[allow] : allow;
  let out = "";
  for (const char of text) {
    if (out.length >= length) break;
    if (test.test(char)) out += char;
  }
  return out;
}

/** The slot indexes of each group, in order. */
function layout(groups: number[] | undefined, length: number): number[][] {
  const sizes = groups && groups.length > 0 ? groups : [length];
  const result: number[][] = [];
  let next = 0;
  for (const size of sizes) {
    const group: number[] = [];
    for (let i = 0; i < size && next < length; i += 1) group.push(next++);
    if (group.length > 0) result.push(group);
  }
  // Whatever the groups leave over goes in a last group, so no slot is lost.
  if (next < length) result.push(Array.from({ length: length - next }, (_, i) => next + i));
  return result;
}

/** Laid over the slots: catches every pointer and keystroke, paints nothing. */
const INPUT_STYLE: CSSProperties = {
  color: "transparent",
  caretColor: "transparent",
  background: "transparent",
  fontSize: "1rem",
  letterSpacing: "-0.5em",
  fontFamily: "monospace",
};

/** A one-time-code field: one real input, drawn as a row of animated slots. */
export function OtpInput({
  className,
  slotClassName,
  length = 6,
  value: valueProp,
  defaultValue = "",
  onValueChange,
  onComplete,
  allow = "numeric",
  mask = false,
  groups,
  separator,
  slotSize,
  disabled,
  style,
  ref,
  onFocus,
  onBlur,
  onKeyDown,
  onKeyUp,
  onClick,
  onPaste,
  onSelect,
  "aria-invalid": ariaInvalid,
  ...props
}: OtpInputProps) {
  const [uncontrolled, setUncontrolled] = useState(() => sanitize(defaultValue, allow, length));
  const controlled = valueProp !== undefined;
  const value = controlled ? sanitize(valueProp, allow, length) : uncontrolled;
  const [focused, setFocused] = useState(false);
  const [selection, setSelection] = useState<[number, number]>([value.length, value.length]);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const slotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const pendingCaret = useRef<number | null>(null);

  const setRefs = useCallback(
    (node: HTMLInputElement | null) => {
      inputRef.current = node;
      assignRef(ref, node);
    },
    [ref],
  );

  /** Reads the caret, widening a collapsed one in front of a character to select it. */
  const sync = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    let start = el.selectionStart ?? el.value.length;
    let end = el.selectionEnd ?? start;
    if (start === end && el.value.length > 0) {
      if (start < el.value.length) end = start + 1;
      else if (el.value.length >= length) [start, end] = [length - 1, length];
      if (end !== start) el.setSelectionRange(start, end);
    }
    setSelection([start, end]);
  }, [length]);

  const moveTo = useCallback(
    (index: number) => {
      const el = inputRef.current;
      if (!el) return;
      const at = Math.max(0, Math.min(index, el.value.length));
      el.setSelectionRange(at, at);
      sync();
    },
    [sync],
  );

  // After a change or paste, place the caret, then re-read it.
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el || el.ownerDocument.activeElement !== el) return;
    if (pendingCaret.current !== null) {
      el.setSelectionRange(pendingCaret.current, pendingCaret.current);
      pendingCaret.current = null;
    }
    sync();
  }, [value, sync]);

  function commit(next: string) {
    if (next === value) return;
    if (!controlled) setUncontrolled(next);
    onValueChange?.(next);
    if (next.length === length && value.length !== length) onComplete?.(next);
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    commit(sanitize(event.target.value, allow, length));
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    onPaste?.(event);
    if (event.defaultPrevented) return;
    event.preventDefault();
    const pasted = sanitize(event.clipboardData.getData("text/plain"), allow, length);
    if (!pasted) return;
    const el = event.currentTarget;
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? start;
    // A whole code replaces what is there; a fragment is inserted at the caret.
    const next =
      pasted.length >= length
        ? pasted
        : sanitize(value.slice(0, start) + pasted + value.slice(end), allow, length);
    pendingCaret.current = Math.min(
      pasted.length >= length ? length : start + pasted.length,
      length,
    );
    commit(next);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    onKeyDown?.(event);
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
    const [start] = selection;
    const targets: Record<string, number> = {
      ArrowLeft: start - 1,
      ArrowRight: start + 1,
      Home: 0,
      End: value.length,
    };
    const target = targets[event.key];
    if (target === undefined || event.shiftKey) return;
    event.preventDefault();
    moveTo(target);
  }

  function handleClick(event: MouseEvent<HTMLInputElement>) {
    onClick?.(event);
    // The input's own caret positions do not line up with the painted slots,
    // so a click is resolved against the slots' boxes instead.
    const hit = slotRefs.current.findIndex((slot) => {
      const box = slot?.getBoundingClientRect();
      return !!box && box.width > 0 && event.clientX >= box.left && event.clientX <= box.right;
    });
    if (hit >= 0) moveTo(hit);
    else sync();
  }

  function handleFocus(event: FocusEvent<HTMLInputElement>) {
    onFocus?.(event);
    setFocused(true);
    // Focus lands after the last character, never selecting the whole code:
    // typing into a tabbed-to field continues it rather than wiping it.
    moveTo(event.currentTarget.value.length);
  }

  function handleBlur(event: FocusEvent<HTMLInputElement>) {
    onBlur?.(event);
    setFocused(false);
  }

  const [start, end] = selection;
  const invalid = ariaInvalid === true || ariaInvalid === "true";
  const maskChar = typeof mask === "string" ? mask : "•";
  const named =
    props["aria-label"] !== undefined ||
    props["aria-labelledby"] !== undefined ||
    props.id !== undefined;

  return (
    <div
      data-slot="otp-input"
      data-disabled={disabled ? "" : undefined}
      dir="ltr"
      className={cn(
        "relative inline-flex items-center gap-2 data-[disabled]:opacity-55",
        className,
      )}
    >
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      {layout(groups, length).map((group, groupIndex) => (
        <div key={group[0]} className="flex items-center gap-2" aria-hidden="true">
          {groupIndex > 0 ? (
            <span data-slot="otp-input-separator" className="flex text-muted-foreground">
              {separator ?? <span className="h-0.5 w-3 rounded-full bg-current" />}
            </span>
          ) : null}
          {group.map((index) => {
            const char = value[index];
            const active =
              focused &&
              index >= Math.min(start, length - 1) &&
              index < Math.max(end, start + 1);
            const caret = focused && start === end && start === index && index === value.length;
            return (
              <div
                key={index}
                ref={(node) => {
                  slotRefs.current[index] = node;
                }}
                data-slot="otp-input-slot"
                data-active={active ? "" : undefined}
                data-filled={char ? "" : undefined}
                data-invalid={invalid ? "" : undefined}
                style={{ [`--${PREFIX}-index`]: index } as CSSProperties}
                className={cn(otpInputVariants({ slotSize }), slotClassName)}
              >
                {char ? (
                  <span key={`${index}-${char}`} data-slot="otp-input-char">
                    {mask ? maskChar : char}
                  </span>
                ) : null}
                {caret ? (
                  <span
                    data-slot="otp-input-caret"
                    className="pointer-events-none absolute h-1/2 w-px bg-foreground"
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      ))}
      <input
        ref={setRefs}
        data-slot="otp-input-control"
        type="text"
        inputMode={allow === "numeric" ? "numeric" : "text"}
        autoComplete="one-time-code"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        aria-label={named ? undefined : "One-time code"}
        aria-invalid={ariaInvalid}
        disabled={disabled}
        maxLength={length}
        value={value}
        style={{ ...INPUT_STYLE, ...style }}
        className="absolute inset-0 size-full border-0 p-0 outline-none selection:bg-transparent disabled:cursor-not-allowed"
        onChange={handleChange}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        onKeyUp={(event) => {
          onKeyUp?.(event);
          sync();
        }}
        onSelect={(event) => {
          onSelect?.(event);
          sync();
        }}
        onClick={handleClick}
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...props}
      />
    </div>
  );
}

export { otpInputVariants };
