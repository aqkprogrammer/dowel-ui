import { describe, expect, it } from "vitest";

import { cn } from "./utils";

describe("cn", () => {
  it("joins class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("drops falsy values", () => {
    expect(cn("a", false, undefined, null, "b")).toBe("a b");
  });

  it("lets the later Tailwind utility win a conflict", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("resolves conflicts across our custom font-size scale", () => {
    // Without the extendTailwindMerge config this returns "text-sm text-2xs",
    // and a consumer's size override would silently do nothing.
    expect(cn("text-sm", "text-2xs")).toBe("text-2xs");
    expect(cn("text-2xs", "text-lg")).toBe("text-lg");
  });

  it("keeps non-conflicting utilities", () => {
    expect(cn("rounded-md border", "bg-primary")).toBe("rounded-md border bg-primary");
  });

  it("accepts arrays and objects", () => {
    expect(cn(["a", { b: true, c: false }])).toBe("a b");
  });
});
