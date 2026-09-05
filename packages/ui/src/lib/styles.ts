/**
 * Style fragments shared across components.
 *
 * These exist so interaction states are defined once. If focus rings or
 * disabled treatment need to change, they change here and every component
 * follows — which is what keeps the system visually coherent (design spec §12).
 */

/** Keyboard focus ring. Deliberately not applied on pointer focus. */
export const focusRing =
  "outline-none focus-visible:ring-2 focus-visible:ring-ring/55 focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/** Focus ring for controls that sit flush inside a bordered container. */
export const focusRingInset = "outline-none focus-visible:ring-2 focus-visible:ring-ring/55";

/** Applied to natively disabled elements and `aria-disabled` ones alike. */
export const disabledStyles =
  "disabled:pointer-events-none disabled:opacity-55 aria-disabled:pointer-events-none aria-disabled:opacity-55";

/** Invalid-state treatment driven by `aria-invalid`, never by a bespoke prop. */
export const invalidStyles =
  "aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive/40";

/** Sizes any icon rendered as a direct child of a control. */
export const iconSlot =
  "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4";

/**
 * Mirrors an icon that points along the reading direction.
 *
 * A chevron meaning "forward" points right in English and left in Arabic.
 * Logical CSS does not help here: the glyph is drawn, not laid out, so the
 * class list mirrors the box while the arrow inside it goes on pointing the
 * wrong way. The result is a fully mirrored page whose "next" button points
 * back the way you came.
 *
 * Only for icons whose meaning is directional. A chevron pointing *down* to
 * open a select means down in every language, and flipping it horizontally
 * would be flipping a thing that was never sided. Nor is a tick, a cross or a
 * spinner.
 */
export const mirrorForDirection = "rtl:-scale-x-100";
