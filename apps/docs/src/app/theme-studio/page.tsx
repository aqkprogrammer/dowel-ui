import type { Metadata } from "next";

import { SiteHeader } from "~/components/site-header";
import { ThemeStudio } from "~/components/theme-studio";

export const metadata: Metadata = {
  title: "Theme Studio",
  description:
    "Build a theme preset from one colour, and see whether it passes WCAG AA before you ship it.",
};

export default function ThemeStudioPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader searchEntries={[]} />

      <main id="content" className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">
        <div className="mb-8 max-w-2xl">
          <h1 className="text-2xl font-semibold tracking-tight">Theme Studio</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            A preset in this system reassigns four tokens and inherits everything else, so
            building one means picking a primary and answering three questions: what it looks
            like pressed, what it looks like in dark mode, and what text can be read on it. The
            last one is checked here with the same conversion that gates CI — so a colour this
            page passes is one the build will pass too.
          </p>
        </div>

        <ThemeStudio />
      </main>
    </div>
  );
}
