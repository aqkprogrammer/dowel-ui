/**
 * The painted copy of the field's text: every token in its colour, and the
 * error's range underlined. Pure, so what the editor draws can be tested
 * without a browser that lays text out.
 */

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import type { ExpressionToken, ExpressionTokenType } from "./expression";

type Range = { start: number; end: number };

const TOKEN_CLASS: Partial<Record<ExpressionTokenType, string>> = {
  number: "text-info",
  boolean: "text-warning",
  string: "text-success",
  function: "text-primary",
  identifier: "text-foreground",
  operator: "text-muted-foreground",
  paren: "text-muted-foreground",
  comma: "text-muted-foreground",
  error: "text-destructive",
};

// Wavy, so the error is visible without its colour.
const ERROR_CLASS =
  "underline decoration-destructive decoration-wavy decoration-1 underline-offset-4 [text-decoration-skip-ink:none]";

/** An error's range on screen: clamped, and never empty, so there is something to underline. */
export function visibleRange(range: Range, length: number): Range | null {
  let start = Math.min(Math.max(range.start, 0), length);
  let end = Math.min(Math.max(range.end, start), length);
  if (end === start) {
    if (end < length) end += 1;
    else if (start > 0) start -= 1;
  }
  return end > start ? { start, end } : null;
}

/**
 * The highlight layer's content: every token, cut where the error range and
 * the suggestion anchor fall inside one.
 */
export function paint(
  text: string,
  tokens: ExpressionToken[],
  error: Range | null,
  anchorAt: number | null,
  anchor: ReactNode,
): ReactNode[] {
  const out: ReactNode[] = [];
  let anchored = anchorAt === null;

  for (const token of tokens) {
    const cuts = new Set([token.start, token.end]);
    for (const at of [error?.start, error?.end, anchorAt]) {
      if (typeof at === "number" && at > token.start && at < token.end) cuts.add(at);
    }
    const points = [...cuts].sort((a, b) => a - b);
    for (let i = 0; i < points.length - 1; i += 1) {
      const from = points[i] ?? 0;
      const to = points[i + 1] ?? from;
      if (!anchored && from === anchorAt) {
        out.push(anchor);
        anchored = true;
      }
      const wrong = error !== null && from >= error.start && to <= error.end;
      const className = cn(TOKEN_CLASS[token.type], wrong && ERROR_CLASS);
      out.push(
        className ? (
          <span
            key={from}
            data-token={token.type}
            data-invalid={wrong || undefined}
            className={className}
          >
            {text.slice(from, to)}
          </span>
        ) : (
          text.slice(from, to)
        ),
      );
    }
  }
  if (!anchored) out.push(anchor);
  return out;
}
