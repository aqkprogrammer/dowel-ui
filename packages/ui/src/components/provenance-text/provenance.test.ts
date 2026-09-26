import { describe, expect, it } from "vitest";

import {
  mergeSegments,
  provenanceFromEdit,
  shareByAuthor,
  type ProvenanceSegment,
} from "./provenance";

const textOf = (segments: ProvenanceSegment[]) => segments.map((s) => s.text).join("");

describe("mergeSegments", () => {
  it("joins neighbours by the same author and drops empty segments", () => {
    expect(
      mergeSegments([
        { text: "We shipped ", author: "you" },
        { text: "", author: "claude" },
        { text: "on Monday", author: "you" },
        { text: ", ahead of plan", author: "claude" },
        { text: ".", author: "claude" },
      ]),
    ).toEqual([
      { text: "We shipped on Monday", author: "you" },
      { text: ", ahead of plan.", author: "claude" },
    ]);
  });

  it("keeps the same author apart when someone else is in between", () => {
    const segments = [
      { text: "a ", author: "you" },
      { text: "b ", author: "claude" },
      { text: "c", author: "you" },
    ];
    expect(mergeSegments(segments)).toEqual(segments);
  });

  it("does not change the segments it is given", () => {
    const segments = [
      { text: "a", author: "you" },
      { text: "b", author: "you" },
    ];
    mergeSegments(segments);
    expect(segments[0]).toEqual({ text: "a", author: "you" });
  });

  it("returns nothing for nothing", () => {
    expect(mergeSegments([])).toEqual([]);
    expect(mergeSegments([{ text: "", author: "you" }])).toEqual([]);
  });
});

describe("provenanceFromEdit", () => {
  it("credits inserted words to the editor and keeps the rest with who wrote it", () => {
    expect(
      provenanceFromEdit(
        "Revenue grew this quarter.",
        "Revenue grew 12% this quarter, beating the forecast.",
        "claude",
        "you",
      ),
    ).toEqual([
      { text: "Revenue grew ", author: "you" },
      { text: "12% ", author: "claude" },
      { text: "this quarter", author: "you" },
      { text: ", beating the forecast", author: "claude" },
      { text: ".", author: "you" },
    ]);
  });

  it("credits a changed word to the editor as a whole", () => {
    expect(provenanceFromEdit("colour me", "colours me", "claude", "you")).toEqual([
      { text: "colours", author: "claude" },
      { text: " me", author: "you" },
    ]);
  });

  it("keeps earlier authors when editing earlier provenance", () => {
    const before = [
      { text: "We shipped ", author: "you" },
      { text: "the new billing page", author: "claude" },
      { text: " on Monday.", author: "you" },
    ];
    expect(
      provenanceFromEdit(before, "We shipped the new billing page on Tuesday.", "dana"),
    ).toEqual([
      { text: "We shipped ", author: "you" },
      { text: "the new billing page", author: "claude" },
      { text: " on ", author: "you" },
      { text: "Tuesday", author: "dana" },
      { text: ".", author: "you" },
    ]);
  });

  it("splits a run of unchanged text back along its authors", () => {
    const before = [
      { text: "one ", author: "you" },
      { text: "two ", author: "claude" },
      { text: "three", author: "you" },
    ];
    expect(provenanceFromEdit(before, "one two three four", "claude")).toEqual([
      { text: "one ", author: "you" },
      { text: "two ", author: "claude" },
      { text: "three", author: "you" },
      { text: " four", author: "claude" },
    ]);
  });

  it("gives the space between two inserted words to the insertion", () => {
    expect(provenanceFromEdit("a b", "x y", "claude", "you")).toEqual([
      { text: "x y", author: "claude" },
    ]);
  });

  it("leaves a space next to only one insertion with who wrote it", () => {
    expect(provenanceFromEdit("a b", "x b", "claude", "you")).toEqual([
      { text: "x", author: "claude" },
      { text: " b", author: "you" },
    ]);
  });

  it("drops deleted words without crediting anyone", () => {
    expect(provenanceFromEdit("one two three", "one three", "claude", "you")).toEqual([
      { text: "one three", author: "you" },
    ]);
  });

  it("credits a first draft to its author", () => {
    expect(provenanceFromEdit("", "A first draft.", "claude")).toEqual([
      { text: "A first draft.", author: "claude" },
    ]);
    expect(provenanceFromEdit([], "A first draft.", "claude")).toEqual([
      { text: "A first draft.", author: "claude" },
    ]);
  });

  it("credits plain text with no previous author to 'unknown', never the editor", () => {
    expect(provenanceFromEdit("Old words", "Old words stay", "claude")).toEqual([
      { text: "Old words", author: "unknown" },
      { text: " stay", author: "claude" },
    ]);
  });

  it("returns nothing when everything was deleted", () => {
    expect(provenanceFromEdit("All of it", "", "you", "claude")).toEqual([]);
  });

  it("always spells out exactly the text after the edit", () => {
    const cases: [string, string][] = [
      [
        "The launch moved to May.",
        "The launch moved to early June, after the security review.",
      ],
      ["  leading and trailing  ", "leading, then trailing"],
      ["Line one.\nLine two.", "Line one.\n\nLine two, longer."],
      ["", ""],
    ];
    for (const [before, after] of cases) {
      expect(textOf(provenanceFromEdit(before, after, "claude", "you"))).toBe(after);
    }
  });

  it("chains, so each edit builds on the last", () => {
    const draft = provenanceFromEdit("", "The pilot ran for six weeks.", "you");
    const agent = provenanceFromEdit(
      draft,
      "The pilot ran for six weeks across three regions.",
      "claude",
    );
    const quoted = provenanceFromEdit(
      agent,
      "The pilot ran for six weeks across three regions. “Adoption doubled.”",
      "report",
    );
    expect(quoted).toEqual([
      { text: "The pilot ran for six weeks", author: "you" },
      { text: " across three regions", author: "claude" },
      { text: ".", author: "you" },
      { text: " “Adoption doubled.”", author: "report" },
    ]);
  });
});

describe("shareByAuthor", () => {
  it("gives each author's share, largest first, summing to 100", () => {
    const shares = shareByAuthor([
      { text: "abcdefgh", author: "claude" },
      { text: "abcdefghijklmnop", author: "you" },
      { text: "ab", author: "wikipedia" },
      { text: "ab", author: "you" },
    ]);
    expect(shares).toEqual([
      { author: "you", characters: 18, percent: 64 },
      { author: "claude", characters: 8, percent: 29 },
      { author: "wikipedia", characters: 2, percent: 7 },
    ]);
    expect(shares.reduce((sum, share) => sum + share.percent, 0)).toBe(100);
  });

  it("does not count whitespace", () => {
    expect(
      shareByAuthor([
        { text: "a b", author: "you" },
        { text: "      ", author: "claude" },
        { text: "cd", author: "claude" },
      ]),
    ).toEqual([
      { author: "you", characters: 2, percent: 50 },
      { author: "claude", characters: 2, percent: 50 },
    ]);
  });

  it("rounds three equal shares to 100, not 99", () => {
    const shares = shareByAuthor([
      { text: "a", author: "you" },
      { text: "b", author: "claude" },
      { text: "c", author: "wikipedia" },
    ]);
    expect(shares.map((share) => share.percent)).toEqual([34, 33, 33]);
  });

  it("never says someone who wrote something wrote 0%", () => {
    const shares = shareByAuthor([
      { text: "x".repeat(999), author: "you" },
      { text: "y", author: "claude" },
    ]);
    expect(shares).toEqual([
      { author: "you", characters: 999, percent: 99 },
      { author: "claude", characters: 1, percent: 1 },
    ]);
  });

  it("counts characters, not UTF-16 units", () => {
    expect(shareByAuthor([{ text: "😀😀", author: "you" }])).toEqual([
      { author: "you", characters: 2, percent: 100 },
    ]);
  });

  it("returns nothing when nothing was written", () => {
    expect(shareByAuthor([])).toEqual([]);
    expect(shareByAuthor([{ text: "  \n", author: "you" }])).toEqual([]);
  });
});
