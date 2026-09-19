"use client";

// Ported from SmoothUI Button Copy (MIT, © 2024 Eduardo Calvo) and amicro "Copy Hash" (MIT, © 2026 Syed Subhan Uddin). See THIRD_PARTY_NOTICES.md.
import { cva, type VariantProps } from "class-variance-authority";
import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";

import { Button, type ButtonProps } from "@/components/button";
import { cn } from "@/lib/utils";

/*
 * The sources swap the icon on hover (amicro) or after a fake one-second
 * "loading" delay (SmoothUI). Here the swap reports what actually happened: it
 * morphs only once the clipboard write has resolved, and a refused write never
 * shows the check.
 *
 * Both icons, and both labels, share one grid cell. The button is always as
 * wide as its longer label, so "Copy" becoming "Copied" does not shove its
 * neighbours sideways, and the morph is a pure opacity/scale transition.
 */

const copyButtonVariants = cva("", {
  variants: {
    /** Colour of the confirmation icon. The label keeps the button's colour. */
    tone: {
      current: "",
      primary: "text-primary",
      success: "text-success",
      warning: "text-warning",
      destructive: "text-destructive",
      info: "text-info",
    },
  },
  defaultVariants: {
    tone: "current",
  },
});

const layer = cn(
  "col-start-1 row-start-1 inline-flex items-center justify-center",
  "transition-[opacity,scale] duration-[var(--duration-normal)] ease-[var(--ease-overshoot)]",
);
const shown = "scale-100 opacity-100";
const hidden = "scale-50 opacity-0";

function CopyIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="8" y="8" width="14" height="14" rx="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export type CopyButtonState = "idle" | "copied" | "error";

interface CopyButtonBaseProps
  extends Omit<ButtonProps, "value" | "asChild">, VariantProps<typeof copyButtonVariants> {
  /**
   * What goes on the clipboard. Pass a function to read it at the moment of
   * the click — the current contents of an editor, say — rather than at render.
   * Required unless the deprecated `getText` is given.
   */
  value?: string | (() => string);
  /**
   * Replaces the label while the confirmation shows. On an icon-only button a
   * string `copiedLabel` is announced instead, as Code Block's original did.
   */
  copiedLabel?: ReactNode;
  /**
   * Announced to assistive technology on success. Defaults to "Copied", or to
   * a string `copiedLabel` on an icon-only button, where it is never shown.
   */
  copiedAnnouncement?: string;
  /** Announced to assistive technology when the clipboard refuses the write. */
  errorAnnouncement?: string;
  /**
   * How long the confirmation stays, in milliseconds (default 2000). A
   * behaviour timer, not a duration.
   */
  timeout?: number;
  /** The resting icon. Defaults to a copy glyph. */
  icon?: ReactNode;
  /** The confirmation icon. Defaults to a check. */
  copiedIcon?: ReactNode;
  /** Called with the copied text once the clipboard write has resolved. */
  onCopied?: (text: string) => void;
  /** Called when the clipboard is unavailable or refuses the write. */
  onCopyError?: (error: unknown) => void;
  /**
   * Reads the text to copy at the moment of the click.
   *
   * @deprecated Use `value`, which also takes a function: `value={() => text}`.
   */
  getText?: () => string;
  /**
   * The accessible name of an icon-only button.
   *
   * @deprecated Use `aria-label`, or pass a visible label as children.
   */
  label?: string;
  /**
   * How long the confirmation stays, in milliseconds.
   *
   * @deprecated Use `timeout`.
   */
  resetAfter?: number;
}

/**
 * Props for {@link CopyButton}. One source of text is required: `value`, or
 * the deprecated `getText` kept from Code Block's original copy button.
 */
export type CopyButtonProps = CopyButtonBaseProps &
  ({ value: string | (() => string) } | { getText: () => string });

/**
 * Copies a value to the clipboard and confirms it.
 *
 * The confirmation is state, not decoration: the icon morphs to a check, the
 * label (if any) becomes `copiedLabel`, and a polite live region announces it,
 * then everything reverts after `timeout`. A refused write reports through
 * `onCopyError` and the error announcement — never the check.
 */
export function CopyButton({
  className,
  value,
  getText,
  label,
  resetAfter,
  children,
  copiedLabel = "Copied",
  copiedAnnouncement,
  errorAnnouncement = "Copy failed",
  timeout,
  icon,
  copiedIcon,
  tone,
  variant = "outline",
  size,
  onClick,
  onCopied,
  onCopyError,
  "aria-label": ariaLabel,
  ...props
}: CopyButtonProps) {
  const [state, setState] = useState<CopyButtonState>("idle");
  const duration = timeout ?? resetAfter ?? 2000;
  const source = value ?? getText;

  const missingSource = source === undefined;
  useEffect(() => {
    if (process.env.NODE_ENV === "production" || !missingSource) return;
    // The type requires one; this catches untyped callers before a click
    // reports a failure with no obvious cause.
    console.warn("CopyButton: pass `value` so there is something to copy.");
  }, [missingSource]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const settle = (next: CopyButtonState) => {
    setState(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setState("idle");
    }, duration);
  };

  async function copy() {
    try {
      if (source === undefined) throw new Error("CopyButton has no `value` to copy.");
      const text = typeof source === "function" ? source() : source;
      // Called synchronously within the click, so the user activation that
      // Safari requires for clipboard access is still live.
      await navigator.clipboard.writeText(text);
      settle("copied");
      onCopied?.(text);
    } catch (error) {
      // Refused, or no clipboard API outside a secure context. Saying so
      // beats pretending it worked.
      settle("error");
      onCopyError?.(error);
    }
  }

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    onClick?.(event);
    if (event.defaultPrevented) return;
    void copy();
  }

  const copied = state === "copied";
  const hasLabel = children !== undefined && children !== null && children !== false;
  // An icon-only button never shows copiedLabel, and Code Block's original
  // copy button announced it, so a string one is what gets announced there.
  const announcement =
    copiedAnnouncement ??
    (!hasLabel && typeof copiedLabel === "string" ? copiedLabel : "Copied");

  return (
    <>
      <Button
        data-slot="copy-button"
        data-state={state}
        variant={variant}
        size={size ?? (hasLabel ? "md" : "icon")}
        aria-label={ariaLabel ?? (hasLabel ? undefined : (label ?? "Copy"))}
        className={className}
        onClick={handleClick}
        {...props}
      >
        <span data-slot="copy-button-icon" className="grid">
          <span aria-hidden="true" className={cn(layer, copied ? hidden : shown)}>
            {icon ?? <CopyIcon />}
          </span>
          <span
            aria-hidden="true"
            className={cn(layer, copyButtonVariants({ tone }), copied ? shown : hidden)}
          >
            {copiedIcon ?? <CheckIcon />}
          </span>
        </span>
        {hasLabel ? (
          <span data-slot="copy-button-label" className="grid">
            <span
              aria-hidden={copied || undefined}
              className={cn(layer, copied ? hidden : shown)}
            >
              {children}
            </span>
            <span
              aria-hidden={!copied || undefined}
              className={cn(layer, copied ? shown : hidden)}
            >
              {copiedLabel}
            </span>
          </span>
        ) : null}
      </Button>
      {/* A sibling rather than a child, so the announcement never becomes part
          of the button's accessible name. */}
      <span role="status" aria-live="polite" className="sr-only">
        {copied ? announcement : state === "error" ? errorAnnouncement : ""}
      </span>
    </>
  );
}

export { copyButtonVariants };
