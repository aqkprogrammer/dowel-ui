"use client";

import { Direction as DirectionPrimitive } from "radix-ui";
import type { ReactNode } from "react";

/**
 * Tells the component set which way the writing runs.
 *
 * Every direction-dependent style in this library is written logically —
 * `ps-`, `me-`, `text-end` — so the CSS follows `dir` on its own. The
 * primitives underneath do not: several of them read direction from React
 * context rather than from the document, and with no provider they assume
 * left-to-right and set `dir="ltr"` on their own elements. The result is a page
 * that mirrors correctly except for its menus, selects and sliders, which is
 * worse than one that does not mirror at all, because it looks deliberate.
 *
 * So an RTL application needs both: `dir` on the document for the CSS, and this
 * for the primitives.
 *
 * ```tsx
 * <html dir="rtl" lang="ar">
 *   <body>
 *     <DirectionProvider dir="rtl">{children}</DirectionProvider>
 *   </body>
 * </html>
 * ```
 *
 * A left-to-right application needs neither. Nothing here is required to render
 * English correctly, which is why it is easy to ship without it and never know.
 */
export interface DirectionProviderProps {
  dir: "ltr" | "rtl";
  children?: ReactNode;
}

export function DirectionProvider({ dir, children }: DirectionProviderProps) {
  return <DirectionPrimitive.Provider dir={dir}>{children}</DirectionPrimitive.Provider>;
}
