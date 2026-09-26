import { diffWordsWithSpace } from "diff";

/**
 * Where an agent's suggested changes sit in a text, and what the text becomes
 * as they are decided.
 *
 * Suggestions arrive in one of two shapes. Edits — "replace this with that,
 * because" — are what a model asked for structured output returns, and carry
 * a reason. A rewrite — the whole text again, changed — is what a model asked
 * to "improve this" returns; it is diffed word by word, since the smallest
 * change a person would accept or reject on its own is a word, not a letter.
 *
 * Pure, so placement and application are tested without rendering.
 */

export interface SuggestedEdit {
  id?: string;
  /** The text to change, as it appears in the original. */
  find: string;
  replace: string;
  /** Why, in the agent's words. */
  reason?: string;
}

export interface SuggestionHunk {
  id: string;
  /** Where the change starts and ends in the original. */
  start: number;
  end: number;
  removed: string;
  added: string;
  reason?: string;
}

export type SuggestionDecision = "accepted" | "rejected";

/**
 * Places edits in the text. Each is looked for after the previous one first,
 * so repeated phrases resolve in reading order, then anywhere it does not
 * overlap another. An edit that cannot be placed is returned as stale rather
 * than applied somewhere it was not meant.
 */
export function hunksFromEdits(
  text: string,
  edits: SuggestedEdit[],
): { hunks: SuggestionHunk[]; stale: SuggestedEdit[] } {
  const hunks: SuggestionHunk[] = [];
  const stale: SuggestedEdit[] = [];
  const overlaps = (start: number, end: number) =>
    hunks.some((hunk) => start < hunk.end && end > hunk.start);
  let cursor = 0;

  edits.forEach((edit, index) => {
    if (!edit.find || edit.find === edit.replace) {
      stale.push(edit);
      return;
    }
    let start = text.indexOf(edit.find, cursor);
    if (start < 0 || overlaps(start, start + edit.find.length)) {
      start = -1;
      for (
        let from = text.indexOf(edit.find);
        from >= 0;
        from = text.indexOf(edit.find, from + 1)
      ) {
        if (!overlaps(from, from + edit.find.length)) {
          start = from;
          break;
        }
      }
    }
    if (start < 0) {
      stale.push(edit);
      return;
    }
    const end = start + edit.find.length;
    hunks.push({
      id: edit.id ?? `edit-${String(index)}`,
      start,
      end,
      removed: edit.find,
      added: edit.replace,
      reason: edit.reason,
    });
    cursor = end;
  });

  return { hunks: hunks.sort((a, b) => a.start - b.start), stale };
}

/** A whole rewrite as word-level hunks: each run of changes between unchanged words. */
export function hunksFromRewrite(text: string, rewrite: string): SuggestionHunk[] {
  const hunks: SuggestionHunk[] = [];
  let position = 0;
  let open: SuggestionHunk | null = null;

  const close = () => {
    if (open) hunks.push(open);
    open = null;
  };

  for (const part of diffWordsWithSpace(text, rewrite)) {
    if (!part.added && !part.removed) {
      close();
      position += part.value.length;
      continue;
    }
    open ??= {
      id: `change-${String(hunks.length)}`,
      start: position,
      end: position,
      removed: "",
      added: "",
    };
    if (part.removed) {
      open.removed += part.value;
      open.end += part.value.length;
      position += part.value.length;
    } else {
      open.added += part.value;
    }
  }
  close();
  return hunks;
}

/** The original with accepted hunks applied and the rest left as they were. */
export function applyHunks(
  text: string,
  hunks: SuggestionHunk[],
  decisions: Record<string, SuggestionDecision | undefined>,
): string {
  let result = "";
  let position = 0;
  for (const hunk of [...hunks].sort((a, b) => a.start - b.start)) {
    result += text.slice(position, hunk.start);
    result += decisions[hunk.id] === "accepted" ? hunk.added : hunk.removed;
    position = hunk.end;
  }
  return result + text.slice(position);
}

export type SuggestionSegment =
  { kind: "text"; text: string } | { kind: "hunk"; hunk: SuggestionHunk };

/** The original as a run of unchanged text and hunks, for rendering. */
export function segmentsOf(text: string, hunks: SuggestionHunk[]): SuggestionSegment[] {
  const segments: SuggestionSegment[] = [];
  let position = 0;
  for (const hunk of [...hunks].sort((a, b) => a.start - b.start)) {
    if (hunk.start > position)
      segments.push({ kind: "text", text: text.slice(position, hunk.start) });
    segments.push({ kind: "hunk", hunk });
    position = hunk.end;
  }
  if (position < text.length) segments.push({ kind: "text", text: text.slice(position) });
  return segments;
}

function quote(text: string): string {
  const trimmed = text.trim();
  return `“${trimmed.length > 60 ? `${trimmed.slice(0, 57)}…` : trimmed}”`;
}

/** A hunk in words: "Replace “teh” with “the”". */
export function describeHunk(hunk: SuggestionHunk): string {
  if (!hunk.removed.trim()) return `Insert ${quote(hunk.added)}`;
  if (!hunk.added.trim()) return `Delete ${quote(hunk.removed)}`;
  return `Replace ${quote(hunk.removed)} with ${quote(hunk.added)}`;
}
