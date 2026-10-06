/**
 * Colour written past the semantic layer.
 *
 * A component or a page that reaches for `bg-slate-900` or `#3b82f6` stops
 * responding to themes: switch preset, or into dark mode, and that one thing
 * stays the wrong colour. The semantic tokens (`bg-primary`,
 * `text-muted-foreground`) are what move.
 */

/** Tailwind utilities that take a colour. */
const COLOUR_UTILITIES =
  "bg|text|border|ring|fill|stroke|from|via|to|outline|divide|decoration|shadow|accent|caret|placeholder";

const PALETTES =
  "neutral|red|green|amber|blue|slate|gray|grey|zinc|stone|orange|yellow|lime|emerald|teal|cyan|sky|indigo|violet|purple|fuchsia|pink|rose";

/** A class from Tailwind's own palette, e.g. `bg-slate-900` or `text-blue-500/50`. */
export const PALETTE_CLASS = new RegExp(
  `\\b(?:${COLOUR_UTILITIES})-(?:${PALETTES})-\\d{2,3}\\b`,
  "g",
);

/** A literal colour anywhere: hex, rgb(), hsl(), oklch(). */
export const LITERAL_COLOUR = /(#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(|\boklch\()/g;

/**
 * A literal colour inside a Tailwind arbitrary value, e.g. `bg-[#1e293b]`.
 *
 * What the project audit looks for instead of every literal: a colour constant
 * in application code (a chart series, a brand mark) can be deliberate, but a
 * literal in a class is always a token that was skipped.
 */
export const ARBITRARY_COLOUR = new RegExp(
  `\\b(?:${COLOUR_UTILITIES})-\\[(?:#[0-9a-fA-F]{3,8}|(?:rgba?|hsla?|oklch)\\([^\\]]*\\))\\]`,
  "g",
);

/** A literal colour in an inline style object: `style={{ color: "#fff" }}`. */
export const INLINE_STYLE_COLOUR =
  /\b(?:color|background(?:Color)?|borderColor|fill|stroke|outlineColor)\s*:\s*["'`](#[0-9a-fA-F]{3,8}|(?:rgba?|hsla?|oklch)\([^"'`]*\))["'`]/g;
