/**
 * OKLCH → sRGB, and WCAG contrast.
 *
 * The design tokens are authored in OKLCH because its lightness is
 * perceptually even. WCAG contrast, however, is defined on sRGB relative
 * luminance — so checking the palette means actually converting it rather than
 * eyeballing the lightness numbers, which are not the same thing.
 */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** Parses `oklch(L C H)` or `oklch(L C H / A)`. L may be a percentage. */
export function parseOklch(
  value: string,
): { l: number; c: number; h: number; alpha: number } | undefined {
  const match = /^oklch\(\s*([\d.%]+)\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*([\d.]+)\s*)?\)$/.exec(
    value.trim(),
  );
  if (!match) return undefined;

  const rawL = match[1] ?? "0";
  const l = rawL.endsWith("%") ? Number.parseFloat(rawL) / 100 : Number.parseFloat(rawL);

  return {
    l,
    c: Number.parseFloat(match[2] ?? "0"),
    h: Number.parseFloat(match[3] ?? "0"),
    alpha: match[4] === undefined ? 1 : Number.parseFloat(match[4]),
  };
}

/** Linear-light sRGB, before gamma encoding. Luminance is defined on these. */
export function oklchToLinearRgb(l: number, c: number, h: number): Rgb {
  const hRad = (h * Math.PI) / 180;
  const a = c * Math.cos(hRad);
  const bb = c * Math.sin(hRad);

  const lCube = (l + 0.3963377774 * a + 0.2158037573 * bb) ** 3;
  const mCube = (l - 0.1055613458 * a - 0.0638541728 * bb) ** 3;
  const sCube = (l - 0.0894841775 * a - 1.291485548 * bb) ** 3;

  return {
    r: 4.0767416621 * lCube - 3.3077115913 * mCube + 0.2309699292 * sCube,
    g: -1.2684380046 * lCube + 2.6097574011 * mCube - 0.3413193965 * sCube,
    b: -0.0041960863 * lCube - 0.7034186147 * mCube + 1.707614701 * sCube,
  };
}

function clamp(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** WCAG 2.x relative luminance. */
export function luminance(rgb: Rgb): number {
  return 0.2126 * clamp(rgb.r) + 0.7152 * clamp(rgb.g) + 0.0722 * clamp(rgb.b);
}

/**
 * Composites a translucent colour over an opaque one.
 *
 * Several tokens are alpha values over a surface — an overlay, a tinted alert
 * background. Measuring them without compositing would report the contrast of a
 * colour nobody ever sees.
 */
export function composite(foreground: Rgb, alpha: number, background: Rgb): Rgb {
  return {
    r: foreground.r * alpha + background.r * (1 - alpha),
    g: foreground.g * alpha + background.g * (1 - alpha),
    b: foreground.b * alpha + background.b * (1 - alpha),
  };
}

export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = luminance(a);
  const lb = luminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/** `oklch(...)` string to linear RGB, composited over `over` if translucent. */
export function resolveColour(value: string, over?: Rgb): Rgb | undefined {
  const parsed = parseOklch(value);
  if (!parsed) return undefined;

  const rgb = oklchToLinearRgb(parsed.l, parsed.c, parsed.h);
  if (parsed.alpha >= 1 || !over) return rgb;
  return composite(rgb, parsed.alpha, over);
}

/** Gamma-encoded sRGB, 0–255, from linear-light sRGB. */
export function encodeSrgb(rgb: Rgb): { r: number; g: number; b: number } {
  const encode = (channel: number) => {
    const value = clamp(channel);
    const encoded = value <= 0.0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - 0.055;
    return Math.round(encoded * 255);
  };

  return { r: encode(rgb.r), g: encode(rgb.g), b: encode(rgb.b) };
}

/** Linear-light sRGB from gamma-encoded channels, each 0–255. */
export function decodeSrgb(r: number, g: number, b: number): Rgb {
  const decode = (channel: number) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };

  return { r: decode(r), g: decode(g), b: decode(b) };
}

export interface Oklch {
  l: number;
  c: number;
  h: number;
}

/**
 * Linear-light sRGB to OKLCH.
 *
 * The inverse of `oklchToLinearRgb`, needed because people pick colours as hex
 * and the tokens are authored in OKLCH. Round-tripping through this is lossy
 * only where the input is outside the OKLCH gamut the tokens use, which a hex
 * value from a colour input never is.
 */
export function linearRgbToOklch(rgb: Rgb): Oklch {
  const lCube = 0.4122214708 * rgb.r + 0.5363325363 * rgb.g + 0.0514459929 * rgb.b;
  const mCube = 0.2119034982 * rgb.r + 0.6806995451 * rgb.g + 0.1073969566 * rgb.b;
  const sCube = 0.0883024619 * rgb.r + 0.2817188376 * rgb.g + 0.6299787005 * rgb.b;

  const l_ = Math.cbrt(lCube);
  const m_ = Math.cbrt(mCube);
  const s_ = Math.cbrt(sCube);

  const l = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const b = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;

  const c = Math.sqrt(a * a + b * b);
  // atan2 returns (-180, 180]; hues are conventionally [0, 360).
  const h = c < 1e-6 ? 0 : ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;

  return { l, c, h };
}

/** `#rrggbb` (or `#rgb`) to OKLCH. Undefined for anything else. */
export function hexToOklch(hex: string): Oklch | undefined {
  const value = hex.trim().replace(/^#/, "");
  const full =
    value.length === 3
      ? value
          .split("")
          .map((digit) => digit + digit)
          .join("")
      : value;

  if (!/^[0-9a-f]{6}$/i.test(full)) return undefined;

  return linearRgbToOklch(
    decodeSrgb(
      Number.parseInt(full.slice(0, 2), 16),
      Number.parseInt(full.slice(2, 4), 16),
      Number.parseInt(full.slice(4, 6), 16),
    ),
  );
}

export function oklchToHex({ l, c, h }: Oklch): string {
  const { r, g, b } = encodeSrgb(oklchToLinearRgb(l, c, h));
  const pair = (channel: number) => channel.toString(16).padStart(2, "0");
  return `#${pair(r)}${pair(g)}${pair(b)}`;
}

/** An OKLCH triple as the tokens write it. */
export function formatOklch({ l, c, h }: Oklch): string {
  const round = (value: number, places: number) => Number(value.toFixed(places)).toString();
  return `oklch(${round(l, 3)} ${round(c, 3)} ${round(h, 1)})`;
}
