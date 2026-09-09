import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AnimatedFavicon } from "~/components/animated-favicon";
import { AstraExperience } from "~/components/astra";
import { JsonLd } from "~/components/json-ld";
import { ThemeProvider } from "~/components/theme-provider";
import { branding } from "~/lib/branding";
import { getComponents } from "~/lib/registry";
import { IS_PRODUCTION_HOST, SITE_KEYWORDS, SITE_NAME, SITE_URL } from "~/lib/site";
import {
  graph,
  organizationSchema,
  softwareApplicationSchema,
  webSiteSchema,
} from "~/lib/structured-data";

import "./globals.css";

/**
 * Site-wide metadata.
 *
 * `metadataBase` is the load-bearing line: without it every canonical and every
 * `og:image` Next generates is relative, and a relative one is not a weak
 * signal — it is discarded. Everything below inherits from here, and a page that
 * sets nothing still ships a correct absolute canonical for its own path.
 *
 * The title template carries "Dowel UI" rather than "Dowel" because that is the
 * string people search and the string the domain spells; a brand that is one
 * common English noun is not findable on its own.
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — source-first React component library`,
    template: `%s — ${SITE_NAME}`,
  },
  description: `${branding.description} Install accessible React components as source with one command — you own the code.`,
  keywords: [...SITE_KEYWORDS],
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "technology",
  // No `alternates` and no `openGraph.url` here on purpose: both are inherited
  // by any page that omits them, and a site-wide canonical pointing at "/" tells
  // Google every page is a duplicate of the home page. Pages set their own
  // through `pageMetadata`.
  // Previews serve the same bytes on a throwaway hostname; anything indexed
  // from one of those competes with the real domain.
  robots: IS_PRODUCTION_HOST
    ? {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          "max-video-preview": -1,
          "max-image-preview": "large",
          "max-snippet": -1,
        },
      }
    : { index: false, follow: false },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_US",
    title: `${SITE_NAME} — source-first React component library`,
    description: branding.description,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — source-first React component library`,
    description: branding.description,
  },
  icons: { icon: "/icon.svg" },
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
  var mode = localStorage.getItem("docs-color-mode") || "dark";
  var preset = localStorage.getItem("docs-theme-preset");
  var dark = mode === "dark" || (mode === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.dataset.astraTheme = dark ? "dark" : "light";
  if (preset && preset !== "default") document.documentElement.setAttribute("data-theme", preset);
} catch (error) {}
`.trim();

export default function RootLayout({ children }: { children: ReactNode }) {
  // The publisher, the site and the library itself, declared once at the root
  // and referenced by @id from every page below rather than repeated.
  const siteGraph = graph(
    organizationSchema(),
    webSiteSchema(),
    softwareApplicationSchema(getComponents().length),
  );

  return (
    // Dark is the default, so the server renders it: the script below only has
    // to correct the markup for a reader who has chosen otherwise.
    <html lang="en" className="dark" data-astra-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <JsonLd json={siteGraph} />
      </head>
      <body className="min-h-dvh bg-background text-foreground antialiased">
        <ThemeProvider>
          <AnimatedFavicon />
          <AstraExperience>{children}</AstraExperience>
        </ThemeProvider>
      </body>
    </html>
  );
}
