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
