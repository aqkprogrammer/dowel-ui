import { describe, expect, it } from "vitest";

import {
  contrastRatio,
  luminance,
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
