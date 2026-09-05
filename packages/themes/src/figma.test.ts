import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  cssColourToHex,
  cssLengthToPx,
  parseTokenCss,
  presetDeclarations,
  resolveReferences,
  toDesignTokens,
  type DesignToken,
  type DesignTokenGroup,
} from "./figma";
import { derivePreset } from "./preset";

const here = dirname(fileURLToPath(import.meta.url));
const tokensCss = readFileSync(join(here, "tokens.css"), "utf8");
const baseCss = readFileSync(join(here, "base.css"), "utf8");
const oceanCss = readFileSync(join(here, "presets", "ocean.css"), "utf8");

function token(group: DesignTokenGroup, path: string): DesignToken {
  let current: DesignTokenGroup | DesignToken | string | undefined = group;
  for (const segment of path.split(".")) {
    if (typeof current !== "object") throw new Error(`No token at ${path}`);
    current = (current as DesignTokenGroup)[segment];
  }
  if (typeof current !== "object" || !("$value" in current) || !("$type" in current)) {
    throw new Error(`No token at ${path}`);
  }
  return current as DesignToken;
}

describe("parseTokenCss", () => {
  it("reads the declarations of exactly the block asked for", () => {
    const css = `
      /* :root { --decoy: oklch(0 0 0); } */
      :root { --a: 1; --b: var(--a); }
      .dark { --a: 2; }
      .dark[data-theme="x"] { --a: 3; }
    `;
    expect(parseTokenCss(css, ":root")).toEqual({ a: "1", b: "var(--a)" });
    expect(parseTokenCss(css, ".dark")).toEqual({ a: "2" });
    expect(parseTokenCss(css, '.dark[data-theme="x"]')).toEqual({ a: "3" });
    expect(parseTokenCss(css, "[data-theme='nope']")).toEqual({});
  });

  it("collapses a value written over several lines", () => {
    const scale = parseTokenCss(tokensCss, "@theme");
    expect(scale["font-sans"]).toMatch(/^ui-sans-serif, system-ui/);
    expect(scale["font-sans"]).not.toContain("\n");
  });

  it("finds the real blocks in the shipped CSS", () => {
    expect(parseTokenCss(tokensCss, "@theme")["color-neutral-500"]).toBe(
      "oklch(0.532 0.015 265)",
    );
    expect(parseTokenCss(baseCss, ":root").primary).toBe("oklch(0.545 0.196 275)");
    expect(parseTokenCss(baseCss, ".dark").background).toBe("var(--color-neutral-950)");
    expect(parseTokenCss(oceanCss, '[data-theme="ocean"]').primary).toBeDefined();
  });
});

describe("resolveReferences", () => {
  it("follows a chain through the scopes in order", () => {
    const scale = { "color-neutral-900": "oklch(0.212 0.011 265)" };
    const root = {
      foreground: "var(--color-neutral-900)",
      ring: "var(--primary)",
      primary: "a",
    };
    const dark = { primary: "b" };
    expect(resolveReferences("var(--foreground)", [dark, root, scale])).toBe(
      "oklch(0.212 0.011 265)",
    );
    // The mode's own value shadows the root's.
    expect(resolveReferences("var(--ring)", [dark, root, scale])).toBe("b");
    expect(resolveReferences("var(--ring)", [root, scale])).toBe("a");
  });

  it("uses the fallback when nothing defines the name, and leaves the unresolvable alone", () => {
    expect(resolveReferences("calc(1rem * var(--radius-scale, 1))", [])).toBe("calc(1rem * 1)");
    expect(resolveReferences("var(--missing)", [])).toBe("var(--missing)");
  });

  it("terminates on a cycle", () => {
    expect(resolveReferences("var(--a)", [{ a: "var(--b)", b: "var(--a)" }])).toMatch(/^var\(/);
  });
});

describe("cssColourToHex", () => {
  it("converts OKLCH to sRGB hex", () => {
    expect(cssColourToHex("oklch(1 0 0)")).toBe("#ffffff");
    expect(cssColourToHex("oklch(0 0 0)")).toBe("#000000");
  });

  it("keeps alpha as a fourth pair", () => {
    expect(cssColourToHex("oklch(0.212 0.011 265 / 0.55)")).toMatch(/^#[0-9a-f]{6}8c$/);
  });

  it("refuses anything that is not a colour", () => {
    expect(cssColourToHex("var(--primary)")).toBeUndefined();
  });
});

describe("cssLengthToPx", () => {
  it("evaluates the radius ladder at the given scale", () => {
    expect(cssLengthToPx("calc(0.5rem * var(--radius-scale, 1))")).toBe(8);
    expect(cssLengthToPx("calc(0.5rem * var(--radius-scale, 1))", 0.5)).toBe(4);
    expect(cssLengthToPx("9999px")).toBe(9999);
    expect(cssLengthToPx("0.9375rem")).toBe(15);
  });

  it("refuses what it cannot evaluate", () => {
    expect(cssLengthToPx("-0.014em")).toBeUndefined();
  });
});

describe("toDesignTokens", () => {
  const input = {
    name: "default",
    scale: parseTokenCss(tokensCss, "@theme"),
    light: parseTokenCss(baseCss, ":root"),
    dark: parseTokenCss(baseCss, ".dark"),
  };

  it("writes every semantic colour, resolved, for both modes", () => {
    const tokens = toDesignTokens(input);

    expect(token(tokens, "light.color.background")).toEqual({
      $type: "color",
      $value: "#ffffff",
    });
    // Dark inherits what it does not redeclare, and shadows what it does.
    expect(token(tokens, "dark.color.background").$value).not.toBe("#ffffff");
    expect(token(tokens, "dark.color.ring").$value).toBe(
      token(tokens, "dark.color.primary").$value,
    );
    expect(token(tokens, "light.color.ring").$value).toBe(
      token(tokens, "light.color.primary").$value,
    );
  });

  it("carries the raw scale as core, with nested colour families", () => {
    const tokens = toDesignTokens(input);
    expect(token(tokens, "core.color.neutral.500").$type).toBe("color");
    expect(token(tokens, "core.radius.md")).toEqual({ $type: "dimension", $value: "8px" });
    expect(token(tokens, "core.font.text.base.size")).toEqual({
      $type: "dimension",
      $value: "15px",
    });
    expect(token(tokens, "core.font.family.sans").$type).toBe("fontFamily");
  });

  it("layers a preset over the base, per mode", () => {
    const withOcean = toDesignTokens({
      ...input,
      name: "ocean",
      preset: {
        light: parseTokenCss(oceanCss, '[data-theme="ocean"]'),
        dark: parseTokenCss(oceanCss, '.dark[data-theme="ocean"]'),
      },
    });
    const plain = toDesignTokens(input);

    expect(token(withOcean, "light.color.primary").$value).not.toBe(
      token(plain, "light.color.primary").$value,
    );
    expect(token(withOcean, "light.color.background").$value).toBe(
      token(plain, "light.color.background").$value,
    );
  });

  it("evaluates the radius ladder at the scale the theme was designed with", () => {
    const tokens = toDesignTokens({ ...input, radiusScale: 0 });
    expect(token(tokens, "core.radius.lg").$value).toBe("0px");
    expect(token(tokens, "core.radius.full").$value).toBe("9999px");
  });

  it("accepts a derived preset from the studio", () => {
    const preset = presetDeclarations(derivePreset({ l: 0.5, c: 0.15, h: 200 }));
    expect(Object.keys(preset.light)).toEqual([
      "primary",
      "primary-hover",
      "primary-active",
      "primary-foreground",
    ]);
    const tokens = toDesignTokens({ ...input, name: "brand", preset });
    expect(token(tokens, "light.color.primary").$value).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("never leaves a var() in the output", () => {
    const tokens = toDesignTokens(input);
    expect(JSON.stringify(tokens)).not.toContain("var(");
  });
});
