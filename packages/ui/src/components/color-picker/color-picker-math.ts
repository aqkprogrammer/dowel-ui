// Original design.

/*
 * The colour arithmetic behind ColorPicker, with no DOM and no React, so it is
 * tested directly. The picker edits in HSV (the area is saturation × value,
 * the slider is hue) because that is the model a square of colour maps onto
 * one to one; it reads and writes hex, rgb() and oklch(), and measures WCAG
 * contrast from relative luminance.
 */

export interface Rgba {
  /** 0–255. */
  r: number;
  g: number;
  b: number;
  /** 0–1. */
  a: number;
}

export interface Hsva {
  /** 0–360. */
  h: number;
  /** 0–1. */
  s: number;
  v: number;
  a: number;
}

export type ColorFormat = "hex" | "rgb" | "oklch";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function round(value: number, places = 0): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

/**
 * Reads `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`, `rgb()`/`rgba()` in either the
 * comma or the space syntax, `oklch()`, and `color(srgb …)`. Anything else is
 * undefined, not a guess.
 */
export function parseColor(input: string): Rgba | undefined {
  const text = input.trim().toLowerCase();

  const hex = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.exec(text)?.[1];
  if (hex) {
    const full =
      hex.length <= 4
        ? hex
            .split("")
            .map((digit) => digit + digit)
            .join("")
        : hex;
    const channel = (at: number) => Number.parseInt(full.slice(at, at + 2), 16);
    return {
      r: channel(0),
      g: channel(2),
      b: channel(4),
      a: full.length === 8 ? round(channel(6) / 255, 3) : 1,
    };
  }

  const rgb = /^rgba?\(\s*([^)]*)\)$/.exec(text)?.[1];
  if (rgb) {
    const parts = rgb.split(/[\s,/]+/).filter(Boolean);
    if (parts.length !== 3 && parts.length !== 4) return undefined;
    const channel = (part: string) =>
      part.endsWith("%") ? (Number.parseFloat(part) / 100) * 255 : Number.parseFloat(part);
    const [r, g, b] = parts.slice(0, 3).map(channel);
    const alphaPart = parts[3];
    const a =
      alphaPart === undefined
        ? 1
        : alphaPart.endsWith("%")
          ? Number.parseFloat(alphaPart) / 100
          : Number.parseFloat(alphaPart);
    if ([r, g, b, a].some((value) => value === undefined || !Number.isFinite(value))) {
      return undefined;
    }
    return {
      r: clamp(round(r ?? 0), 0, 255),
      g: clamp(round(g ?? 0), 0, 255),
      b: clamp(round(b ?? 0), 0, 255),
      a: clamp(a, 0, 1),
    };
  }

  const oklch = /^oklch\(\s*([^)]*)\)$/.exec(text)?.[1];
  if (oklch) {
    const parts = oklch.split(/[\s/]+/).filter(Boolean);
    if (parts.length !== 3 && parts.length !== 4) return undefined;
    const [lightness, chroma, hue, alphaPart] = parts;
    const l = lightness?.endsWith("%")
      ? Number.parseFloat(lightness) / 100
      : Number.parseFloat(lightness ?? "");
    const c = Number.parseFloat(chroma ?? "");
    const h = hue === "none" ? 0 : Number.parseFloat(hue ?? "");
    const a = alphaPart === undefined ? 1 : parseAlpha(alphaPart);
    if (![l, c, h, a].every(Number.isFinite)) return undefined;
    return { ...oklchToRgba(l, c, h), a: clamp(a, 0, 1) };
  }

  // What browsers report for some computed colours, color-mix() among them.
  const srgb = /^color\(\s*srgb\s+([^)]*)\)$/.exec(text)?.[1];
  if (srgb) {
    const parts = srgb.split(/[\s/]+/).filter(Boolean);
    if (parts.length !== 3 && parts.length !== 4) return undefined;
    const [r, g, b] = parts.slice(0, 3).map((part) => Number.parseFloat(part) * 255);
    const a = parts[3] === undefined ? 1 : parseAlpha(parts[3]);
    if (![r, g, b, a].every((value) => value !== undefined && Number.isFinite(value))) {
      return undefined;
    }
    return {
      r: clamp(round(r ?? 0), 0, 255),
      g: clamp(round(g ?? 0), 0, 255),
      b: clamp(round(b ?? 0), 0, 255),
      a: clamp(a, 0, 1),
    };
  }

  return undefined;
}

function parseAlpha(part: string): number {
  return part.endsWith("%") ? Number.parseFloat(part) / 100 : Number.parseFloat(part);
}

function encode(channel: number): number {
  const c = clamp(channel, 0, 1);
  return round((c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055) * 255);
}

/**
 * OKLCH to sRGB. Colours outside the sRGB gamut are clipped per channel, which
 * is what a hex or rgb() value can hold.
 */
export function oklchToRgba(l: number, c: number, h: number): Rgba {
  const radians = (h * Math.PI) / 180;
  const A = c * Math.cos(radians);
  const B = c * Math.sin(radians);
  const lp = (l + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const mp = (l - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const sp = (l - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return {
    r: encode(4.0767416621 * lp - 3.3077115913 * mp + 0.2309699292 * sp),
    g: encode(-1.2684380046 * lp + 2.6097574011 * mp - 0.3413193965 * sp),
    b: encode(-0.0041960863 * lp - 0.7034186147 * mp + 1.707614701 * sp),
    a: 1,
  };
}

export function rgbaToHsva({ r, g, b, a }: Rgba): Hsva {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  let h = 0;
  if (delta > 0) {
    if (max === red) h = ((green - blue) / delta) % 6;
    else if (max === green) h = (blue - red) / delta + 2;
    else h = (red - green) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max === 0 ? 0 : delta / max, v: max, a };
}

export function hsvaToRgba({ h, s, v, a }: Hsva): Rgba {
  const hue = ((h % 360) + 360) % 360;
  const chroma = v * s;
  const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = v - chroma;
  const [red, green, blue] =
    hue < 60
      ? [chroma, x, 0]
      : hue < 120
        ? [x, chroma, 0]
        : hue < 180
          ? [0, chroma, x]
          : hue < 240
            ? [0, x, chroma]
            : hue < 300
              ? [x, 0, chroma]
              : [chroma, 0, x];
  return {
    r: round((red + m) * 255),
    g: round((green + m) * 255),
    b: round((blue + m) * 255),
    a,
  };
}

function hexByte(value: number): string {
  return clamp(round(value), 0, 255).toString(16).padStart(2, "0");
}

function linear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** sRGB to OKLCH, through Björn Ottosson's OKLab matrices. */
export function rgbaToOklch({ r, g, b }: Rgba): { l: number; c: number; h: number } {
  const red = linear(r);
  const green = linear(g);
  const blue = linear(b);
  const l = Math.cbrt(0.4122214708 * red + 0.5363325363 * green + 0.0514459929 * blue);
  const m = Math.cbrt(0.2119034982 * red + 0.6806995451 * green + 0.1073969566 * blue);
  const s = Math.cbrt(0.0883024619 * red + 0.2817188376 * green + 0.6299787005 * blue);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const C = Math.sqrt(A * A + B * B);
  let H = (Math.atan2(B, A) * 180) / Math.PI;
  if (H < 0) H += 360;
  return { l: L, c: C, h: C < 0.0001 ? 0 : H };
}

/** A colour written in `format`. Alpha appears only when it is not 1. */
export function formatColor(color: Rgba, format: ColorFormat): string {
  const alpha = round(color.a, 3);
  switch (format) {
    case "hex":
      return `#${hexByte(color.r)}${hexByte(color.g)}${hexByte(color.b)}${alpha < 1 ? hexByte(alpha * 255) : ""}`;
    case "rgb":
      return alpha < 1
        ? `rgb(${String(color.r)} ${String(color.g)} ${String(color.b)} / ${String(alpha)})`
        : `rgb(${String(color.r)} ${String(color.g)} ${String(color.b)})`;
    case "oklch": {
      const { l, c, h } = rgbaToOklch(color);
      const body = `${String(round(l * 100, 1))}% ${String(round(c, 3))} ${String(round(h, 1))}`;
      return alpha < 1 ? `oklch(${body} / ${String(alpha)})` : `oklch(${body})`;
    }
  }
}

/** WCAG 2 relative luminance, 0 (black) to 1 (white). */
export function relativeLuminance({ r, g, b }: Rgba): number {
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

/** WCAG 2 contrast ratio between two opaque colours, 1–21. */
export function contrastRatio(a: Rgba, b: Rgba): number {
  const first = relativeLuminance(a);
  const second = relativeLuminance(b);
  const [light, dark] = first > second ? [first, second] : [second, first];
  return (light + 0.05) / (dark + 0.05);
}

/**
 * The WCAG level a contrast ratio meets for normal text: AAA from 7, AA from
 * 4.5, AA for large text only from 3.
 */
export function contrastLevel(ratio: number): "AAA" | "AA" | "AA large" | "fail" {
  if (ratio >= 7) return "AAA";
  if (ratio >= 4.5) return "AA";
  if (ratio >= 3) return "AA large";
  return "fail";
}

/** The colour the picker opens on when given none: Dowel's own indigo. */
export const DEFAULT_COLOR = "#5b5bd6";

/** The hue spectrum, as a CSS gradient for the hue track. */
export const HUE_GRADIENT = `linear-gradient(to right, ${[0, 60, 120, 180, 240, 300, 360]
  .map((h) => formatColor(hsvaToRgba({ h, s: 1, v: 1, a: 1 }), "hex"))
  .join(", ")})`;

/**
 * The saturation × brightness square for a hue: white to the pure hue across,
 * fading to black downward. These ends are the HSV model itself, not theme
 * colours, which is why they live here and not in the component.
 */
export function areaBackground(hue: number): string {
  const pure = formatColor(hsvaToRgba({ h: hue, s: 1, v: 1, a: 1 }), "hex");
  return `linear-gradient(to top, #000000, transparent), linear-gradient(to right, #ffffff, ${pure})`;
}

/** A gradient from transparent to `color`, for the alpha track. */
export function alphaGradient(color: Rgba): string {
  const opaque = formatColor({ ...color, a: 1 }, "hex");
  return `linear-gradient(to right, transparent, ${opaque})`;
}

/** Examples of what the text field accepts, for its error message. */
export const COLOR_EXAMPLES = "#3b82f6, rgb(59 130 246) or oklch(62% 0.19 260)";
