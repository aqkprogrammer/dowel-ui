"use client";

import {
  createContext,
  useContext,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  type ComponentPropsWithRef,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

import { focusRing, focusRingInset } from "@/lib/styles";
import { cn } from "@/lib/utils";

/**
 * The composer.
 *
 * Handles the parts of a chat input that are easy to get subtly wrong:
 * auto-growing to fit the text up to a ceiling, sending on Enter without
 * breaking multi-line input, and — the one almost everybody misses —
 * not sending mid-composition when someone is typing with an IME.
 */

interface PromptInputContextValue {
  textareaId: string;
  submit: () => void;
  disabled: boolean;
  busy: boolean;
}

const PromptInputContext = createContext<PromptInputContextValue | null>(null);

function usePromptInput(component: string): PromptInputContextValue {
  const context = useContext(PromptInputContext);
  if (!context) {
    throw new Error(`${component} must be rendered inside <PromptInput>.`);
  }
  return context;
}

export interface PromptInputProps extends Omit<ComponentPropsWithRef<"form">, "onSubmit"> {
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
  /** Blocks submission and dims the composer. */
  disabled?: boolean;
  /** A response is in flight: submission is blocked and Stop is shown instead. */
  busy?: boolean;
}

export function PromptInput({
  className,
  onSubmit,
  disabled = false,
  busy = false,
  children,
  ...props
}: PromptInputProps) {
  const uid = useId();
  const formRef = useRef<HTMLFormElement | null>(null);

  const context = useMemo<PromptInputContextValue>(
    () => ({
      textareaId: `${uid}-textarea`,
      disabled,
      busy,
      submit: () => {
        formRef.current?.requestSubmit();
      },
    }),
    [uid, disabled, busy],
  );

  return (
    <PromptInputContext.Provider value={context}>
      <form
        ref={formRef}
        data-slot="prompt-input"
        data-busy={busy || undefined}
        onSubmit={(event) => {
          if (disabled || busy) {
            event.preventDefault();
            return;
          }
          onSubmit?.(event);
        }}
        className={cn(
          "rounded-xl border border-input bg-background shadow-xs",
          "transition-[border-color,box-shadow] duration-[var(--duration-fast)]",
          "focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/55",
          disabled && "opacity-60",
          className,
        )}
        {...props}
      >
        {children}
      </form>
    </PromptInputContext.Provider>
  );
}

/** Rows the textarea will grow to before it starts scrolling. */
const DEFAULT_MAX_ROWS = 8;

export interface PromptInputTextareaProps extends Omit<
  ComponentPropsWithRef<"textarea">,
  "rows"
> {
  maxRows?: number;
  /**
   * Send on Enter, newline on Shift+Enter.
   *
   * Turn it off for a composer where Enter should always insert a newline and
   * sending is only ever an explicit button press.
   */
  submitOnEnter?: boolean;
}

export function PromptInputTextarea({
  className,
  maxRows = DEFAULT_MAX_ROWS,
  submitOnEnter = true,
  onKeyDown,
  onChange,
  ...props
}: PromptInputTextareaProps) {
  const { textareaId, submit, disabled, busy } = usePromptInput("PromptInputTextarea");
  const ref = useRef<HTMLTextAreaElement | null>(null);

  // Grows with the content up to maxRows, then scrolls. Measured after layout
  // so the height is right on the first paint rather than one frame late.
  useLayoutEffect(() => {
    const textarea = ref.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    const lineHeight = Number.parseFloat(getComputedStyle(textarea).lineHeight) || 20;
    const maxHeight = lineHeight * maxRows;
    textarea.style.height = `${String(Math.min(textarea.scrollHeight, maxHeight))}px`;
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? "auto" : "hidden";
  });

  function handleKeyDown(event: ReactKeyboardEvent<HTMLTextAreaElement>) {
    onKeyDown?.(event);
    if (event.defaultPrevented || !submitOnEnter) return;
    if (event.key !== "Enter" || event.shiftKey) return;

    // Mid-composition Enter confirms the candidate an IME is offering — for
    // Japanese, Chinese, Korean and others it is part of typing a word, not a
    // request to send. Sending here truncates the sentence and is the single
    // most common way a chat composer breaks for those users.
    if (event.nativeEvent.isComposing) return;

    event.preventDefault();
    submit();
  }

  return (
    <textarea
      ref={ref}
      id={textareaId}
      data-slot="prompt-input-textarea"
      rows={1}
      disabled={disabled}
      aria-disabled={busy || undefined}
      onKeyDown={handleKeyDown}
      onChange={onChange}
      className={cn(
        "block w-full resize-none bg-transparent px-4 py-3 text-sm outline-none",
        "placeholder:text-muted-foreground disabled:cursor-not-allowed",
        focusRingInset,
        "focus-visible:ring-0",
        className,
      )}
      {...props}
    />
  );
}

/** The row beneath the textarea: attachments, model picker, send. */
export function PromptInputToolbar({ className, ...props }: ComponentPropsWithRef<"div">) {
  return (
    <div
      data-slot="prompt-input-toolbar"
      className={cn("flex items-center gap-2 px-2 pb-2", className)}
      {...props}
    />
  );
}

export interface PromptInputSubmitProps extends ComponentPropsWithRef<"button"> {
  /** Label while idle. */
  label?: string;
  /** Label while a response is streaming. */
  stopLabel?: string;
  /** Called instead of submitting when busy. */
  onStop?: () => void;
}

/**
 * Send, or stop.
 *
 * One control with two jobs, because that is what the space affords and what
 * people expect. The accessible name changes with the state, so it is never
 * "Send" while it actually stops.
 */
export function PromptInputSubmit({
  className,
  label = "Send message",
  stopLabel = "Stop generating",
  onStop,
  ...props
}: PromptInputSubmitProps) {
  const { busy, disabled } = usePromptInput("PromptInputSubmit");

  return (
    <button
      type={busy ? "button" : "submit"}
      data-slot="prompt-input-submit"
      aria-label={busy ? stopLabel : label}
      disabled={disabled}
      onClick={busy ? onStop : undefined}
      className={cn(
        "ml-auto grid size-8 shrink-0 place-items-center rounded-lg",
        "bg-primary text-primary-foreground transition-colors duration-[var(--duration-fast)]",
        "hover:bg-primary-hover disabled:pointer-events-none disabled:opacity-55",
        focusRing,
        className,
      )}
      {...props}
    >
      {busy ? (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-3.5">
          <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-4">
          <path
            d="M12 19V5m0 0-6 6m6-6 6 6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}

export interface PromptInputCounterProps extends ComponentPropsWithRef<"div"> {
  value: number;
  max: number;
  /** Fraction of the limit past which the counter starts warning. */
  warnAt?: number;
}

/**
 * Characters used against a limit.
 *
 * The visible count updates on every keystroke; the live region does not.
 *
 * The naive version toggles `aria-live` on once the count matters, but a region
 * only announces changes that happen *while* it is live — switching it on at
 * the same moment the content changes means the one update worth hearing is the
 * one that is missed. So the region is live from the start and simply has
 * nothing in it until the limit is close, which is also what keeps ordinary
 * typing silent.
 */
export function PromptInputCounter({
  className,
  value,
  max,
  warnAt = 0.9,
  ...props
}: PromptInputCounterProps) {
  const warning = value >= max * warnAt;
  const over = value > max;
  const remaining = max - value;

  return (
    <div
      data-slot="prompt-input-counter"
      data-warning={warning || undefined}
      data-over={over || undefined}
      className={cn(
        "text-xs tabular-nums",
        over ? "text-destructive" : warning ? "text-warning" : "text-muted-foreground",
        className,
      )}
      {...props}
    >
      <span aria-hidden="true">
        {warning ? `${String(value)} / ${String(max)}` : String(value)}
      </span>
      <span role="status" aria-live="polite" className="sr-only">
        {over
          ? `Over the limit by ${String(-remaining)} characters`
          : warning
            ? `${String(remaining)} characters remaining`
            : ""}
      </span>
    </div>
  );
}
