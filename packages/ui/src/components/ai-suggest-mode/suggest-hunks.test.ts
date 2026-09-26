import { describe, expect, it } from "vitest";

import {
  applyHunks,
  describeHunk,
  hunksFromEdits,
  hunksFromRewrite,
  segmentsOf,
} from "./suggest-hunks";

const TEXT = "Teh quick fox jumps over the lazy dog. The quick fox rests.";

describe("hunksFromEdits", () => {
  it("places each edit where its text is, keeping ids and reasons", () => {
    const { hunks, stale } = hunksFromEdits(TEXT, [
      { id: "typo", find: "Teh", replace: "The", reason: "Spelling" },
      { find: "lazy", replace: "sleepy" },
    ]);
    expect(stale).toEqual([]);
    expect(hunks).toEqual([
      { id: "typo", start: 0, end: 3, removed: "Teh", added: "The", reason: "Spelling" },
      { id: "edit-1", start: 29, end: 33, removed: "lazy", added: "sleepy", reason: undefined },
    ]);
  });

  it("resolves a repeated phrase in reading order", () => {
    const { hunks } = hunksFromEdits(TEXT, [
      { find: "quick fox", replace: "swift fox" },
      { find: "quick fox", replace: "calm fox" },
    ]);
    expect(hunks.map((hunk) => [hunk.start, hunk.added])).toEqual([
      [4, "swift fox"],
      [43, "calm fox"],
    ]);
  });

  it("finds an edit given out of order, as long as it does not overlap", () => {
    const { hunks } = hunksFromEdits(TEXT, [
      { find: "rests", replace: "sleeps" },
      { find: "Teh", replace: "The" },
    ]);
    expect(hunks.map((hunk) => hunk.removed)).toEqual(["Teh", "rests"]);
  });

  it("returns what cannot be placed as stale rather than guessing", () => {
    const { hunks, stale } = hunksFromEdits(TEXT, [
      { find: "cat", replace: "dog" },
      { find: "", replace: "x" },
      { find: "fox", replace: "fox" },
      { find: "Teh quick", replace: "The quick" },
      { find: "quick fox jumps", replace: "fox leaps" },
    ]);
    expect(hunks.map((hunk) => hunk.removed)).toEqual(["Teh quick"]);
    expect(stale.map((edit) => edit.find)).toEqual(["cat", "", "fox", "quick fox jumps"]);
  });
});

describe("hunksFromRewrite", () => {
  it("diffs word by word, grouping each run of changes", () => {
    const hunks = hunksFromRewrite("The quick fox jumps.", "The swift fox leaps high.");
    expect(hunks.map(({ removed, added }) => [removed, added])).toEqual([
      ["quick", "swift"],
      ["jumps", "leaps high"],
    ]);
  });

  it("keeps a pure insertion at the point it goes", () => {
    const [hunk] = hunksFromRewrite("A fox.", "A red fox.");
    expect(hunk).toMatchObject({ removed: "", start: hunk?.end });
    expect(
      applyHunks("A fox.", hunksFromRewrite("A fox.", "A red fox."), {
        "change-0": "accepted",
      }),
    ).toBe("A red fox.");
  });

  it("finds nothing when nothing changed", () => {
    expect(hunksFromRewrite("Same.", "Same.")).toEqual([]);
  });
});

describe("applyHunks", () => {
  const { hunks } = hunksFromEdits(TEXT, [
    { id: "a", find: "Teh", replace: "The" },
    { id: "b", find: "lazy", replace: "sleepy" },
  ]);

  it("applies only what was accepted", () => {
    expect(applyHunks(TEXT, hunks, { a: "accepted", b: "rejected" })).toBe(
      "The quick fox jumps over the lazy dog. The quick fox rests.",
    );
    expect(applyHunks(TEXT, hunks, {})).toBe(TEXT);
    expect(applyHunks(TEXT, hunks, { a: "accepted", b: "accepted" })).toContain("sleepy dog");
  });

  it("round-trips a whole rewrite when everything is accepted", () => {
    const rewrite = "The swift fox leaps over a lazy dog, then rests.";
    const all = hunksFromRewrite(TEXT, rewrite);
    const decisions = Object.fromEntries(all.map((hunk) => [hunk.id, "accepted" as const]));
    expect(applyHunks(TEXT, all, decisions)).toBe(rewrite);
  });
});

describe("segmentsOf", () => {
  it("interleaves unchanged text and hunks", () => {
    const { hunks } = hunksFromEdits("a b c", [{ find: "b", replace: "B" }]);
    expect(segmentsOf("a b c", hunks).map((segment) => segment.kind)).toEqual([
      "text",
      "hunk",
      "text",
    ]);
  });
});

describe("describeHunk", () => {
  it("says the change in words", () => {
    const base = { id: "x", start: 0, end: 0 };
    expect(describeHunk({ ...base, removed: "teh", added: "the" })).toBe(
      "Replace “teh” with “the”",
    );
    expect(describeHunk({ ...base, removed: "", added: " red" })).toBe("Insert “red”");
    expect(describeHunk({ ...base, removed: "very ", added: "" })).toBe("Delete “very”");
    expect(describeHunk({ ...base, removed: "x".repeat(80), added: "y" })).toMatch(
      /…” with “y”$/,
    );
  });
});
