"use client";

// Motion from SmoothUI AnimatedTags (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ClipboardEvent,
  type ComponentPropsWithRef,
  type KeyboardEvent,
} from "react";

import { disabledStyles, focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/**
 * A field whose value is a list of short strings: invited emails, allowed
 * domains, labels, stop sequences.
 *
 * The behaviour that makes this worth shipping is what happens to input that
 * fails validation. Every implementation surveyed either refuses to create the
 * token, or creates it and silently throws it away — and both leave the reader
 * staring at a field that did not do what they asked, with nothing to correct.
 * Here an invalid entry becomes a token like any other, marked invalid and
 * carrying its reason, so it can be seen, read out, and fixed by removing it.
 * `value` holds every token including the invalid ones; the consumer runs the
 * same `validate` to decide whether the field is submittable.
 *
 * Deliberately no suggestion list. A token field with an anchored listbox is a
 * multi-select combobox, and this library already has 544 lines of hand-rolled
 * combobox ARIA. A second copy of that would be the expensive kind of
 * duplication — the kind that drifts. When multi-select is wanted, it belongs in
 * Combobox.
 */

/** Returns `true` for a valid tag, or a reason it is not. */
export type TagValidator = (tag: string, existing: string[]) => true | string;

export interface TagsInputProps extends Omit<
  ComponentPropsWithRef<"div">,
  "onChange" | "children"
> {
  value: string[];
  onValueChange: (tags: string[]) => void;
  /** Names the field. Required — an unlabelled list of tokens is unreadable. */
  label: string;
  /** Characters that commit the token being typed, besides Enter. */
  delimiters?: string[];
  /**
   * Decides whether a tag is acceptable. An invalid tag is still added, marked,
   * and given its reason, rather than being refused or dropped.
   */
  validate?: TagValidator;
  /** Rejects a tag already present. Rejections are announced, never silent. */
  allowDuplicates?: boolean;
  /** Refuses further tags once reached, and says so. */
  max?: number;
  placeholder?: string;
  disabled?: boolean;
  inputProps?: Omit<ComponentPropsWithRef<"input">, "value" | "onChange" | "disabled">;
  /**
   * Lets a removed tag blur and drop away before it leaves the DOM. The
   * departing copy is `aria-hidden` and inert. Off by default, because the old
   * token briefly remains in the markup. Tags added after mount always blur in.
   */
  animateExit?: boolean;
}

/*
 * SmoothUI's AnimatedTags: a new token rises in out of a blur, a removed one
 * sinks back into it. Keyframes ship with the component (ADR 0014) and run on
 * duration tokens, so reduced motion collapses them. Tags present on first
 * render do not animate — a page load is not an addition.
 */
const TAG_KEYFRAMES = `
@keyframes dowel-tags-input-in{from{opacity:0;filter:blur(4px);transform:translateY(0.5rem) scale(0.9)}}
@keyframes dowel-tags-input-out{to{opacity:0;filter:blur(4px);transform:translateY(0.5rem) scale(0.9)}}
[data-slot="tags-input-tag"][data-enter]{animation:dowel-tags-input-in var(--duration-normal) var(--ease-out-quint)}
[data-slot="tags-input-tag"][data-state="closed"]{animation:dowel-tags-input-out var(--duration-fast) var(--ease-in-quint) forwards}
`;

/** Clears departing tags whose animation never runs (hidden, unstyled). */
const EXIT_FALLBACK_MS = 1000;

/**
 * Keys that survive removals: the tag plus how many times it has appeared so
 * far. An index key would shift every later tag on a removal, remounting them
 * (and replaying their entrance) and mistaking the last one for the removed.
 */
function occurrenceKeys(tags: string[]): string[] {
  const seen = new Map<string, number>();
  return tags.map((tag) => {
    const count = seen.get(tag) ?? 0;
    seen.set(tag, count + 1);
    return `${String(count)}:${tag}`;
  });
}

interface LeavingTag {
  key: string;
  tag: string;
  index: number;
}

/** Splits pasted or typed text on any delimiter, dropping empty fragments. */
function splitOn(text: string, delimiters: string[]): string[] {
  if (delimiters.length === 0) return [text];
  const pattern = new RegExp(`[${delimiters.map((d) => `\\${d}`).join("")}]`);
  return text
    .split(pattern)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

export function TagsInput({
  className,
  value,
  onValueChange,
  label,
  delimiters = [",", ";"],
  validate,
  allowDuplicates = false,
  max,
  placeholder,
  disabled = false,
  inputProps,
  animateExit = false,
  ...props
}: TagsInputProps) {
  const [draft, setDraft] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const labelId = useId();
  const inputId = useId();
  const hintId = useId();

  const atLimit = max !== undefined && value.length >= max;

  const keys = occurrenceKeys(value);
  // Keys already on screen, which do not play an entrance. Derived from the
  // previous render rather than in an effect, so a departing tag is in place on
  // the same commit its live copy leaves.
  const [settled, setSettled] = useState(() => new Set(keys));
  const [previous, setPrevious] = useState(value);
  const [leaving, setLeaving] = useState<LeavingTag[]>([]);
  if (previous !== value) {
    setPrevious(value);
    const present = new Set(keys);
    const gone = animateExit
      ? occurrenceKeys(previous).flatMap((key, index) =>
          present.has(key) ? [] : [{ key, tag: previous[index] ?? "", index }],
        )
      : [];
    setSettled((current) => new Set([...current].filter((key) => present.has(key))));
    setLeaving((current) => [
      ...current.filter(
        (entry) => !present.has(entry.key) && !gone.some((g) => g.key === entry.key),
      ),
      ...gone,
    ]);
  }

  useEffect(() => {
    if (leaving.length === 0) return;
    const timer = setTimeout(() => {
      setLeaving([]);
    }, EXIT_FALLBACK_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [leaving]);

  // A native listener: React maps onAnimationEnd to a vendor-prefixed name
  // wherever AnimationEvent is missing. React 19 runs the returned cleanup.
  const listenForExitEnd = useCallback(
    (key: string) => (element: HTMLLIElement | null) => {
      if (!element) return;
      const onEnd = (event: Event) => {
        if (event.target !== element) return;
        setLeaving((current) => current.filter((entry) => entry.key !== key));
      };
      element.addEventListener("animationend", onEnd);
      return () => {
        element.removeEventListener("animationend", onEnd);
      };
    },
    [],
  );

  // Live tags in order, with departing ones slotted back where they stood.
  const rendered: (LeavingTag & { gone: boolean })[] = value.map((tag, index) => ({
    key: keys[index] ?? tag,
    tag,
    index,
    gone: false,
  }));
  for (const entry of [...leaving].sort((a, b) => a.index - b.index)) {
    rendered.splice(Math.min(entry.index, rendered.length), 0, { ...entry, gone: true });
  }

  function reasonFor(tag: string): string | null {
    if (!validate) return null;
    const result = validate(tag, value);
    return result === true ? null : result;
  }

  /** Adds tags, reporting anything refused rather than dropping it in silence. */
  function commit(candidates: string[]) {
    const accepted: string[] = [];
    const refused: string[] = [];

    // Split defensively rather than trusting the caller. A draft can arrive
    // holding a delimiter from autofill, an IME commit, or a programmatic set,
    // and a token with a comma inside it is never what was meant.
    for (const candidate of candidates.flatMap((part) => splitOn(part, delimiters))) {
      const tag = candidate.trim();
      if (tag.length === 0) continue;

      if (!allowDuplicates && [...value, ...accepted].includes(tag)) {
        refused.push(`${tag} is already added`);
        continue;
      }
      if (max !== undefined && value.length + accepted.length >= max) {
        refused.push(`${tag} not added, limit of ${String(max)} reached`);
        continue;
      }
      // An invalid tag is still added. It is the reader's text and they need to
      // see it to fix it; refusing silently is how these fields lose input.
      accepted.push(tag);
    }

    if (accepted.length > 0) onValueChange([...value, ...accepted]);

    const parts: string[] = [];
    if (accepted.length > 0) {
      const invalid = accepted.filter((tag) => reasonFor(tag) !== null);
      parts.push(`Added ${accepted.join(", ")}`);
      if (invalid.length > 0) parts.push(`${String(invalid.length)} need attention`);
    }
    parts.push(...refused);
    setAnnouncement(parts.join(". "));
  }

  function removeAt(index: number) {
    const removed = value[index];
    onValueChange(value.filter((_, position) => position !== index));
    setAnnouncement(removed === undefined ? "" : `Removed ${removed}`);
    inputRef.current?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      // Never let a token commit submit the form as well.
      event.preventDefault();
      if (draft.trim().length > 0) {
        commit([draft]);
        setDraft("");
      }
      return;
    }

    if (delimiters.includes(event.key)) {
      event.preventDefault();
      if (draft.trim().length > 0) {
        commit([draft]);
        setDraft("");
      }
      return;
    }

    // Backspace on an empty field removes the last token — the expected
    // shortcut, and the only way to correct without reaching for the mouse.
    if (event.key === "Backspace" && draft.length === 0 && value.length > 0) {
      event.preventDefault();
      removeAt(value.length - 1);
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    const text = event.clipboardData.getData("text");
    const parts = splitOn(text, delimiters);
    // Only intercept a paste that actually contains several tags; a single
    // value should behave like an ordinary paste and stay editable.
    if (parts.length <= 1) return;

    event.preventDefault();
    commit(parts);
    setDraft("");
  }

  return (
    <div data-slot="tags-input" className={cn("flex flex-col gap-1.5", className)} {...props}>
      <style href="dowel-tags-input" precedence="dowel">
        {TAG_KEYFRAMES}
      </style>
      <label id={labelId} htmlFor={inputId} className="w-fit text-sm font-medium">
        {label}
      </label>

      {/* A group rather than a listbox: these are committed values, not options
          being chosen from, and calling it a listbox would promise navigation
          semantics that do not exist here. */}
      <div
        role="group"
        aria-labelledby={labelId}
        data-disabled={disabled || undefined}
        className={cn(
          "flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-2 py-1.5",
          "focus-within:ring-2 focus-within:ring-ring/55",
          disabled && "pointer-events-none opacity-55",
        )}
      >
        {rendered.length > 0 ? (
          <ul className="contents">
            {rendered.map(({ key, tag, index, gone }) => {
              const reason = reasonFor(tag);
              return (
                <li
                  key={gone ? `gone:${key}` : key}
                  ref={gone ? listenForExitEnd(key) : undefined}
                  data-slot="tags-input-tag"
                  data-invalid={reason !== null || undefined}
                  data-enter={(!gone && !settled.has(key)) || undefined}
                  data-state={gone ? "closed" : undefined}
                  aria-hidden={gone || undefined}
                  inert={gone || undefined}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
                    reason === null
                      ? "border-transparent bg-secondary text-secondary-foreground"
                      : "border-destructive/40 bg-destructive/10 text-destructive",
                  )}
                >
                  {tag}
                  {/* The reason travels with the token, so it is announced when
                      the token is, rather than as a detached error elsewhere. */}
                  {reason === null ? null : (
                    <span className="sr-only">, invalid: {reason}</span>
                  )}
                  <button
                    type="button"
                    data-slot="tags-input-remove"
                    disabled={disabled}
                    aria-label={`Remove ${tag}`}
                    onClick={() => {
                      removeAt(index);
                    }}
                    className={cn(
                      "-me-0.5 grid size-4 place-items-center rounded-full",
                      "transition-[background-color,scale] duration-[var(--duration-fast)] ease-[var(--ease-out-quint)]",
                      "hover:bg-foreground/10 active:scale-90",
                      focusRing,
                      disabledStyles,
                    )}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-2.5">
                      <path
                        d="M6 6l12 12M18 6L6 18"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}

        <input
          ref={inputRef}
          type="text"
          id={inputId}
          data-slot="tags-input-field"
          value={draft}
          disabled={disabled}
          placeholder={value.length === 0 ? placeholder : undefined}
          aria-describedby={hintId}
          onChange={(event) => {
            setDraft(event.target.value);
          }}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onBlur={() => {
            // Committing on blur stops a typed-but-uncommitted value being lost
            // when the reader tabs away thinking they are done.
            if (draft.trim().length > 0) {
              commit([draft]);
              setDraft("");
            }
          }}
          className={cn(
            "min-w-24 flex-1 self-stretch bg-transparent text-sm outline-none",
            "placeholder:text-muted-foreground",
          )}
          {...inputProps}
        />
      </div>

      <span id={hintId} className="text-xs text-muted-foreground">
        {atLimit
          ? `Limit of ${String(max ?? 0)} reached`
          : `Press Enter${delimiters.length > 0 ? ` or ${delimiters.join(" ")}` : ""} to add`}
      </span>

      {/* Additions, removals and refusals all land here. A refusal that is only
          visible as "nothing happened" is the failure this component exists to
          avoid. */}
      <span aria-live="polite" className="sr-only">
        {announcement}
      </span>
    </div>
  );
}
