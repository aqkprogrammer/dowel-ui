import { describe, expect, it } from "vitest";

import {
  contrastRatio,
  formatOklch,
  hexToOklch,
  linearRgbToOklch,
  luminance,
  oklchToHex,
  oklchToLinearRgb,
  parseOklch,
  resolveColour,
} from "./colour";

/**
 * The conversion is checked against values with known answers, because an
 * audit that quietly computes the wrong numbers is worse than no audit.
 */

describe("parseOklch", () => {
  it("parses decimal lightness", () => {
    expect(parseOklch("oklch(0.545 0.196 275)")).toEqual({
      l: 0.545,
      c: 0.196,
      h: 275,
      alpha: 1,
    });
  });

  it("parses percentage lightness, as minified CSS emits", () => {
    expect(parseOklch("oklch(54.5% 0.196 275)")?.l).toBeCloseTo(0.545, 5);
  });

  it("parses an alpha channel", () => {
    expect(parseOklch("oklch(0.2 0.01 265 / 0.55)")?.alpha).toBeCloseTo(0.55, 5);
  });

  it("rejects anything else", () => {
    expect(parseOklch("#ffffff")).toBeUndefined();
    expect(parseOklch("var(--primary)")).toBeUndefined();
  });
});

describe("oklchToLinearRgb", () => {
  it("maps white to full linear white", () => {
    const white = oklchToLinearRgb(1, 0, 0);
    expect(white.r).toBeCloseTo(1, 2);
    expect(white.g).toBeCloseTo(1, 2);
    expect(white.b).toBeCloseTo(1, 2);
  });

  it("maps black to zero", () => {
    const black = oklchToLinearRgb(0, 0, 0);
    expect(black.r).toBeCloseTo(0, 4);
    expect(black.g).toBeCloseTo(0, 4);
    expect(black.b).toBeCloseTo(0, 4);
  });
});

describe("luminance and contrast", () => {
  it("gives white and black the WCAG-defined extremes", () => {
    expect(luminance(oklchToLinearRgb(1, 0, 0))).toBeCloseTo(1, 2);
    expect(luminance(oklchToLinearRgb(0, 0, 0))).toBeCloseTo(0, 3);
  });

  it("reports the maximum ratio of 21:1 for black on white", () => {
    const ratio = contrastRatio(oklchToLinearRgb(1, 0, 0), oklchToLinearRgb(0, 0, 0));
    expect(ratio).toBeCloseTo(21, 0);
  });

  it("reports 1:1 for a colour against itself", () => {
    const colour = oklchToLinearRgb(0.545, 0.196, 275);
    expect(contrastRatio(colour, colour)).toBeCloseTo(1, 5);
  });

  it("is symmetric", () => {
    const a = oklchToLinearRgb(0.9, 0.02, 100);
    const b = oklchToLinearRgb(0.2, 0.05, 260);
    expect(contrastRatio(a, b)).toBeCloseTo(contrastRatio(b, a), 10);
  });
});

describe("resolveColour", () => {
  it("composites a translucent colour over its surface", () => {
    const white = oklchToLinearRgb(1, 0, 0);
    const halfBlack = resolveColour("oklch(0 0 0 / 0.5)", white);

    // Half black over white sits halfway in linear light.
    expect(halfBlack?.r).toBeCloseTo(0.5, 2);
  });

  it("leaves an opaque colour alone", () => {
    const over = oklchToLinearRgb(1, 0, 0);
    expect(resolveColour("oklch(0 0 0)", over)?.r).toBeCloseTo(0, 4);
  });
});

describe("hexToOklch", () => {
  it("round-trips a colour back to the hex it came from", () => {
    for (const hex of ["#5b5bd6", "#0ea5e9", "#ffffff", "#000000", "#7c3aed"]) {
      const oklch = hexToOklch(hex);
      expect(oklch).toBeDefined();
      expect(oklchToHex(oklch!)).toBe(hex);
    }
  });

  it("expands the three-digit form", () => {
    expect(hexToOklch("#fff")).toEqual(hexToOklch("#ffffff"));
  });

  it("accepts a value with no leading hash", () => {
    expect(hexToOklch("5b5bd6")).toEqual(hexToOklch("#5b5bd6"));
  });

  it("rejects anything that is not a hex colour", () => {
    for (const value of ["", "#12345", "rebeccapurple", "oklch(0.5 0.1 270)", "#gggggg"]) {
      expect(hexToOklch(value)).toBeUndefined();
    }
  });

  it("agrees with the forward conversion the audit uses", () => {
    // The two directions are separate implementations of the same matrix, so a
    // sign error in either shows up here rather than in a shipped theme.
    const oklch = hexToOklch("#5b5bd6");
    expect(oklch).toBeDefined();

    const round = linearRgbToOklch(oklchToLinearRgb(oklch!.l, oklch!.c, oklch!.h));
    expect(round.l).toBeCloseTo(oklch!.l, 6);
    expect(round.c).toBeCloseTo(oklch!.c, 6);
    expect(round.h).toBeCloseTo(oklch!.h, 4);
  });

  it("reports a hue in [0, 360)", () => {
    for (const hex of ["#ff0000", "#00ff00", "#0000ff", "#ff00ff"]) {
      const oklch = hexToOklch(hex);
      expect(oklch!.h).toBeGreaterThanOrEqual(0);
      expect(oklch!.h).toBeLessThan(360);
    }
  });

  it("gives grey a hue of zero rather than an arbitrary one", () => {
    expect(hexToOklch("#808080")!.c).toBeLessThan(0.001);
    expect(hexToOklch("#808080")!.h).toBe(0);
  });
});

describe("formatOklch", () => {
  it("writes the form the tokens are authored in, and parses back", () => {
    const value = formatOklch({ l: 0.545, c: 0.196, h: 275 });
    expect(value).toBe("oklch(0.545 0.196 275)");

    const parsed = parseOklch(value);
    expect(parsed).toMatchObject({ l: 0.545, c: 0.196, h: 275, alpha: 1 });
  });

  it("does not print trailing zeros", () => {
    expect(formatOklch({ l: 0.5, c: 0.1, h: 270 })).toBe("oklch(0.5 0.1 270)");
  });
});
