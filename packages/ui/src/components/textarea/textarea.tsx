"use client";

import { cva, type VariantProps } from "class-variance-authority";
import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ComponentPropsWithRef,
} from "react";

import { focusRingInset, invalidStyles } from "@/lib/styles";
import { cn } from "@/lib/utils";

const textareaVariants = cva(
  cn(
    "block w-full min-w-0 rounded-md border border-input bg-background text-foreground shadow-xs",
    "transition-[border-color,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-out-quint)]",
    "placeholder:text-muted-foreground",
    "focus-visible:border-ring",
    "disabled:cursor-not-allowed disabled:opacity-55",
    focusRingInset,
    invalidStyles,
  ),
  {
    variants: {
      textareaSize: {
        sm: "px-2.5 py-1.5 text-sm",
        md: "px-3 py-2 text-sm",
        lg: "px-3.5 py-2.5 text-base",
      },
      /**
       * Vertical only by default.
       *
       * The browser default is `both`, and a textarea dragged wider than its
       * container is a layout broken by a control that was only meant to be
       * made taller.
       */
      resize: {
        none: "resize-none",
        vertical: "resize-y",
        both: "resize",
      },
    },
    defaultVariants: {
      textareaSize: "md",
      resize: "vertical",
    },
  },
);

export interface TextareaProps
  extends
    Omit<ComponentPropsWithRef<"textarea">, "cols">,
    VariantProps<typeof textareaVariants> {
  /**
   * Grows with its content instead of scrolling, up to `maxRows`.
   *
   * Off by default. A field that changes height as you type moves everything
   * below it, which is the right trade for a comment box and the wrong one for
   * a form of twelve fields.
   */
  autoResize?: boolean;
  /** Ceiling for `autoResize`, after which it scrolls. */
  maxRows?: number;
  /**
   * Shows a live character count.
   *
   * Needs `maxLength` to have anything to count against.
   */
  showCount?: boolean;
}

/**
 * Multi-line text field.
 *
 * The visual size prop is `textareaSize`, not `size`, for the same reason
 * Input's is `inputSize`: `size` is a native attribute on form controls, and a
 * prop of that name shadows it.
 *
 * The character count is where this differs from most. A counter wired as a
 * live region announces on every keystroke, which is unusable — a screen
 * reader reads "one hundred and forty-one characters remaining" between every
 * letter. So the count is silent while there is room and only announces once
 * it is nearly gone, which is the point at which it is information rather than
 * chatter.
 */
export function Textarea({
  className,
  textareaSize,
  resize,
  autoResize = false,
  maxRows = 12,
  showCount = false,
  rows = 3,
  maxLength,
  value,
  defaultValue,
  onChange,
  id,
  "aria-describedby": describedBy,
  ref,
  ...props
}: TextareaProps) {
  const internalRef = useRef<HTMLTextAreaElement | null>(null);
  const generatedId = useId();
  const countId = `${id ?? generatedId}-count`;

  const counted = showCount && maxLength !== undefined;

  /**
   * Both refs, without a library.
   *
   * React 19 passes `ref` as an ordinary prop, so it arrives here and has to be
   * forwarded on deliberately. Auto-resize needs the element too, and silently
   * dropping the caller's ref would break every form library that reaches for
   * the node.
   */
  const setRef = (node: HTMLTextAreaElement | null) => {
    internalRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) (ref as { current: HTMLTextAreaElement | null }).current = node;
  };

  // Measured after layout, so the height is right on the first paint rather
  // than one frame late and visibly settling.
  useLayoutEffect(() => {
    const textarea = internalRef.current;
    if (!textarea || !autoResize) return;

    textarea.style.height = "auto";
    const lineHeight = Number.parseFloat(getComputedStyle(textarea).lineHeight) || 20;
    const maxHeight = lineHeight * maxRows;
    textarea.style.height = `${String(Math.min(textarea.scrollHeight, maxHeight))}px`;
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? "auto" : "hidden";
  });

  /**
   * The length, for the count.
   *
   * Held in state for the uncontrolled case rather than read off the element
   * during render. Reading the ref looks simpler and does not work: nothing
   * re-renders when an uncontrolled field is typed into, so the count would
   * show whatever it happened to say on first paint and never move again.
   */
  const [uncontrolledLength, setUncontrolledLength] = useState(
    typeof defaultValue === "string" ? defaultValue.length : 0,
  );

  const length = typeof value === "string" ? value.length : uncontrolledLength;

  const remaining = maxLength === undefined ? undefined : maxLength - length;
  // Announce only when it starts to matter: a tenth of the budget, or twenty
  // characters, whichever is larger.
  const announceAt = maxLength === undefined ? 0 : Math.max(20, Math.floor(maxLength / 10));
  const nearLimit = remaining !== undefined && remaining <= announceAt;

  function handleChange(event: ChangeEvent<HTMLTextAreaElement>) {
    if (value === undefined) setUncontrolledLength(event.target.value.length);
    onChange?.(event);
  }

  return (
    <div className={cn("grid gap-1.5", counted && "w-full")}>
      <textarea
        ref={setRef}
        id={id ?? (counted ? generatedId : undefined)}
        data-slot="textarea"
        rows={rows}
        maxLength={maxLength}
        value={value}
        defaultValue={defaultValue}
        onChange={handleChange}
        aria-describedby={cn(describedBy, counted && countId) || undefined}
        className={cn(
          textareaVariants({ textareaSize, resize: autoResize ? "none" : resize }),
          className,
        )}
        {...props}
      />

      {counted ? (
        <p
          id={countId}
          data-slot="textarea-count"
          // Polite only once it matters. Left permanently live it reads the
          // count between every keystroke, which is noise, not help.
          aria-live={nearLimit ? "polite" : "off"}
          className={cn(
            "text-xs tabular-nums",
            remaining !== undefined && remaining < 0
              ? "text-destructive"
              : nearLimit
                ? "text-warning"
                : "text-muted-foreground",
          )}
        >
          {/* Words, not "141/200": a bare ratio is read aloud as two numbers
              with no indication of which is which. */}
          {remaining !== undefined && remaining < 0
            ? `${String(Math.abs(remaining))} characters over the limit`
            : `${String(remaining ?? 0)} characters left`}
        </p>
      ) : null}
    </div>
  );
}

export { textareaVariants };
