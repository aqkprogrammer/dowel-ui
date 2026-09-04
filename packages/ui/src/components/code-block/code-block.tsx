"use client";

import { useCallback, useEffect, useRef, useState, type ComponentPropsWithRef } from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/**
 * A block of code, with a copy control.
 *
 * Syntax highlighting is deliberately not built in. A highlighter is a large
 * dependency, a theme system of its own, and a choice between build-time and
 * runtime that belongs to the application. Pass already-highlighted markup as
 * children and the styling here applies to it; pass a plain string and it
 * renders as plain code.
 */

export interface CodeBlockProps extends ComponentPropsWithRef<"div"> {
  /** Shown in the header and used as the language hint. */
  language?: string;
  /** Filename or other caption for the header. */
  title?: string;
  /**
   * The text the copy button puts on the clipboard.
   *
   * Required when children are rendered markup, because reading text back out
   * of highlighted DOM loses whitespace in ways that break pasted code.
   */
  code?: string;
  /** Hides the copy control. */
  hideCopy?: boolean;
}

export function CodeBlock({
  className,
  language,
  title,
  code,
  hideCopy,
  children,
  ...props
}: CodeBlockProps) {
  const preRef = useRef<HTMLPreElement | null>(null);
  const showHeader = Boolean(title ?? language) || !hideCopy;

  return (
    <div
      data-slot="code-block"
      data-language={language}
      className={cn("overflow-hidden rounded-lg border border-border bg-muted/40", className)}
      {...props}
    >
      {showHeader ? (
        <div className="flex items-center gap-2 border-b border-border px-3 py-1.5">
          <span className="truncate text-2xs font-medium text-muted-foreground">
            {title ?? language}
          </span>
          {hideCopy ? null : (
            <CopyButton getText={() => code ?? preRef.current?.textContent ?? ""} />
          )}
        </div>
      ) : null}
      <pre
        ref={preRef}
        // Focusable named region: code overflows horizontally, and a scroll box
        // that cannot take focus is unreachable by keyboard.
        tabIndex={0}
        role="region"
        aria-label={title ?? (language ? `${language} code` : "Code")}
        className={cn(
          "overflow-x-auto p-3 font-mono text-xs leading-relaxed",
          focusRing,
          "focus-visible:ring-inset",
        )}
      >
        <code>{children}</code>
      </pre>
    </div>
  );
}

export interface CopyButtonProps extends Omit<ComponentPropsWithRef<"button">, "onClick"> {
  getText: () => string;
  label?: string;
  copiedLabel?: string;
  /** How long the confirmation stays, in milliseconds. */
  resetAfter?: number;
}

/**
 * Copies text and confirms it.
 *
 * The confirmation is announced politely as well as shown — a checkmark that
 * only appears visually leaves a screen reader user with no idea whether the
 * button did anything. Failure is surfaced too, rather than silently looking
 * like success, since the clipboard API can be refused outright.
 */
export function CopyButton({
  className,
  getText,
  label = "Copy code",
  copiedLabel = "Copied",
  resetAfter = 2000,
  ...props
}: CopyButtonProps) {
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const copy = useCallback(() => {
    const reset = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        setState("idle");
      }, resetAfter);
    };

    navigator.clipboard.writeText(getText()).then(
      () => {
        setState("copied");
        reset();
      },
      () => {
        // Refused by the browser or unavailable outside a secure context.
        // Saying so beats pretending it worked.
        setState("error");
        reset();
      },
    );
  }, [getText, resetAfter]);

  return (
    <button
      type="button"
      data-slot="copy-button"
      data-state={state}
      onClick={copy}
      aria-label={label}
      className={cn(
        "ms-auto grid size-6 shrink-0 place-items-center rounded text-muted-foreground",
        "transition-colors duration-[var(--duration-fast)] hover:bg-accent hover:text-foreground",
        focusRing,
        className,
      )}
      {...props}
    >
      {state === "copied" ? (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-3.5">
          <path
            d="m5 13 4 4L19 7"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-3.5">
          <rect
            x="9"
            y="9"
            width="12"
            height="12"
            rx="2"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      )}
      {/* Announced, not just drawn. */}
      <span role="status" aria-live="polite" className="sr-only">
        {state === "copied" ? copiedLabel : state === "error" ? "Copy failed" : ""}
      </span>
    </button>
  );
}
