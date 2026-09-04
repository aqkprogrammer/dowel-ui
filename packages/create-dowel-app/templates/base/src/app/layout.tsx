import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "__PROJECT_NAME__",
  description: "Built with __LIBRARY_NAME__.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    /*
      `data-theme` selects the preset and the `dark` class selects the mode;
      they are independent, so every preset works in both. Swap the preset here,
      or drive it from a theme switcher — no component file changes either way.
    */
    <html lang="en" data-theme="__THEME__" suppressHydrationWarning>
      <body className="bg-background text-foreground antialiased">{children}</body>
    </html>
  );
}
