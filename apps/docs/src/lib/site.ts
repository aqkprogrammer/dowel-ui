import { branding } from "./branding";

/**
 * Where this site lives, for anything that has to be an absolute URL.
 *
 * Canonical tags, Open Graph URLs, the sitemap and JSON-LD all have to name a
 * full origin — a relative canonical is ignored, and a relative `og:image` is
 * dropped by every scraper. Next resolves them against `metadataBase`, which is
 * set from this value in the root layout.
 *
 * Deliberately NOT derived from `branding.registryUrl`. That URL is baked into
 * every published CLI and into the `extends` field of consumers' components.json,
 * so it can only move once the new host actually answers; this one has to name
 * the domain we want indexed from the first crawl, because a canonical pointing
 * at a domain we intend to abandon is a migration we would then have to
 * undo. They are allowed to disagree, and today they do.
 *
 * `VERCEL_ENV` distinguishes the production deployment from previews. Preview
 * deployments get a unique hostname each push, and any of them that Google
 * reaches is a duplicate of the real site — so previews are marked noindex
 * (see `app/robots.ts`) rather than being given a canonical they would fight.
 */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://dowelui.com";

/** True only on the production deployment, where indexing is wanted. */
export const IS_PRODUCTION_HOST =
  process.env.VERCEL_ENV === undefined || process.env.VERCEL_ENV === "production";

/**
 * The name used in search results and social cards.
 *
 * "Dowel" is the library; "Dowel UI" is what someone actually types when they
 * are looking for it, and it is the domain. Titles carry the searched form.
 */
export const SITE_NAME = `${branding.libraryName} UI`;

/** An absolute URL for a site-root-relative path. */
export function absoluteUrl(path: string): string {
  return new URL(path, SITE_URL).toString();
}

/**
 * The terms this site is trying to be found for.
 *
 * Head terms ("react ui library") are here for completeness, not because a new
 * domain wins them; the ones that can be won are the specific ones further
 * down the list, and the per-component terms built in `componentKeywords`.
 */
export const SITE_KEYWORDS = [
  "react ui library",
  "react component library",
  "react components",
  "shadcn alternative",
  "tailwind react components",
  "copy paste react components",
  "react ai components",
  "ai chat ui react",
  "react dashboard components",
  "accessible react components",
  "typescript react components",
  "radix ui components",
  "react design system",
  "open source react ui kit",
  branding.libraryName,
  SITE_NAME,
] as const;

/**
 * Search terms for one registry item.
 *
 * The pattern is the one people actually type: the framework, the thing, and
 * the word they use for it. "react data table component" and "react data table
 * example" are different searches with the same answer, so both are claimed.
 */
export function componentKeywords(title: string, category?: string): string[] {
  const lower = title.toLowerCase();
  return [
    `react ${lower}`,
    `react ${lower} component`,
    `${lower} react component`,
    `react ${lower} example`,
    `tailwind ${lower} component`,
    `shadcn ${lower}`,
    `accessible react ${lower}`,
    ...(category ? [`react ${category} components`] : []),
    "react ui library",
    SITE_NAME,
  ];
}

/**
 * Per-page metadata, with the fields that must never be inherited.
 *
 * Next merges metadata shallowly: a field a page does not set is taken from the
 * layout above it. For most fields that is the point, but for `alternates.canonical`
 * and `openGraph.url` it is a trap — a canonical set once in the root layout is
 * inherited by every page that omits one, and the whole site then declares the
 * home page as its canonical, which is an instruction to drop all of it from the
 * index. So neither is set at the root, and every page sets both through here.
 */
export function pageMetadata(options: {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  type?: "website" | "article";
}) {
  const { title, description, path, keywords, type = "website" } = options;
  return {
    title,
    description,
    ...(keywords ? { keywords } : {}),
    alternates: { canonical: path },
    openGraph: { type, url: path, title, description },
    twitter: { card: "summary_large_image" as const, title, description },
  };
}
