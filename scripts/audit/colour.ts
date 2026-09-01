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
