import { describe, expect, it } from "vitest";

import { capabilitiesOf, hasClientDirective, resolveTiers, tierOf } from "./capabilities";

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
      tier: "css",
    });
    expect(capabilitiesOf(["export const A = 1;"])).toEqual({
      client: false,
      animated: false,
      tier: "css",
    });
  });
});

describe("tierOf", () => {
  it.each([
    ['<div className="animate-spin" />', "css"],
    ['import { motion } from "motion/react";', "motion"],
    ["return <canvas ref={ref} />;", "canvas"],
    ['const ctx = canvas.getContext("2d");', "canvas"],
    ['canvas.getContext("webgl2", { alpha: true })', "webgl"],
    ["canvas.getContext('webgl')", "webgl"],
    ['import * as THREE from "three";', "webgl"],
    ['import { Canvas } from "@react-three/fiber";', "webgl"],
    // Words, not usage.
    ["// draws like a canvas would", "css"],
  ])("%j → %s", (source, expected) => {
    expect(tierOf([source])).toBe(expected);
  });

  it("takes the heaviest technique across files", () => {
    expect(tierOf(['import { motion } from "motion/react";', "<canvas />"])).toBe("canvas");
  });
});

describe("resolveTiers", () => {
  it("counts the tiers of everything an item installs with it", () => {
    const own = new Map([
      ["engine", "canvas"],
      ["sky", "css"],
      ["hero", "css"],
      ["button", "motion"],
      ["plain", "css"],
    ] as const);
    const dependencies = new Map([
      ["sky", ["engine"]],
      ["hero", ["sky", "button"]],
    ]);
    const tiers = resolveTiers(own, dependencies);
    expect(tiers.get("sky")).toBe("canvas");
    expect(tiers.get("hero")).toBe("canvas");
    expect(tiers.get("button")).toBe("motion");
    expect(tiers.get("plain")).toBe("css");
  });

  it("survives a dependency cycle", () => {
    const tiers = resolveTiers(
      new Map([
        ["a", "css"],
        ["b", "webgl"],
      ] as const),
      new Map([
        ["a", ["b"]],
        ["b", ["a"]],
      ]),
    );
    expect(tiers.get("a")).toBe("webgl");
    expect(tiers.get("b")).toBe("webgl");
  });
});
