"use client";

// Original design (pattern inspired by bencho Command bar; no code referenced).
import { cva, type VariantProps } from "class-variance-authority";
import { useState, type FormEvent, type ReactNode } from "react";

import {
  PromptInput,
  PromptInputSubmit,
  PromptInputTextarea,
  type PromptInputProps,
} from "@/components/ai-prompt-input";
import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A single-row prompt bar: an auto-growing field, a dictate toggle and send.
 *
 * This is a compact composition of AI Prompt Input, not a second composer.
 * Everything that is easy to get wrong — growing to a ceiling, Enter to send
 * and Shift+Enter for a newline, never sending mid-IME-composition, the
 * send/stop control whose name follows its state — is PromptInput's own. This
 * adds only the layout (one pill row, controls aligned to the last line), a
 * controlled-or-not value that clears after sending, an empty-field guard, and
 * the dictate toggle (aria-pressed; the consumer owns the microphone).
 */

const commandBarVariants = cva("flex items-end gap-1 p-1.5", {
  variants: {
    shape: {
      pill: "rounded-[1.5rem]",
      rounded: "rounded-xl",
    },
  },
  defaultVariants: { shape: "pill" },
});

export interface CommandBarProps
  extends
    Omit<PromptInputProps, "onSubmit" | "children" | "busy">,
    VariantProps<typeof commandBarVariants> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Called with the trimmed text. An uncontrolled bar then clears itself. */
  onSend?: (value: string) => void;
  /** A send is in flight: sending is blocked and the button becomes Stop. */
  sending?: boolean;
  onStop?: () => void;
  /** Whether dictation is on. Omit `onDictatingChange` to hide the button. */
  dictating?: boolean;
  defaultDictating?: boolean;
  onDictatingChange?: (dictating: boolean) => void;
  placeholder?: string;
  /** The field's accessible name. */
  label?: string;
  sendLabel?: string;
  stopLabel?: string;
  dictateLabel?: string;
  /** Rows the field grows to before scrolling. */
  maxRows?: number;
  /** Slot before the field, e.g. an attach button. */
  leading?: ReactNode;
}

function Mic() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-4"
    >
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3ZM19 10v2a7 7 0 0 1-14 0v-2M12 19v3" />
    </svg>
  );
}

/** A compact prompt bar: auto-growing field, dictate toggle and send. */
export function CommandBar({
  className,
  shape,
  value: valueProp,
  defaultValue = "",
  onValueChange,
  onSend,
  sending = false,
  onStop,
  dictating: dictatingProp,
  defaultDictating = false,
  onDictatingChange,
  placeholder = "Ask anything…",
  label = "Message",
  sendLabel = "Send",
  stopLabel = "Stop",
  dictateLabel = "Dictate",
  maxRows = 6,
  leading,
  disabled = false,
  ...props
}: CommandBarProps) {
  const [inner, setInner] = useState(defaultValue);
  const value = valueProp ?? inner;
  const [innerDictating, setInnerDictating] = useState(defaultDictating);
  const dictating = dictatingProp ?? innerDictating;
  const empty = value.trim() === "";

  function setValue(next: string) {
    if (valueProp === undefined) setInner(next);
    onValueChange?.(next);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (empty) return;
    onSend?.(value.trim());
    if (valueProp === undefined) setInner("");
  }

  return (
    <PromptInput
      data-slot="command-bar"
      busy={sending}
      disabled={disabled}
      onSubmit={handleSubmit}
      className={cn(commandBarVariants({ shape }), className)}
      {...props}
    >
      {leading}
      <PromptInputTextarea
        aria-label={label}
        placeholder={placeholder}
        maxRows={maxRows}
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
        }}
        className="min-h-9 flex-1 px-2.5 py-2 leading-5"
      />
      {onDictatingChange || dictatingProp !== undefined ? (
        <button
          type="button"
          aria-label={dictateLabel}
          aria-pressed={dictating}
          disabled={disabled}
          data-slot="command-bar-dictate"
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground",
            "transition-[background-color,color] duration-[var(--duration-fast)] ease-[var(--ease-out-quint)]",
            "hover:bg-accent hover:text-foreground aria-pressed:bg-destructive/12 aria-pressed:text-destructive",
            "disabled:pointer-events-none disabled:opacity-55",
            focusRing,
          )}
          onClick={() => {
            if (dictatingProp === undefined) setInnerDictating(!dictating);
            onDictatingChange?.(!dictating);
          }}
        >
          <Mic />
        </button>
      ) : null}
      <PromptInputSubmit
        label={sendLabel}
        stopLabel={stopLabel}
        onStop={onStop}
        disabled={disabled || (!sending && empty)}
        className="ms-0 size-9 rounded-full"
      />
    </PromptInput>
  );
}

export { commandBarVariants };
