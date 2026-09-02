import { diffLines, diffWordsWithSpace } from "diff";

/**
 * Turning two versions of a file into rows a diff can render.
 *
 * The algorithm is not the interesting part and is not reimplemented here —
 * jsdiff does Myers properly, is BSD-licensed, has no dependencies of its own,
 * and getting an O(ND) diff subtly wrong is a poor use of anybody's afternoon.
 * What every packaged *viewer* welds on is a styling strategy: emotion in
 * react-diff-viewer-continued, HTML strings and a stylesheet in diff2html. That
 * is what cannot be reached by design tokens, and it is why this exists.
 *
 * Everything below is pure, so the grouping, the context collapsing and the
 * word-level pairing can be tested without rendering anything.
 */

export type RowKind = "context" | "added" | "removed";

export interface WordSegment {
  text: string;
  changed: boolean;
}

export interface DiffRow {
  kind: RowKind;
  /** 1-based line number in the original. Absent on an added line. */
  before?: number;
  /** 1-based line number in the result. Absent on a removed line. */
  after?: number;
  content: string;
  /**
   * Word-level split, present only where a removed line pairs with an added
   * one. Without a pair there is nothing to compare against, and highlighting
   * the whole line as "changed" would be noise.
   */
  segments?: WordSegment[];
}

export interface DiffHunk {
  id: string;
  rows: DiffRow[];
  /** Context lines hidden before this hunk, if any. */
  skippedBefore: number;
}

export interface BuildDiffOptions {
  /** Unchanged lines kept either side of a change. */
  context?: number;
  /**
   * Compare word by word inside a changed line. Off for very large diffs,
   * where the extra pass costs more than it explains.
   */
  words?: boolean;
}

function splitLines(text: string): string[] {
  const lines = text.split("\n");
  // A trailing newline produces a final empty element that is not a line.
  if (lines.length > 1 && lines[lines.length - 1] === "") lines.pop();
  return lines;
}

/**
 * Gives both sides a trailing newline before they are compared.
 *
 * jsdiff's line tokens carry their own newline, so a final line written as `a`
 * and one written as `a\n` are different tokens. Appending a line to a file
 * that did not end in a newline would otherwise be reported as the last line
 * being removed and re-added — a change the author did not make, sitting on
 * top of the one they did.
 */
function withTrailingNewline(text: string): string {
  return text.endsWith("\n") ? text : `${text}\n`;
}

/**
 * Pairs removed lines with added ones inside a single change block.
 *
 * jsdiff reports a change as a run of removals followed by a run of additions.
 * Comparing the first removal against the first addition is what turns "this
 * line went away and another arrived" into "this word changed" — but only while
 * the runs line up. Beyond the shorter run there is no counterpart, and
 * inventing one produces confident nonsense.
 */
function pairWords(removed: DiffRow[], added: DiffRow[]): void {
  const pairs = Math.min(removed.length, added.length);

  for (let index = 0; index < pairs; index += 1) {
    const from = removed[index];
    const to = added[index];
    if (!from || !to) continue;

    const parts = diffWordsWithSpace(from.content, to.content);

    from.segments = parts
      .filter((part) => !part.added)
      .map((part) => ({ text: part.value, changed: Boolean(part.removed) }));

    to.segments = parts
      .filter((part) => !part.removed)
      .map((part) => ({ text: part.value, changed: Boolean(part.added) }));
  }
}

export function buildDiff(
  before: string,
  after: string,
  options: BuildDiffOptions = {},
): DiffHunk[] {
  const { context = 3, words = true } = options;

  const changes = diffLines(withTrailingNewline(before), withTrailingNewline(after));
  const rows: DiffRow[] = [];
  let beforeLine = 1;
  let afterLine = 1;

  // Flat rows first. Grouping into hunks is a separate concern and mixing the
  // two is how these implementations become unreadable.
  let pendingRemoved: DiffRow[] = [];
  let pendingAdded: DiffRow[] = [];

  const flushPair = () => {
    if (words && pendingRemoved.length > 0 && pendingAdded.length > 0) {
      pairWords(pendingRemoved, pendingAdded);
    }
    pendingRemoved = [];
    pendingAdded = [];
  };

  for (const change of changes) {
    const lines = splitLines(change.value);

    if (change.added) {
      for (const content of lines) {
        const row: DiffRow = { kind: "added", after: afterLine, content };
        afterLine += 1;
        rows.push(row);
        pendingAdded.push(row);
      }
      continue;
    }

    if (change.removed) {
      // A removal run that follows an addition run starts a new pairing.
      if (pendingAdded.length > 0) flushPair();
      for (const content of lines) {
        const row: DiffRow = { kind: "removed", before: beforeLine, content };
        beforeLine += 1;
        rows.push(row);
        pendingRemoved.push(row);
      }
      continue;
    }

    flushPair();
    for (const content of lines) {
      rows.push({ kind: "context", before: beforeLine, after: afterLine, content });
      beforeLine += 1;
      afterLine += 1;
    }
  }

  flushPair();

  return groupIntoHunks(rows, context);
}

/**
 * Groups rows into hunks, dropping context beyond `context` lines.
 *
 * A file with one changed line is otherwise thousands of rows of identical
 * text, and the reader has to find the change in it.
 */
export function groupIntoHunks(rows: DiffRow[], context: number): DiffHunk[] {
  const changedIndexes = rows
    .map((row, index) => (row.kind === "context" ? -1 : index))
    .filter((index) => index >= 0);

  if (changedIndexes.length === 0) return [];

  // Ranges of rows to keep, then merged where their context overlaps —
  // otherwise two nearby changes produce two hunks separated by nothing.
  const ranges: [number, number][] = [];
  for (const index of changedIndexes) {
    const start = Math.max(0, index - context);
    const end = Math.min(rows.length - 1, index + context);
    const last = ranges[ranges.length - 1];
    if (last && start <= last[1] + 1) last[1] = Math.max(last[1], end);
    else ranges.push([start, end]);
  }

  let previousEnd = -1;
  return ranges.map(([start, end], index) => {
    const skippedBefore = start - previousEnd - 1;
    previousEnd = end;
    return {
      id: `hunk-${String(index)}`,
      rows: rows.slice(start, end + 1),
      skippedBefore: Math.max(0, skippedBefore),
    };
  });
}

/** Row pairs for a side-by-side view, aligning removals against additions. */
export function toSplitRows(
  rows: DiffRow[],
): { left: DiffRow | null; right: DiffRow | null }[] {
  const pairs: { left: DiffRow | null; right: DiffRow | null }[] = [];
  let index = 0;

  while (index < rows.length) {
    const row = rows[index];
    if (!row) break;

    if (row.kind === "context") {
      pairs.push({ left: row, right: row });
      index += 1;
      continue;
    }

    // Take the whole removal run and the whole addition run that follows, then
    // lay them alongside each other. Emitting them in document order instead
    // would put every removal above every addition, which is the unified view
    // wearing a two-column costume.
    const removed: DiffRow[] = [];
    while (rows[index]?.kind === "removed") {
      removed.push(rows[index] as DiffRow);
      index += 1;
    }
    const added: DiffRow[] = [];
    while (rows[index]?.kind === "added") {
      added.push(rows[index] as DiffRow);
      index += 1;
    }

    const height = Math.max(removed.length, added.length);
    for (let offset = 0; offset < height; offset += 1) {
      pairs.push({ left: removed[offset] ?? null, right: added[offset] ?? null });
    }
  }

  return pairs;
}

/** Counts, for a summary that says what the diff does before it is read. */
export function countChanges(hunks: DiffHunk[]): { added: number; removed: number } {
  let added = 0;
  let removed = 0;
  for (const hunk of hunks) {
    for (const row of hunk.rows) {
      if (row.kind === "added") added += 1;
      if (row.kind === "removed") removed += 1;
    }
  }
  return { added, removed };
}
