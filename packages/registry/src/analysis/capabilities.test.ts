import { describe, expect, it } from "vitest";

import { capabilitiesOf, hasClientDirective } from "./capabilities";

describe("hasClientDirective", () => {
  it.each([
    ['"use client";\nexport const A = 1;', true],
    ["'use client'\n", true],
    ['\n\n  "use client";', true],
    ['// a note\n"use client";', true],
    ['/* licence\n * text */\n"use client";', true],
    ['/** a */ // b\n/* c */ "use client";', true],
    ['import x from "y";\n"use client";', false],
    ['const a = "use client";', false],
    ["// only a comment", false],
    ["/* unterminated", false],
    ["", false],
  ])("%j → %s", (source, expected) => {
    expect(hasClientDirective(source)).toBe(expected);
  });

  it("stays linear on input built to make a backtracking pattern explode", () => {
    const hostile = `/*${"*//*".repeat(50_000)}`;
    const started = performance.now();
    expect(hasClientDirective(hostile)).toBe(false);
    expect(performance.now() - started).toBeLessThan(500);
  });
});

describe("capabilitiesOf", () => {
  it("reads the directive and animation from any file", () => {
    expect(capabilitiesOf(['"use client";', "@keyframes spin {}"])).toEqual({
      client: true,
      animated: true,
    });
    expect(capabilitiesOf(["export const A = 1;"])).toEqual({ client: false, animated: false });
  });
});
