import { encodeSrgb, oklchToLinearRgb, parseOklch, formatOklch } from "./colour";
import type { DerivedPreset, PresetMode } from "./preset";

/**
 * The tokens, in the shape a design tool reads.
 *
 * The CSS is the source of truth and stays that way — nothing here is a second
 * palette to keep in step. This reads the same `tokens.css`, `base.css` and
 * preset files the components consume, resolves every `var()` the way a
 * browser would, and writes the result as W3C Design Tokens (DTCG): the format
 * Tokens Studio for Figma imports directly, and the one every other design
 * tool is converging on.
 *
 * Colours come out as sRGB hex. Figma has no OKLCH; converting here, with the
 * same maths the contrast audit uses, means the swatch a designer sees is the
 * colour a user gets — rather than whatever a tool makes of an `oklch()` string
 * it cannot parse.
 */

/** A flat map of custom property name (without the leading `--`) to raw value. */
export type Declarations = Record<string, string>;

/** A W3C Design Tokens document: nested groups whose leaves carry `$type` and `$value`. */
export interface DesignToken {
  $type: "color" | "dimension" | "fontFamily" | "number";
  $value: string | number | string[];
  $description?: string;
}

export interface DesignTokenGroup {
  [key: string]: DesignToken | DesignTokenGroup | string | undefined;
  $description?: string;
}

/** Strips block comments, which otherwise hide `--x: y;` pairs inside them from the parser. */
function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

/**
 * The declarations inside the first block whose selector is exactly `selector`.
 *
 * Exact, not substring: `.dark` must not match `.dark[data-theme="ocean"]`, and
 * `:root` must not match `:root[dir="rtl"]`. Whitespace inside a value is
 * collapsed, because a font stack written over four lines is one value.
 */
export function parseTokenCss(css: string, selector: string): Declarations {
  const clean = stripComments(css);
  const declarations: Declarations = {};

  let searchFrom = 0;
  for (;;) {
    const brace = clean.indexOf("{", searchFrom);
    if (brace === -1) break;

    // The selector is whatever sits between the previous `}` (or `;`, or the
    // start) and this `{`.
    const start = Math.max(
      clean.lastIndexOf("}", brace),
      clean.lastIndexOf(";", brace),
      clean.lastIndexOf("{", brace - 1),
    );
    const candidate = clean.slice(start + 1, brace).trim();
    const end = clean.indexOf("}", brace);
    if (end === -1) break;

    if (candidate === selector) {
      const body = clean.slice(brace + 1, end);
      for (const match of body.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) {
        const name = match[1];
        const value = match[2];
        if (name && value) declarations[name] = value.replace(/\s+/g, " ").trim();
      }
      return declarations;
    }

    searchFrom = end + 1;
  }

  return declarations;
}

/**
 * Resolves `var(--x)` references the way the cascade would.
 *
 * `scopes` are searched in order, so a mode's own declarations shadow the root's
 * and the root's shadow the raw scale — which is exactly what `.dark { --x }`
 * over `:root { --x }` over `@theme { --x }` means. A fallback inside the
 * `var()` is used when nothing defines the name, and an unresolvable reference
 * is left as written rather than silently dropped.
 */
export function resolveReferences(value: string, scopes: Declarations[]): string {
  let current = value;
  // Bounded, so a cycle terminates with the reference left in place rather
  // than hanging the build.
  for (let depth = 0; depth < 16; depth += 1) {
    const next = current.replace(
      /var\(\s*--([\w-]+)\s*(?:,\s*([^()]*(?:\([^()]*\))?[^()]*))?\)/g,
      (whole, name: string, fallback: string | undefined) => {
        for (const scope of scopes) {
          const found = scope[name];
          if (found !== undefined) return found;
        }
        return fallback?.trim() ?? whole;
      },
    );
    if (next === current) return current;
    current = next;
  }
  return current;
}

/** `oklch(...)` to `#rrggbb`, or `#rrggbbaa` when it carries alpha. */
export function cssColourToHex(value: string): string | undefined {
  const parsed = parseOklch(value.trim());
  if (!parsed) return undefined;

  const { r, g, b } = encodeSrgb(oklchToLinearRgb(parsed.l, parsed.c, parsed.h));
  const pair = (channel: number) => channel.toString(16).padStart(2, "0");
  const rgb = `#${pair(r)}${pair(g)}${pair(b)}`;
  return parsed.alpha >= 1 ? rgb : `${rgb}${pair(Math.round(parsed.alpha * 255))}`;
}

const ROOT_FONT_PX = 16;

/**
 * A length in px, for the values the scale is written in.
 *
 * Handles the two shapes the tokens use: a plain `rem`/`px`, and the radius
 * ladder's `calc(<rem> * var(--radius-scale, 1))`, which is resolved with the
 * given scale so an exported theme carries the corner radius it was designed
 * with rather than a formula Figma cannot evaluate.
 */
export function cssLengthToPx(value: string, radiusScale = 1): number | undefined {
  const trimmed = value.trim();

  const calc = /^calc\(\s*([\d.]+)rem\s*\*\s*var\(--radius-scale(?:,\s*[\d.]+)?\)\s*\)$/.exec(
    trimmed,
  );
  if (calc?.[1]) return round(Number.parseFloat(calc[1]) * ROOT_FONT_PX * radiusScale);

  const rem = /^([\d.]+)rem$/.exec(trimmed);
  if (rem?.[1]) return round(Number.parseFloat(rem[1]) * ROOT_FONT_PX);

  const px = /^([\d.]+)px$/.exec(trimmed);
  if (px?.[1]) return round(Number.parseFloat(px[1]));

  return undefined;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function px(value: number): string {
  return `${String(value)}px`;
}

/** The four tokens a derived preset owns, as declarations, per mode. */
export function presetDeclarations(preset: DerivedPreset): {
  light: Declarations;
  dark: Declarations;
} {
  const mode = (entry: PresetMode): Declarations => ({
    primary: formatOklch(entry.primary),
    "primary-hover": formatOklch(entry.primaryHover),
    "primary-active": formatOklch(entry.primaryActive),
    "primary-foreground": formatOklch(entry.primaryForeground),
  });
  return { light: mode(preset.light), dark: mode(preset.dark) };
}

export interface DesignTokensInput {
  /** Named in the document, e.g. "ocean" or a studio preset's slug. */
  name: string;
  /** The `@theme` block of tokens.css: the raw scales. */
  scale: Declarations;
  /** The `:root` block of base.css. */
  light: Declarations;
  /** The `.dark` block of base.css. */
  dark: Declarations;
  /** A preset's overrides, layered over `light` and `dark`. */
  preset?: { light: Declarations; dark: Declarations };
  /** The `--radius-scale` the theme was designed at. */
  radiusScale?: number;
}

function colourGroup(
  declarations: Declarations,
  scopes: Declarations[],
  filter: (name: string) => boolean,
): DesignTokenGroup {
  const group: DesignTokenGroup = {};
  for (const [name, raw] of Object.entries(declarations)) {
    if (!filter(name)) continue;
    const hex = cssColourToHex(resolveReferences(raw, scopes));
    if (hex) group[name] = { $type: "color", $value: hex };
  }
  return group;
}

/** `--color-neutral-500` → `neutral.500`, nested. */
function scaleColours(scale: Declarations): DesignTokenGroup {
  const group: DesignTokenGroup = {};
  for (const [name, raw] of Object.entries(scale)) {
    const match = /^color-([a-z]+)-(\d+)$/.exec(name);
    if (!match) continue;
    const [, family, step] = match;
    if (!family || !step) continue;
    const hex = cssColourToHex(raw);
    if (!hex) continue;
    const familyGroup = (group[family] ??= {}) as DesignTokenGroup;
    familyGroup[step] = { $type: "color", $value: hex };
  }
  return group;
}

function radii(scale: Declarations, radiusScale: number): DesignTokenGroup {
  const group: DesignTokenGroup = {};
  for (const [name, raw] of Object.entries(scale)) {
    const match = /^radius-([\w]+)$/.exec(name);
    if (!match?.[1]) continue;
    const length = cssLengthToPx(raw, radiusScale);
    if (length !== undefined) group[match[1]] = { $type: "dimension", $value: px(length) };
  }
  return group;
}

function typography(scale: Declarations): DesignTokenGroup {
  const family: DesignTokenGroup = {};
  for (const [name, raw] of Object.entries(scale)) {
    const match = /^font-([a-z]+)$/.exec(name);
    if (!match?.[1]) continue;
    family[match[1]] = {
      $type: "fontFamily",
      $value: raw.split(",").map((entry) => entry.trim().replace(/^["']|["']$/g, "")),
    };
  }

  const size: DesignTokenGroup = {};
  for (const [name, raw] of Object.entries(scale)) {
    const step = /^text-([\w]+)$/.exec(name)?.[1];
    if (!step) continue;
    const fontSize = cssLengthToPx(raw);
    if (fontSize === undefined) continue;
    const entry: DesignTokenGroup = { size: { $type: "dimension", $value: px(fontSize) } };
    const lineHeight = scale[`text-${step}--line-height`];
    const lineHeightPx = lineHeight === undefined ? undefined : cssLengthToPx(lineHeight);
    if (lineHeightPx !== undefined) {
      entry.lineHeight = { $type: "dimension", $value: px(lineHeightPx) };
    }
    size[step] = entry;
  }

  return { family, text: size };
}

/**
 * The whole theme, as a design-tokens document.
 *
 * Three sets: `core` (the raw scales, the same in both modes), `light` and
 * `dark` (the semantic colours, resolved). A designer enables `core` plus one
 * mode, which mirrors exactly how the CSS composes.
 */
export function toDesignTokens(input: DesignTokensInput): DesignTokenGroup {
  const radiusScale = input.radiusScale ?? 1;
  const light: Declarations = { ...input.light, ...input.preset?.light };
  const dark: Declarations = { ...input.dark, ...input.preset?.dark };

  const semantic = (name: string) => name !== "radius-scale" && !name.startsWith("color-");

  return {
    $description: `Dowel design tokens, preset "${input.name}". Generated from the CSS the components use; colours are sRGB hex converted from OKLCH.`,
    core: {
      color: scaleColours(input.scale),
      radius: radii(input.scale, radiusScale),
      font: typography(input.scale),
    },
    light: {
      color: colourGroup(light, [light, input.scale], semantic),
    },
    dark: {
      // Dark declares only what differs; the rest inherits from the root.
      color: colourGroup({ ...light, ...dark }, [dark, light, input.scale], semantic),
    },
  };
}
