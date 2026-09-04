import { describe, expect, it } from "vitest";

import { nearest } from "./server";

const NAMES = [
  "ai-prompt-input",
  "avatar",
  "badge",
  "button",
  "card",
  "data-table",
  "date-picker",
  "dialog",
  "table",
];

describe("nearest", () => {
  it("suggests the real name for a transposition", () => {
    expect(nearest(NAMES, "datatabel")).toContain("data-table");
  });

  it("ignores hyphens, so the unhyphenated spelling is one edit away", () => {
    expect(nearest(NAMES, "datatable")[0]).toBe("data-table");
  });

  it("suggests nothing for a name that resembles nothing", () => {
    expect(nearest(NAMES, "kanban-board")).toEqual([]);
  });

  it("does not suggest a short unrelated name for another short name", () => {
    // Both are six letters; three edits apart is not a typo.
    expect(nearest(NAMES, "avatar")).not.toContain("button");
  });

  it("returns an exact name unchanged", () => {
    expect(nearest(NAMES, "button")[0]).toBe("button");
  });

  it("caps how many it offers", () => {
    expect(nearest(NAMES, "tabl", 2).length).toBeLessThanOrEqual(2);
  });
});
