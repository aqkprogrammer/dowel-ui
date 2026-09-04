import { describe, expect, it } from "vitest";

import { hexToOklch, parseOklch, type Oklch } from "./colour";
import type { PresetMode } from "./preset";
import {
  checkPreset,
  derivePreset,
  foregroundFor,
  formatPreset,
  slugify,
  TEXT_MINIMUM,
} from "./preset";

/** The shipped `ocean` preset, as authored. */
const OCEAN: Oklch = { l: 0.53, c: 0.15, h: 232 };

/** Named explicitly rather than via Object.values, which erases the type. */
function colours(mode: PresetMode): Oklch[] {
  return [mode.primary, mode.primaryHover, mode.primaryActive, mode.primaryForeground];
}

describe("derivePreset", () => {
  it("lands close to the preset that ships for the same colour", () => {
    // Not identical — the shipped values were hand-tuned — but the derivation
    // has to start somewhere recognisable, or it is not modelled on anything.
    const { light, dark } = derivePreset(OCEAN);

    expect(light.primary).toEqual(OCEAN);
    expect(light.primaryHover.l).toBeCloseTo(0.485, 2);
    expect(dark.primary.l).toBeGreaterThan(light.primary.l);
    expect(dark.primary.c).toBeLessThan(light.primary.c);
  });

  it("darkens for hover and further for active, in light mode", () => {
    const { light } = derivePreset(OCEAN);

    expect(light.primaryHover.l).toBeLessThan(light.primary.l);
    expect(light.primaryActive.l).toBeLessThan(light.primaryHover.l);
  });

  it("brightens for hover in dark mode, where a press still reads as darker", () => {
    const { dark } = derivePreset(OCEAN);

    expect(dark.primaryHover.l).toBeGreaterThan(dark.primary.l);
    expect(dark.primaryActive.l).toBeLessThan(dark.primary.l);
  });

  it("keeps the hue across every derived value", () => {
    const { light, dark } = derivePreset(OCEAN);

    for (const value of [...colours(light), ...colours(dark)]) {
      if (value.c > 0.01) expect(value.h).toBe(OCEAN.h);
    }
  });

  it("takes an explicit dark lightness over the derived one", () => {
    expect(derivePreset(OCEAN, { darkLightness: 0.8 }).dark.primary.l).toBe(0.8);
  });

  it("cannot be pushed out of range by an extreme input", () => {
    for (const l of [0, 1]) {
      const { light, dark } = derivePreset({ l, c: 0.2, h: 100 });
      for (const value of [...colours(light), ...colours(dark)]) {
        expect(value.l).toBeGreaterThan(0);
        expect(value.l).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe("foregroundFor", () => {
  it("puts near-white on a dark saturated colour", () => {
    expect(foregroundFor(OCEAN).l).toBeGreaterThan(0.9);
  });

  it("puts dark text on a light colour, rather than insisting on white", () => {
    // This is the amber case: no amount of nudging makes white readable on it.
    expect(foregroundFor({ l: 0.82, c: 0.14, h: 82 }).l).toBeLessThan(0.3);
  });

  it("tints the dark text with the background's own hue", () => {
    expect(foregroundFor({ l: 0.82, c: 0.14, h: 82 }).h).toBe(82);
  });
});

describe("checkPreset", () => {
  it("reports every state in both modes", () => {
    expect(checkPreset(derivePreset(OCEAN))).toHaveLength(6);
  });

  it("passes for the colours the shipped presets are built on", () => {
    for (const hex of ["#5b5bd6", "#0ea5e9", "#7c3aed"]) {
      const colour = hexToOklch(hex);
      expect(colour).toBeDefined();

      for (const check of checkPreset(derivePreset(colour!))) {
        expect(check.ratio, `${hex} — ${check.label}`).toBeGreaterThanOrEqual(TEXT_MINIMUM);
      }
    }
  });

  it("fails, rather than quietly approving, a colour nothing can be read on", () => {
    // Mid-lightness saturated colours are the trap: neither white nor near-black
    // reaches 4.5:1, and a builder that did not say so would ship it.
    const checks = checkPreset(derivePreset({ l: 0.62, c: 0.19, h: 145 }));
    expect(checks.some((check) => !check.passes)).toBe(true);
  });
});

describe("formatPreset", () => {
  const css = formatPreset("brand", derivePreset(OCEAN));

  it("writes both selectors the theme layer looks for", () => {
    expect(css).toContain('[data-theme="brand"] {');
    expect(css).toContain('.dark[data-theme="brand"] {');
  });

  it("writes values the token parser can read back", () => {
    for (const value of css.match(/oklch\([^)]*\)/g) ?? []) {
      expect(parseOklch(value), value).toBeDefined();
    }
  });

  it("assigns exactly the four tokens a preset owns", () => {
    expect(css.match(/--primary:/g)).toHaveLength(2);
    expect(css.match(/--primary-hover:/g)).toHaveLength(2);
    expect(css.match(/--primary-active:/g)).toHaveLength(2);
    expect(css.match(/--primary-foreground:/g)).toHaveLength(2);
  });
});

describe("slugify", () => {
  it("makes a usable data-theme value", () => {
    expect(slugify("Acme Corp")).toBe("acme-corp");
    expect(slugify("  Blue/Green  ")).toBe("blue-green");
  });

  it("falls back rather than producing an empty selector", () => {
    expect(slugify("!!!")).toBe("custom");
    expect(slugify("")).toBe("custom");
  });
});
