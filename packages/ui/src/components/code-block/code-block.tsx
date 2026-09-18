"use client";

import { useRef, type ComponentPropsWithRef } from "react";

import { CopyButton } from "@/components/copy-button";
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
            <CopyButton
              value={() => code ?? preRef.current?.textContent ?? ""}
              variant="ghost"
              aria-label="Copy code"
              className={cn(
                "ms-auto size-6 rounded text-muted-foreground hover:text-foreground",
                "[&_svg:not([class*='size-'])]:size-3.5",
              )}
            />
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
