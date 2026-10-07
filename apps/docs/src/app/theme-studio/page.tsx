import { Button } from "@dowel-ui/react/button";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "~/components/site/page-header";
import { SiteShell } from "~/components/site/site-shell";
import { ThemeStudio } from "~/components/theme-studio";
import { pageMetadata } from "~/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "React theme generator with WCAG contrast checking",
  description:
    "Build a complete OKLCH theme for your React app from a single colour, and see whether every token pair passes WCAG AA contrast before you ship it.",
  path: "/theme-studio",
  keywords: [
    "react theme generator",
    "tailwind theme generator",
    "oklch color palette generator",
    "wcag contrast checker",
    "shadcn theme generator",
  ],
});

export default function ThemeStudioPage() {
  return (
    <SiteShell>
      <PageHeader
        eyebrow="Themes · Studio"
        title="Theme Studio"
        cosmic="ambient"
        seed={23}
        description="A preset reassigns four tokens and inherits everything else. Pick a primary, decide how it looks pressed and in dark mode, and see whether text can be read on it — checked with the same conversion that gates CI, so a colour this page passes is one the build will pass too."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/docs/themes">Browse the presets</Link>
          </Button>
        }
      />

      <ThemeStudio />
    </SiteShell>
  );
}
