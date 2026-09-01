import type { Metadata } from "next";
import type { ReactNode } from "react";

import { ThemeProvider } from "~/components/theme-provider";
import { branding } from "~/lib/branding";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: `${branding.libraryName} — source-first React UI`,
    template: `%s — ${branding.libraryName}`,
  },
  description: branding.description,
};

/**
 * The theme is applied before paint by an inline script.
 *
 * Without it the page renders in light mode and then corrects itself, which is
 * a flash of the wrong colours on every navigation for anyone using dark mode.
 * Kept deliberately tiny and failure-tolerant: blocked site data must not stop
 * the page rendering.
 */
const THEME_SCRIPT = `
try {
  var mode = localStorage.getItem("docs-color-mode") || "system";
  var preset = localStorage.getItem("docs-theme-preset");
  var dark = mode === "dark" || (mode === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  if (dark) document.documentElement.classList.add("dark");
  if (preset && preset !== "default") document.documentElement.setAttribute("data-theme", preset);
} catch (error) {}
`.trim();

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-dvh bg-background text-foreground antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
