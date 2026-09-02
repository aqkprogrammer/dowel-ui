"use client";

import {
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type ComponentPropsWithRef,
  type CompositionEvent,
  type KeyboardEvent,
  type UIEvent,
} from "react";

import { cn } from "@/lib/utils";

/**
 * Ghost-text suggestion inside a real textarea or input.
 *
 * Outside chat this is the most-copied AI affordance in software — Smart
 * Compose, Copilot's grey continuation, Notion and Linear's inline suggestions —
 * and every team rebuilds the same overlay-mirror trick from the same handful of
 * blog posts.
 *
 * Two deliberate limits, both stated rather than discovered:
 *
 * 1. It works on `textarea` and `input`, not on contenteditable. Ghost text in
 *    contenteditable means owning selection, undo and inline formatting, which
 *    is an editor, not a component. Anyone in that territory already has
 *    ProseMirror or Lexical and should extend it there.
 * 2. The suggestion completes the END of the value. Mid-caret insertion needs
 *    per-character measurement of wrapped text; the ghost hides whenever the
 *    caret is not at the end rather than rendering in the wrong place.
 *
 * There is no WAI-ARIA pattern for generative ghost text. Combobox is the
 * nearest and does not fit: the suggestion is not one of a known set of options,
 * so a listbox would be a lie. What the standard does require is that the
 * suggestion be perceivable and that the keyboard is never trapped — so the text
 * is announced through a live description, and Escape always restores plain Tab.
 */

export interface InlineCompletionProps extends Omit<
  ComponentPropsWithRef<"textarea">,
  "value" | "onChange" | "children"
> {
  value: string;
  onValueChange: (value: string) => void;
  /**
   * The continuation to show after the value. Empty or undefined shows nothing.
   * The caller supplies this; the component never requests it.
   */
  suggestion?: string;
  /** Called with the full text after the suggestion is taken. */
  onAccept?: (value: string) => void;
  /** Called when the reader rejects the suggestion outright. */
  onDismiss?: () => void;
  /** Renders a single-line input instead of a textarea. */
  singleLine?: boolean;
}

/** The next word of a suggestion, including its leading space. */
function nextWord(suggestion: string): string {
  const match = /^\s*\S+/.exec(suggestion);
  return match ? match[0] : suggestion;
}

export function InlineCompletion({
  className,
  value,
  onValueChange,
  suggestion = "",
  onAccept,
  onDismiss,
  singleLine = false,
  onKeyDown,
  onScroll,
  ...props
}: InlineCompletionProps) {
  const fieldRef = useRef<HTMLTextAreaElement | null>(null);
  const mirrorRef = useRef<HTMLDivElement | null>(null);
  const describedById = useId();

  const [dismissed, setDismissed] = useState(false);
  const [composing, setComposing] = useState(false);
  const [caretAtEnd, setCaretAtEnd] = useState(true);

  // A suggestion is only shown when it can be shown honestly: not mid-word of
  // an IME composition, not after the reader has rejected it, and not when the
  // caret sits somewhere the ghost would render in the wrong place.
  const visible = suggestion.length > 0 && !dismissed && !composing && caretAtEnd;

  function syncCaret() {
    const field = fieldRef.current;
    if (!field) return;
    setCaretAtEnd(field.selectionStart === value.length && field.selectionEnd === value.length);
  }

  function accept(text: string) {
    const next = value + text;
    onValueChange(next);
    onAccept?.(next);
    setDismissed(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;

    if (!visible) return;

    // Word-at-a-time, before the plain Tab case so the modifier wins.
    if (event.key === "ArrowRight" && (event.metaKey || event.altKey || event.ctrlKey)) {
      event.preventDefault();
      accept(nextWord(suggestion));
      return;
    }

    if (event.key === "Tab") {
      event.preventDefault();
      accept(suggestion);
      return;
    }

    if (event.key === "Escape") {
      // The escape hatch. Without it, a keyboard user facing a suggestion has
      // no way to leave the field: Tab would accept instead of moving focus.
      event.preventDefault();
      setDismissed(true);
      onDismiss?.();
    }
  }

  function handleChange(event: ChangeEvent<HTMLTextAreaElement>) {
    // Any edit invalidates the previous rejection: the reader has moved on and
    // the next suggestion is a different one.
    setDismissed(false);
    onValueChange(event.target.value);
    queueMicrotask(syncCaret);
  }

  function handleScroll(event: UIEvent<HTMLTextAreaElement>) {
    onScroll?.(event);
    // The mirror has to follow the field, or the ghost detaches from the text
    // as soon as the content is taller than the box.
    if (mirrorRef.current) {
      mirrorRef.current.scrollTop = event.currentTarget.scrollTop;
      mirrorRef.current.scrollLeft = event.currentTarget.scrollLeft;
    }
  }

  function handleComposition(event: CompositionEvent<HTMLTextAreaElement>) {
    setComposing(event.type === "compositionstart");
  }

  // Typography must match exactly between field and mirror or the ghost lands
  // in the wrong place. Both take the same class string for that reason.
  const shared = cn(
    "w-full rounded-md border border-input px-3 py-2 text-sm",
    singleLine ? "overflow-x-auto whitespace-pre" : "break-words whitespace-pre-wrap",
  );

  return (
    <div data-slot="inline-completion" className={cn("relative", className)}>
      {/* The mirror sits behind the field and holds the value in transparent
          text purely to push the ghost to the caret position. */}
      <div
        ref={mirrorRef}
        aria-hidden="true"
        data-slot="inline-completion-ghost"
        className={cn(
          shared,
          "pointer-events-none absolute inset-0 overflow-hidden border-transparent text-transparent select-none",
        )}
      >
        {value}
        {visible ? (
          <span data-slot="inline-completion-suggestion" className="text-muted-foreground">
            {suggestion}
          </span>
        ) : null}
      </div>

      <textarea
        ref={fieldRef}
        data-slot="inline-completion-field"
        data-suggesting={visible || undefined}
        rows={singleLine ? 1 : props.rows}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onScroll={handleScroll}
        onSelect={syncCaret}
        onClick={syncCaret}
        onCompositionStart={handleComposition}
        onCompositionEnd={handleComposition}
        aria-describedby={visible ? describedById : undefined}
        className={cn(
          shared,
          "relative resize-none bg-transparent",
          "placeholder:text-muted-foreground",
          "outline-none focus-visible:ring-2 focus-visible:ring-ring/55",
          singleLine && "resize-none",
        )}
        {...props}
      />

      {/* The suggestion as text, for anyone who cannot see grey glyphs behind a
          field. Polite, so it does not interrupt typing, and it states the keys
          because a gesture nobody knows about is not an affordance. */}
      <span id={describedById} aria-live="polite" className="sr-only">
        {visible ? `Suggestion: ${suggestion}. Press Tab to accept, Escape to dismiss.` : ""}
      </span>
    </div>
  );
}
