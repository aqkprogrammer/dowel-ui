import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { hexToOklch, parseOklch, type Oklch } from "./colour";
import type { PresetMode } from "./preset";

const here = dirname(fileURLToPath(import.meta.url));
import {
  checkPreset,
  PAGE_BACKGROUND,
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
  it("reports every solid state and every soft tint, in both modes", () => {
    expect(checkPreset(derivePreset(OCEAN))).toHaveLength(12);
  });

  it("fails a colour whose label passes on the fill but not as text on its tint", () => {
    // The trap the shipped presets fell into: L≈0.58 carries white text at
    // better than 4.5:1, and as text on a 12% tint of itself reads at ~4.0.
    const checks = checkPreset(derivePreset({ l: 0.58, c: 0.2, h: 25 }));
    expect(
      checks.find((check) => check.label === "Light: primary-foreground on primary")?.passes,
    ).toBe(true);
    expect(
      checks.find((check) => check.label === "Light: primary on the soft tint")?.passes,
    ).toBe(false);
  });

  it("paints the tints over the page background base.css defines", () => {
    const css = readFileSync(join(here, "base.css"), "utf8");
    const light = /:root\s*{[\s\S]*?--background:\s*(oklch\([^)]*\))/.exec(css)?.[1];
    expect(parseOklch(light ?? "")).toMatchObject(PAGE_BACKGROUND.light);
    const tokens = readFileSync(join(here, "tokens.css"), "utf8");
    const dark = /--color-neutral-950:\s*(oklch\([^)]*\))/.exec(tokens)?.[1];
    expect(css).toMatch(/\.dark\s*{[\s\S]*?--background:\s*var\(--color-neutral-950\)/);
    expect(parseOklch(dark ?? "")).toMatchObject(PAGE_BACKGROUND.dark);
  });

  it("passes for the colours the shipped presets are built on", () => {
    for (const hex of ["#5b5bd6", "#7c3aed"]) {
      const colour = hexToOklch(hex);
      expect(colour).toBeDefined();

      for (const check of checkPreset(derivePreset(colour!))) {
        expect(check.ratio, `${hex} — ${check.label}`).toBeGreaterThanOrEqual(TEXT_MINIMUM);
      }
    }
  });

  it("passes a light brand colour as a fill and flags it as text on its tint", () => {
    // Ocean's brand sky blue carries dark text on its fill comfortably and is
    // unreadable as text on a tint of itself — why the shipped `ocean` preset
    // uses a darker primary than the brand colour. The studio says so rather
    // than approving it.
    const checks = checkPreset(derivePreset(hexToOklch("#0ea5e9")!));
    const failing = checks.filter((check) => !check.passes).map((check) => check.label);
    expect(failing).toEqual([
      "Light: primary on the soft tint",
      "Light: primary-hover on the soft hover tint",
      "Light: primary-hover on the soft pressed tint",
    ]);
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
