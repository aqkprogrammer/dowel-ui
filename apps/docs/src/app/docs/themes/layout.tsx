import type { Metadata } from "next";
import type { ReactNode } from "react";

/**
 * The themes page is interactive — it drives live token editing — so it is a
 * client component and cannot export `metadata` itself. Declaring it on the
 * segment layout is how that page still gets a title of its own instead of
 * falling back to the site default.
 */
export const metadata: Metadata = {
  title: "Themes",
  description: "Presets, semantic tokens and the radius scale.",
};

export default function ThemesLayout({ children }: { children: ReactNode }) {
  return children;
}
