"use client";

import type { ComponentPropsWithRef } from "react";

import { cn } from "@/lib/utils";

/**
 * The text of an assistant response.
 *
 * Renders plain text with paragraph whitespace preserved. Markdown is
 * deliberately not parsed here: a Markdown renderer is a dependency, a security
 * decision about raw HTML, and a styling surface all at once, and every product
 * makes those differently. Pass already-rendered content as children when you
 * need it — the prose styling below applies either way.
 *
 * Not a live region, and not by omission. See the note on `Conversation`:
 * announcing streamed text token by token is unusable with a screen reader.
 */
export interface ResponseProps extends ComponentPropsWithRef<"div"> {
  /** Shows the caret. Purely visual — it carries no announcement. */
  streaming?: boolean;
}

export function Response({ className, streaming, children, ...props }: ResponseProps) {
  return (
    <div
      data-slot="response"
      data-streaming={streaming || undefined}
      className={cn(
        "text-sm leading-relaxed whitespace-pre-wrap text-foreground",
        // Minimal prose styling for consumers who pass rendered Markdown.
        "[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4",
        "[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.9em]",
        "[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:ps-5 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:ps-5",
        "[&_p+p]:mt-3",
        className,
      )}
      {...props}
    >
      {children}
      {streaming ? <ResponseCaret /> : null}
    </div>
  );
}

/** The trailing cursor. Decorative — the streaming state is announced, if at
 * all, through ConversationStatus. */
export function ResponseCaret({ className, ...props }: ComponentPropsWithRef<"span">) {
  return (
    <span
      data-slot="response-caret"
      aria-hidden="true"
      data-motion="indicator"
      className={cn(
        "ms-0.5 inline-block h-[1em] w-[2px] translate-y-[0.15em] animate-caret bg-current align-baseline",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Shown while waiting for the first token.
 *
 * A distinct state from streaming: nothing has arrived yet, so there is no text
 * to show a caret after. Labelled for assistive technology because, unlike the
 * caret, this is the only thing on screen.
 */
export interface ThinkingIndicatorProps extends ComponentPropsWithRef<"div"> {
  label?: string;
}

export function ThinkingIndicator({
  className,
  label = "Thinking",
  ...props
}: ThinkingIndicatorProps) {
  return (
    <div
      data-slot="thinking-indicator"
      className={cn("flex items-center gap-1.5 text-sm text-muted-foreground", className)}
      {...props}
    >
      <span className="sr-only">{label}</span>
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          aria-hidden="true"
          className="size-1.5 animate-pulse-soft rounded-full bg-current"
          style={{ animationDelay: `${String(index * 160)}ms` }}
        />
      ))}
    </div>
  );
}
