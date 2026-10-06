import { describe, expect, it } from "vitest";

import { isUnreleased } from "./release";

describe("isUnreleased", () => {
  it("marks a feature newer than the current version", () => {
    expect(isUnreleased("0.13.0", "0.12.0")).toBe(true);
    expect(isUnreleased("1.0.0", "0.99.9")).toBe(true);
  });

  it("stops marking it once that version is current or older", () => {
    expect(isUnreleased("0.13.0", "0.13.0")).toBe(false);
    expect(isUnreleased("0.13.0", "0.13.1")).toBe(false);
    expect(isUnreleased("0.12.0", "0.13.0")).toBe(false);
  });
});
