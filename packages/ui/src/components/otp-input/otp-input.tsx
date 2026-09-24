"use client";

// Ported from SmoothUI Animated OTP Input (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import { cva, type VariantProps } from "class-variance-authority";
import {
  useCallback,
  useEffect,
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
 * Motion is CSS: slots rise in with a stagger, a character flips (or rolls)
 * in when it lands, the active slot rings. All of it is decoration and stops
 * under reduced motion; the caret settles visible instead of blinking.
 *
 * The caret is one element for the whole row, not one per slot. It is placed
 * over the slot it belongs to by measuring that slot's box, and translated
 * there with a transition, so it slides from slot to slot as you type or use
 * the arrow keys. Each time it arrives its blink restarts, solid, the way a
 * text caret stays solid while you type.
 *
 * `status` is the verdict on a complete code. "success" traces a ring around
 * each slot in turn — a conic mask swept through a registered angle property —
 * and "error" rings every slot red and shakes the row once. Only a change of
 * status plays these; a field rendered with a status already set just shows
 * the colours. An error also sets aria-invalid, and `statusMessage` is
 * announced politely. (The status feedback, the sliding caret and the rolling
 * entrance were inspired by the Rare UI OTP Input pattern; no code referenced.)
 */

const PREFIX = "dowel-otp-input";

const STYLES = `
@property --${PREFIX}-sweep{syntax:"<angle>";inherits:false;initial-value:0deg}
@keyframes ${PREFIX}-enter{from{opacity:0;transform:translateY(10px) scale(.8)}}
@keyframes ${PREFIX}-char{from{opacity:0;transform:rotateY(-90deg) scale(.5)}}
@keyframes ${PREFIX}-roll{from{opacity:0;transform:translateY(55%) rotateX(-80deg);filter:blur(2px)}}
@keyframes ${PREFIX}-blink{0%,45%{opacity:1}55%,100%{opacity:0}}
@keyframes ${PREFIX}-trace{from{--${PREFIX}-sweep:0deg}}
@keyframes ${PREFIX}-shake{0%,100%{translate:0}15%{translate:-7px}30%{translate:6px}45%{translate:-4px}60%{translate:3px}75%{translate:-1px}}
[data-slot=otp-input-slot]{animation:${PREFIX}-enter calc(200ms * var(--motion-scale)) var(--ease-out-quint) both;animation-delay:calc(var(--${PREFIX}-index) * 50ms * var(--motion-scale))}
[data-slot=otp-input-char]{animation:${PREFIX}-char calc(200ms * var(--motion-scale)) var(--ease-out-quint) both}
[data-slot=otp-input][data-entrance=roll] [data-slot=otp-input-char]{animation:${PREFIX}-roll calc(260ms * var(--motion-scale)) var(--ease-out-quint) both}
[data-slot=otp-input-caret-blink]{animation:${PREFIX}-blink calc(1.1s * var(--motion-scale)) var(--ease-in-out-quint) infinite}
[data-slot=otp-input-trace]{--${PREFIX}-sweep:360deg;mask-image:conic-gradient(var(--color-foreground) var(--${PREFIX}-sweep),transparent 0)}
[data-slot=otp-input][data-played] [data-slot=otp-input-trace]{animation:${PREFIX}-trace calc(420ms * var(--motion-scale)) var(--ease-in-out-quint) both;animation-delay:calc(var(--${PREFIX}-index) * 80ms * var(--motion-scale))}
[data-slot=otp-input][data-played][data-status=error]{animation:${PREFIX}-shake calc(420ms * var(--motion-scale)) var(--ease-out-quint)}
`;

/** A painted slot. */
const otpInputVariants = cva(
  cn(
    "relative flex items-center justify-center rounded-md border border-input bg-background font-medium text-foreground shadow-xs",
    "transition-[border-color,box-shadow,scale] duration-[var(--duration-fast)] ease-[var(--ease-out-quint)] [perspective:20em]",
    "data-[filled]:scale-105",
    "data-[active]:z-10 data-[active]:border-ring data-[active]:ring-2 data-[active]:ring-ring/55",
    "data-[invalid]:border-destructive data-[invalid]:data-[active]:ring-destructive/40",
    "data-[status=error]:ring-2 data-[status=error]:ring-destructive/40",
    "data-[status=success]:border-success data-[status=success]:data-[active]:border-success data-[status=success]:data-[active]:ring-success/40",
  ),
  {
    variants: {
      slotSize: {
        sm: "size-8 text-sm",
        md: "size-10 text-base",
        lg: "size-12 text-lg",
        xl: "size-14 text-xl",
      },
    },
    defaultVariants: {
      slotSize: "md",
    },
  },
);

/** The verdict on a complete code. */
export type OtpInputStatus = "idle" | "success" | "error";

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
  /**
   * The verdict on the code. "success" traces a ring around each slot in
   * turn; "error" rings them red, shakes the row once and sets aria-invalid.
   */
  status?: OtpInputStatus;
  /**
   * Announced politely while `status` is "success" or "error" — "Code
   * verified", "That code is wrong". Visible error text belongs in FormMessage.
   */
  statusMessage?: string;
  /** How a character arrives in its slot: `flip` turns it in, `roll` rolls it up from below. */
  entrance?: "flip" | "roll";
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
  status = "idle",
  statusMessage,
  entrance = "flip",
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
  const rootRef = useRef<HTMLDivElement | null>(null);
  const caretRef = useRef<HTMLSpanElement | null>(null);
  const pendingCaret = useRef<number | null>(null);

  // A status that changes plays its feedback; one present on first render
  // only colours the slots. Derived during render, like the value.
  const [seenStatus, setSeenStatus] = useState(status);
  const [played, setPlayed] = useState(false);
  if (seenStatus !== status) {
    setSeenStatus(status);
    setPlayed(true);
  }

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
  // The one caret sits in the next empty slot while nothing is selected.
  const caretAt =
    focused && start === end && start === value.length && start < length ? start : null;
  const caretShown = caretAt !== null;
  const lastCaret = useRef<number | null>(null);

  // Places the caret over its slot. Moving between slots slides; appearing
  // (focus, or leaving a selection) jumps straight there.
  const placeCaret = useCallback((index: number | null, jump: boolean) => {
    const caret = caretRef.current;
    const slot = index === null ? null : slotRefs.current[index];
    if (!caret || !slot) return;
    const x = slot.offsetLeft + slot.offsetWidth / 2;
    const y = slot.offsetTop + slot.offsetHeight / 4;
    if (jump) caret.style.transition = "none";
    caret.style.translate = `${String(x)}px ${String(y)}px`;
    caret.style.height = `${String(slot.offsetHeight / 2)}px`;
    if (jump) {
      void caret.offsetWidth;
      caret.style.transition = "";
    }
  }, []);

  useLayoutEffect(() => {
    if (caretAt === null) {
      lastCaret.current = null;
      return;
    }
    placeCaret(caretAt, lastCaret.current === null);
    lastCaret.current = caretAt;
  }, [caretAt, placeCaret, length, groups, slotSize]);

  // Slots move when the row reflows — a font arriving, a container resizing.
  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      placeCaret(lastCaret.current, true);
    });
    observer.observe(root);
    return () => {
      observer.disconnect();
    };
  }, [placeCaret]);

  const invalid = ariaInvalid === true || ariaInvalid === "true" || status === "error";
  const maskChar = typeof mask === "string" ? mask : "•";
  const named =
    props["aria-label"] !== undefined ||
    props["aria-labelledby"] !== undefined ||
    props.id !== undefined;

  return (
    <div
      ref={rootRef}
      data-slot="otp-input"
      data-disabled={disabled ? "" : undefined}
      data-status={status === "idle" ? undefined : status}
      data-played={played && status !== "idle" ? "" : undefined}
      data-entrance={entrance}
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
                data-status={status === "idle" ? undefined : status}
                style={{ [`--${PREFIX}-index`]: index } as CSSProperties}
                className={cn(otpInputVariants({ slotSize }), slotClassName)}
              >
                {char ? (
                  <span key={`${index}-${char}`} data-slot="otp-input-char">
                    {mask ? maskChar : char}
                  </span>
                ) : null}
                {status === "success" ? (
                  <span
                    data-slot="otp-input-trace"
                    className="pointer-events-none absolute -inset-[3px] rounded-[inherit] border-2 border-success"
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      ))}
      <span
        ref={caretRef}
        aria-hidden="true"
        data-slot="otp-input-caret"
        data-state={caretShown ? "visible" : "hidden"}
        data-index={caretAt ?? undefined}
        className={cn(
          "pointer-events-none absolute start-0 top-0 z-20 w-px",
          "transition-[translate,opacity] duration-[var(--duration-normal)] ease-[var(--ease-out-quint)]",
          "data-[state=hidden]:opacity-0 data-[state=hidden]:duration-[var(--duration-fast)]",
        )}
      >
        <span
          key={caretAt ?? "hidden"}
          data-slot="otp-input-caret-blink"
          className="block size-full bg-foreground"
        />
      </span>
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
        aria-invalid={ariaInvalid ?? (status === "error" ? true : undefined)}
        disabled={disabled}
        maxLength={length}
        value={value}
        style={{ ...INPUT_STYLE, ...style }}
        className="absolute inset-0 z-30 size-full border-0 p-0 outline-none selection:bg-transparent disabled:cursor-not-allowed"
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
      {statusMessage === undefined ? null : (
        <span role="status" aria-live="polite" className="sr-only">
          {status === "idle" ? "" : statusMessage}
        </span>
      )}
    </div>
  );
}

export { otpInputVariants };
