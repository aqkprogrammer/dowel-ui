"use client";

import { useCallback, useMemo, useState } from "react";

/**
 * Filtering and match-finding for a log stream.
 *
 * Separate from the view because it is pure and worth testing without a DOM,
 * and because the awkward parts are here rather than in the rendering: a bad
 * regex must not throw while someone is halfway through typing it, and a match
 * has to be located precisely enough to highlight rather than merely detected.
 */

export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

export const LOG_LEVELS: readonly LogLevel[] = [
  "trace",
  "debug",
  "info",
  "warn",
  "error",
  "fatal",
];

export interface LogLine {
  id: string;
  message: string;
  level?: LogLevel;
  /** ISO timestamp, or anything the consumer wants shown in the gutter. */
  timestamp?: string;
  /** Structured fields, revealed when the row is expanded. */
  fields?: Record<string, unknown>;
}

/** A [start, end) slice of a message that matched the filter. */
export type MatchRange = readonly [number, number];

export interface FilterState {
  /** Substring, or a pattern when `regex` is on. */
  query: string;
  regex: boolean;
  /** Levels to show. Empty means all of them. */
  levels: Set<LogLevel>;
}

/**
 * Compiles the query.
 *
 * Returns null for an invalid pattern rather than throwing: the query is being
 * typed, so it spends most of its life syntactically incomplete, and a viewer
 * that crashes on "(" is unusable.
 */
export function compileQuery(query: string, regex: boolean): RegExp | null {
  if (query.length === 0) return null;
  try {
    return regex
      ? new RegExp(query, "gi")
      : new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
  } catch {
    return null;
  }
}

/** Every match in a line, so each can be highlighted rather than just the first. */
export function findMatches(message: string, pattern: RegExp | null): MatchRange[] {
  if (!pattern) return [];

  const ranges: MatchRange[] = [];
  // Fresh lastIndex: the pattern is reused across lines and a global regex
  // carries position between calls, which would skip matches in later lines.
  pattern.lastIndex = 0;

  let match = pattern.exec(message);
  while (match !== null) {
    // A pattern that can match empty — "a*" — would loop forever otherwise.
    if (match[0].length === 0) {
      pattern.lastIndex += 1;
    } else {
      ranges.push([match.index, match.index + match[0].length]);
    }
    match = pattern.exec(message);
  }

  return ranges;
}

/** Splits a message into alternating plain and matched segments. */
export function segment(
  message: string,
  ranges: MatchRange[],
): { text: string; match: boolean }[] {
  if (ranges.length === 0) return [{ text: message, match: false }];

  const parts: { text: string; match: boolean }[] = [];
  let cursor = 0;

  for (const [start, end] of ranges) {
    if (start > cursor) parts.push({ text: message.slice(cursor, start), match: false });
    parts.push({ text: message.slice(start, end), match: true });
    cursor = end;
  }
  if (cursor < message.length) parts.push({ text: message.slice(cursor), match: false });

  return parts;
}

export interface VisibleLine extends LogLine {
  matches: MatchRange[];
}

export interface UseLogStreamOptions {
  lines: LogLine[];
  /** Levels present but unchecked are hidden. Empty shows everything. */
  initialLevels?: Set<LogLevel>;
}

export function useLogStream({ lines, initialLevels }: UseLogStreamOptions) {
  const [query, setQuery] = useState("");
  const [regex, setRegex] = useState(false);
  const [levels, setLevels] = useState<Set<LogLevel>>(initialLevels ?? new Set());

  const pattern = useMemo(() => compileQuery(query, regex), [query, regex]);

  // An invalid pattern is reported, not swallowed: with no feedback the reader
  // sees an empty log and concludes nothing matched.
  const invalidPattern = regex && query.length > 0 && pattern === null;

  const visible = useMemo<VisibleLine[]>(() => {
    const result: VisibleLine[] = [];

    for (const line of lines) {
      if (levels.size > 0 && line.level && !levels.has(line.level)) continue;

      const matches = findMatches(line.message, pattern);
      // A query with no match hides the line; an invalid pattern hides nothing,
      // because the reader has not finished saying what they want yet.
      if (pattern && matches.length === 0) continue;

      result.push({ ...line, matches });
    }

    return result;
  }, [lines, levels, pattern]);

  const counts = useMemo(() => {
    const byLevel = new Map<LogLevel, number>();
    for (const line of lines) {
      if (!line.level) continue;
      byLevel.set(line.level, (byLevel.get(line.level) ?? 0) + 1);
    }
    return byLevel;
  }, [lines]);

  const toggleLevel = useCallback((level: LogLevel) => {
    setLevels((current) => {
      const next = new Set(current);
      if (next.has(level)) next.delete(level);
      else next.add(level);
      return next;
    });
  }, []);

  return {
    query,
    setQuery,
    regex,
    setRegex,
    levels,
    toggleLevel,
    setLevels,
    visible,
    counts,
    invalidPattern,
    total: lines.length,
  };
}
