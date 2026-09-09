import type { MetadataRoute } from "next";

import { branding } from "~/lib/branding";
import { SITE_NAME } from "~/lib/site";

/**
 * The web app manifest.
 *
 * Not because the docs are an installable app — they are not — but because it
 * is where a browser and an aggregator look for the canonical short name and
 * theme colour, and leaving it out means each of them guesses.
 */
export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: branding.libraryName,
    description: branding.description,
    start_url: "/",
    display: "standalone",
    // The site renders dark first; a light background here would flash white
    // on launch, which is the same bug the theme script exists to prevent.
    background_color: "#08080b",
    theme_color: "#08080b",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
