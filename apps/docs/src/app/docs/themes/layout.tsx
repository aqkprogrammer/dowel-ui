import type { Metadata } from "next";
import type { ReactNode } from "react";

import { pageMetadata } from "~/lib/site";

/**
 * The themes page is interactive — it drives live token editing — so it is a
 * client component and cannot export `metadata` itself. Declaring it on the
 * segment layout is how that page still gets a title of its own instead of
 * falling back to the site default.
 */
export const metadata: Metadata = pageMetadata({
  title: "Theming — OKLCH design tokens for React",
  description:
    "A two-tier OKLCH token system with thirteen presets. Components reference semantic tokens only, so re-skinning the whole system touches no component file.",
  path: "/docs/themes",
  keywords: [
    "react theming",
    "tailwind design tokens",
    "oklch design system",
    "dark mode react components",
    "css variables theme react",
  ],
  type: "article",
});

export default function ThemesLayout({ children }: { children: ReactNode }) {
  return children;
}
