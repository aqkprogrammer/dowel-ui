import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { contrastRatio, parseOklch, resolveColour, type Oklch } from "./colour";
import { parseTokenCss, resolveReferences, type Declarations } from "./figma";
import { THEME_PRESETS } from "./index";
import { checkPreset, TEXT_MINIMUM, type PresetMode } from "./preset";

/**
 * The presets as shipped, rather than as derived.
 *
 * `audit:contrast` covers every pair across every preset, but it only covers
 * the presets it is told about. These tests hold the typed list, the files and
 * the stylesheet that imports them to each other, so a preset cannot ship
 * unlisted — or listed and missing — and then escape the audit.
 */

const here = dirname(fileURLToPath(import.meta.url));
const presetsDir = join(here, "presets");

const scale = parseTokenCss(readFileSync(join(here, "tokens.css"), "utf8"), "@theme");
const base = readFileSync(join(here, "base.css"), "utf8");
const root = parseTokenCss(base, ":root");
const dark = parseTokenCss(base, ".dark");

const shipped = THEME_PRESETS.filter((preset) => preset !== "default");

function read(preset: string): string {
  return readFileSync(join(presetsDir, `${preset}.css`), "utf8");
}

function colour(value: string, scopes: Declarations[]): Oklch {
  const parsed = parseOklch(resolveReferences(value, scopes));
  if (!parsed) throw new Error(`Not a colour: ${value}`);
  return parsed;
}

function mode(declarations: Declarations, scopes: Declarations[]): PresetMode {
  const all = [declarations, ...scopes];
  return {
    primary: colour("var(--primary)", all),
    primaryHover: colour("var(--primary-hover)", all),
    primaryActive: colour("var(--primary-active)", all),
    primaryForeground: colour("var(--primary-foreground)", all),
  };
}

function modes(preset: string) {
  const css = read(preset);
  const light = parseTokenCss(css, `[data-theme="${preset}"]`);
  const darkDeclarations = parseTokenCss(css, `.dark[data-theme="${preset}"]`);
  return {
    light,
    dark: darkDeclarations,
    derived: {
      light: mode(light, [root, scale]),
      dark: mode(darkDeclarations, [dark, root, scale]),
    },
  };
}

describe("the preset list", () => {
  it("has a stylesheet for every preset it names, and names every stylesheet", () => {
    const files = readdirSync(presetsDir)
      .filter((file) => file.endsWith(".css") && file !== "index.css")
      .map((file) => file.replace(/\.css$/, ""));

    expect([...files].sort()).toEqual([...shipped].sort());
  });

  it("is imported in full by presets.css", () => {
    const index = readFileSync(join(presetsDir, "index.css"), "utf8");
    for (const preset of shipped) {
      expect(index, preset).toContain(`@import "./${preset}.css";`);
    }
  });

  it("has no duplicate names", () => {
    expect(new Set(THEME_PRESETS).size).toBe(THEME_PRESETS.length);
  });
});

describe.each(shipped)("preset %s", (preset) => {
  const { light, dark: darkDeclarations, derived } = modes(preset);

  it("assigns exactly the four brand tokens, in both modes", () => {
    const owned = ["primary", "primary-active", "primary-foreground", "primary-hover"];
    expect(Object.keys(light).sort()).toEqual(owned);
    expect(Object.keys(darkDeclarations).sort()).toEqual(owned);
  });

  it("carries readable text on every state of its primary, in both modes", () => {
    for (const check of checkPreset(derived)) {
      expect(check.ratio, `${preset} — ${check.label}`).toBeGreaterThanOrEqual(TEXT_MINIMUM);
    }
  });

  it("can be read as text on the page, which also clears the focus ring's 3:1", () => {
    for (const [name, values, scopes] of [
      ["light", derived.light, [root, scale]],
      ["dark", derived.dark, [dark, root, scale]],
    ] as const) {
      const page = resolveColour(resolveReferences("var(--background)", [...scopes]));
      const { l, c, h } = values.primary;
      const primary = resolveColour(`oklch(${String(l)} ${String(c)} ${String(h)})`);
      expect(page && primary).toBeTruthy();
      expect(contrastRatio(primary!, page!), `${preset}/${name}`).toBeGreaterThanOrEqual(
        TEXT_MINIMUM,
      );
    }
  });
});

/**
 * SmoothUI's six themes, as SmoothUI defines them: a brand and a deeper
 * brand-secondary, the same in both modes.
 */
const SMOOTHUI: Record<string, { brand: Oklch; secondary: Oklch }> = {
  candy: {
    brand: { l: 0.72, c: 0.2, h: 352.53 },
    secondary: { l: 0.66, c: 0.21, h: 354.31 },
  },
  indigo: {
    brand: { l: 0.65, c: 0.22, h: 300.21 },
    secondary: { l: 0.54, c: 0.23, h: 286.53 },
  },
  blue: {
    brand: { l: 0.67, c: 0.17, h: 257.78 },
    secondary: { l: 0.59, c: 0.21, h: 258.02 },
  },
  red: {
    brand: { l: 0.67, c: 0.21, h: 24.28 },
    secondary: { l: 0.62, c: 0.25, h: 28.23 },
  },
  orange: {
    brand: { l: 0.75, c: 0.17, h: 47.65 },
    secondary: { l: 0.68, c: 0.21, h: 40.59 },
  },
  green: {
    brand: { l: 0.7, c: 0.15, h: 162.48 },
    secondary: { l: 0.6, c: 0.13, h: 163.23 },
  },
};

describe.each(Object.entries(SMOOTHUI))("SmoothUI-derived preset %s", (preset, source) => {
  it("ships", () => {
    expect(shipped).toContain(preset);
  });

  const { derived } = modes(preset);

  it("keeps SmoothUI's brand hue, and presses towards its secondary", () => {
    for (const values of [derived.light, derived.dark]) {
      expect(values.primary.h).toBe(source.brand.h);
      expect(values.primaryHover.h).toBe(source.brand.h);
      expect(values.primaryActive.h).toBe(source.secondary.h);
    }
  });

  it("uses SmoothUI's brand lightness in dark mode, where it already passes", () => {
    expect(derived.dark.primary.l).toBe(source.brand.l);
  });

  it("is darker than SmoothUI's brand in light mode, because that brand fails", () => {
    // The reason every light-mode value differs from the source, kept as a
    // check: if SmoothUI's colour passed here, the adjustment would be wrong.
    const exact = checkPreset({
      light: {
        primary: source.brand,
        primaryHover: source.brand,
        primaryActive: source.secondary,
        primaryForeground: derived.light.primaryForeground,
      },
      dark: derived.dark,
    });
    expect(exact.some((check) => check.label.startsWith("Light") && !check.passes)).toBe(true);
    expect(derived.light.primary.l).toBeLessThan(source.brand.l);
  });
});
