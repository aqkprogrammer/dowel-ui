import { contrastRatio, formatOklch, oklchToLinearRgb, type Oklch } from "./colour";

/**
 * Deriving a theme preset from a single colour.
 *
 * A preset in this system reassigns four tokens per mode and inherits
 * everything else, so building one is not a palette exercise — it is picking a
 * primary and then answering three questions the shipped presets already
 * answer: what it looks like pressed, what it looks like in dark mode, and what
 * text can be read on it.
 *
 * The deltas below are read off the presets that ship. They are not arbitrary:
 * every one of those passes the contrast audit in both modes, so starting from
 * the same relationships means a derived preset starts somewhere that works.
 */

/** Lightness step from the base colour to its hover state, in light mode. */
const LIGHT_HOVER_DELTA = -0.045;
/** And to its active state, which is a press and reads as further down. */
const LIGHT_ACTIVE_DELTA = -0.083;

/**
 * Dark mode raises lightness and drops chroma.
 *
 * A colour that reads as saturated on white reads as glaring on near-black, and
 * one dark enough to sit on white disappears into the background.
 */
const DARK_LIGHTNESS_DELTA = 0.115;
const DARK_CHROMA_DELTA = -0.015;
const DARK_HOVER_DELTA = 0.045;
const DARK_ACTIVE_DELTA = -0.045;

/** The near-white the shipped presets use for text on a saturated colour. */
const LIGHT_FOREGROUND: Oklch = { l: 0.985, c: 0.002, h: 265 };

/** WCAG 2.2 AA for normal text; a button label is normal text. */
export const TEXT_MINIMUM = 4.5;

function clampLightness(value: number): number {
  return Math.min(0.99, Math.max(0.01, value));
}

function ratio(a: Oklch, b: Oklch): number {
  return contrastRatio(oklchToLinearRgb(a.l, a.c, a.h), oklchToLinearRgb(b.l, b.c, b.h));
}

/**
 * Text for a saturated background: near-white, or a dark tint of its own hue.
 *
 * Whichever reads better, rather than always white. A light primary — amber,
 * lime — cannot carry white text at 4.5:1 no matter how it is nudged, and the
 * shipped `amber` preset is dark-on-light for exactly this reason.
 */
export function foregroundFor(background: Oklch): Oklch {
  const dark: Oklch = { l: 0.155, c: 0.03, h: background.h };
  return ratio(LIGHT_FOREGROUND, background) >= ratio(dark, background)
    ? LIGHT_FOREGROUND
    : dark;
}

export interface PresetMode {
  primary: Oklch;
  primaryHover: Oklch;
  primaryActive: Oklch;
  primaryForeground: Oklch;
}

export interface DerivedPreset {
  light: PresetMode;
  dark: PresetMode;
}

export interface DeriveOptions {
  /**
   * Lightness of the dark-mode primary.
   *
   * Overridable because it is the one derived value with no single right
   * answer: how bright a brand reads on near-black is a judgement about the
   * brand, not about contrast.
   */
  darkLightness?: number;
}

export function derivePreset(input: Oklch, options: DeriveOptions = {}): DerivedPreset {
  // Clamped on the way in as well as on the way out. Every value this returns
  // is one it is responsible for, including the one it was handed: a preset
  // built on pure black is not a preset anyone can use, and passing it through
  // untouched would mean the only unusable value in the output is the one that
  // was never checked.
  const primary: Oklch = { ...input, l: clampLightness(input.l), c: Math.max(0, input.c) };

  const light: PresetMode = {
    primary,
    primaryHover: { ...primary, l: clampLightness(primary.l + LIGHT_HOVER_DELTA) },
    primaryActive: { ...primary, l: clampLightness(primary.l + LIGHT_ACTIVE_DELTA) },
    primaryForeground: foregroundFor(primary),
  };

  const darkPrimary: Oklch = {
    l: clampLightness(options.darkLightness ?? primary.l + DARK_LIGHTNESS_DELTA),
    c: Math.max(0, primary.c + DARK_CHROMA_DELTA),
    h: primary.h,
  };

  const dark: PresetMode = {
    primary: darkPrimary,
    primaryHover: { ...darkPrimary, l: clampLightness(darkPrimary.l + DARK_HOVER_DELTA) },
    primaryActive: { ...darkPrimary, l: clampLightness(darkPrimary.l + DARK_ACTIVE_DELTA) },
    primaryForeground: foregroundFor(darkPrimary),
  };

  return { light, dark };
}

export interface ContrastCheck {
  label: string;
  ratio: number;
  minimum: number;
  passes: boolean;
}

/**
 * The pairs a derived preset is responsible for.
 *
 * Only these four per mode: every other pair in the system is inherited from
 * the base tokens, which the audit already covers. Reporting the inherited ones
 * would be reporting on something the person cannot change from here.
 */
export function checkPreset(preset: DerivedPreset): ContrastCheck[] {
  const checks: ContrastCheck[] = [];

  for (const [mode, values] of [
    ["Light", preset.light],
    ["Dark", preset.dark],
  ] as const) {
    for (const [state, background] of [
      ["primary", values.primary],
      ["primary-hover", values.primaryHover],
      ["primary-active", values.primaryActive],
    ] as const) {
      checks.push({
        label: `${mode}: primary-foreground on ${state}`,
        ratio: ratio(values.primaryForeground, background),
        minimum: TEXT_MINIMUM,
        passes: ratio(values.primaryForeground, background) >= TEXT_MINIMUM,
      });
    }
  }

  return checks;
}

function block(selector: string, mode: PresetMode): string {
  return [
    `${selector} {`,
    `  --primary: ${formatOklch(mode.primary)};`,
    `  --primary-hover: ${formatOklch(mode.primaryHover)};`,
    `  --primary-active: ${formatOklch(mode.primaryActive)};`,
    `  --primary-foreground: ${formatOklch(mode.primaryForeground)};`,
    `}`,
  ].join("\n");
}

/**
 * The preset as a stylesheet, in the same shape as the ones that ship.
 *
 * Deliberately the same file format rather than a bespoke export: what comes
 * out of here can be dropped into `packages/themes/src/presets/` unchanged, and
 * is then covered by the same audit as everything else.
 */
export function formatPreset(name: string, preset: DerivedPreset): string {
  return [
    `/* Theme preset: ${name}.`,
    ` * Apply with data-theme="${name}" on the <html> element. Only the brand-carrying`,
    ` * tokens are reassigned; every neutral, radius and motion token is inherited. */`,
    "",
    block(`[data-theme="${name}"]`, preset.light),
    "",
    block(`.dark[data-theme="${name}"]`, preset.dark),
    "",
  ].join("\n");
}

/** A name usable as a `data-theme` value. */
export function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug.length > 0 ? slug : "custom";
}
