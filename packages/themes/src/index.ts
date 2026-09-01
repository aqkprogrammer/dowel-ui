/**
 * Typed surface of the theme layer. The CSS is the implementation; these
 * constants exist so theme switchers, the docs playground and the future CLI
 * all agree on the same vocabulary.
 */

export const THEME_PRESETS = [
  "default",
  "ocean",
  "emerald",
  "violet",
  "rose",
  "amber",
  "monochrome",
] as const;

export type ThemePreset = (typeof THEME_PRESETS)[number];

export const COLOR_MODES = ["light", "dark", "system"] as const;

export type ColorMode = (typeof COLOR_MODES)[number];

/** Attribute set on the <html> element to activate a preset. */
export const THEME_ATTRIBUTE = "data-theme";

/** Class toggled on the <html> element for dark mode. */
export const DARK_CLASS = "dark";

/**
 * Custom property that re-proportions every radius token at once.
 * `1` is the designed default; `0` gives fully square corners.
 */
export const RADIUS_SCALE_PROPERTY = "--radius-scale";

export function isThemePreset(value: string): value is ThemePreset {
  return (THEME_PRESETS as readonly string[]).includes(value);
}

export function isColorMode(value: string): value is ColorMode {
  return (COLOR_MODES as readonly string[]).includes(value);
}
