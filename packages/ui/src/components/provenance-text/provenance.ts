import { diffWordsWithSpace } from "diff";

/**
 * Who wrote which part of a text, and how that changes as the text is edited.
 *
 * Provenance is a run of segments, each a piece of the text and the id of
 * whoever wrote it. Edits are attributed word by word, since a word is the
 * smallest thing a person would say they wrote: an agent that turns "colour"
 * into "colours" wrote "colours", not an "s".
 *
 * Pure, so attribution and shares are tested without rendering.
 */

export type ProvenanceKind = "person" | "agent" | "source";

export interface ProvenanceSegment {
  text: string;
  /** A key into the authors: "you", "claude", "wikipedia". */
  author: string;
}

export interface ProvenanceAuthor {
  /** What to call them: "You", "Claude", "Wikipedia". */
  label: string;
  /** A person's words are left plain; an agent's and a source's are marked, differently. */
  kind: ProvenanceKind;
  /**
   * Where the words came from: a source's page, the conversation an agent
   * wrote them in. Marked words link there while provenance is shown.
   */
  href?: string;
}

export type ProvenanceAuthors = Record<string, ProvenanceAuthor>;

export interface ProvenanceShare {
  author: string;
  /** Characters written, not counting whitespace. */
  characters: number;
  /** A whole percentage. Every author's shares sum to 100. */
  percent: number;
}

/** Joins neighbouring segments by the same author and drops empty ones. */
export function mergeSegments(segments: readonly ProvenanceSegment[]): ProvenanceSegment[] {
  const merged: ProvenanceSegment[] = [];
  for (const segment of segments) {
    if (!segment.text) continue;
    const last = merged.at(-1);
    if (last?.author === segment.author) last.text += segment.text;
    else merged.push({ text: segment.text, author: segment.author });
  }
  return merged;
}

const WHITESPACE = /^\s+$/;

/**
 * The provenance of `after`, an edit of `before` by `author`.
 *
 * Words the edit inserted or changed are the editor's; words it left alone
 * keep whoever wrote them before. `before` is either earlier provenance or
 * plain text, in which case `previousAuthor` wrote all of it. Without one,
 * plain text is credited to `"unknown"` rather than to the editor, because
 * crediting someone with words they did not write is the one thing this must
 * not do.
 */
export function provenanceFromEdit(
  before: readonly ProvenanceSegment[] | string,
  after: string,
  author: string,
  previousAuthor = "unknown",
): ProvenanceSegment[] {
  const previous =
    typeof before === "string"
      ? [{ text: before, author: previousAuthor }]
      : mergeSegments(before);
  const original = previous.map((segment) => segment.text).join("");
  const parts = diffWordsWithSpace(original, after);
  const result: ProvenanceSegment[] = [];

  // A cursor into the previous segments, so a run of unchanged text that
  // spans several authors is split back along the lines it came with.
  let index = 0;
  let offset = 0;
  const advance = (length: number, keep: boolean) => {
    let remaining = length;
    while (remaining > 0) {
      const segment = previous[index];
      if (!segment) return;
      const take = Math.min(remaining, segment.text.length - offset);
      if (keep) {
        result.push({
          text: segment.text.slice(offset, offset + take),
          author: segment.author,
        });
      }
      remaining -= take;
      offset += take;
      if (offset === segment.text.length) {
        index += 1;
        offset = 0;
      }
    }
  };

  const nextKeptIsAdded = (from: number) =>
    parts.slice(from + 1).find((part) => !part.removed)?.added === true;

  let lastKeptWasAdded = false;
  parts.forEach((part, position) => {
    if (part.removed) {
      advance(part.value.length, false);
      return;
    }
    if (part.added) {
      result.push({ text: part.value, author });
      lastKeptWasAdded = true;
      return;
    }
    // A space left between two inserted words belongs to the insertion.
    // Otherwise rewriting "a b" as "x y" credits the space to whoever wrote
    // "a b", and one edit reads as two.
    if (WHITESPACE.test(part.value) && lastKeptWasAdded && nextKeptIsAdded(position)) {
      advance(part.value.length, false);
      result.push({ text: part.value, author });
      return;
    }
    advance(part.value.length, true);
    lastKeptWasAdded = false;
  });

  return mergeSegments(result);
}

/**
 * How much of the text each author wrote, largest first.
 *
 * Counted in characters without whitespace, since who typed a space says
 * nothing about who wrote the text. Rounded by largest remainder so the
 * shares sum to exactly 100, and anyone who wrote anything gets at least 1%,
 * because "0%" would say they wrote nothing.
 */
export function shareByAuthor(segments: readonly ProvenanceSegment[]): ProvenanceShare[] {
  const counts = new Map<string, number>();
  for (const segment of segments) {
    const characters = Array.from(segment.text.replace(/\s+/g, "")).length;
    if (characters === 0) continue;
    counts.set(segment.author, (counts.get(segment.author) ?? 0) + characters);
  }

  let total = 0;
  for (const characters of counts.values()) total += characters;
  if (total === 0) return [];

  const shares = [...counts].map(([author, characters], order) => {
    const exact = (characters / total) * 100;
    const percent = Math.floor(exact);
    return { author, characters, percent, remainder: exact - percent, order };
  });

  let left = 100 - shares.reduce((sum, share) => sum + share.percent, 0);
  const byRemainder = [...shares].sort(
    (a, b) => b.remainder - a.remainder || a.order - b.order,
  );
  for (const share of byRemainder) {
    if (left <= 0) break;
    share.percent += 1;
    left -= 1;
  }

  for (const share of shares) {
    if (share.percent > 0) continue;
    const largest = shares.reduce((a, b) => (b.percent > a.percent ? b : a));
    if (largest.percent <= 1) break;
    largest.percent -= 1;
    share.percent = 1;
  }

  return shares
    .sort((a, b) => b.characters - a.characters || a.order - b.order)
    .map(({ author, characters, percent }) => ({ author, characters, percent }));
}
