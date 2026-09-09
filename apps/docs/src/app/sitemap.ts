import type { MetadataRoute } from "next";

import { getBlocks, getComponents } from "~/lib/registry";
import { SITE_URL } from "~/lib/site";

/**
 * Every indexable URL on the site.
 *
 * Built from the registry rather than a hand-kept list, for the same reason the
 * navigation is: a component added to the registry is a page that exists, and a
 * sitemap that has to be remembered is a sitemap that goes stale one release
 * after it is written.
 *
 * Priority is relative, not absolute — Google treats it as a weak hint at best.
 * The ordering it encodes is the honest one: the entry points that convert, then
 * the component pages that are the long tail, then the reference material.
 */

export const dynamic = "force-static";

const LAST_MODIFIED = new Date();

/** Static routes, with the ones a first-time visitor lands on ranked highest. */
const STATIC_ROUTES: {
  path: string;
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
}[] = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/docs", priority: 0.9, changeFrequency: "weekly" },
  { path: "/docs/components", priority: 0.9, changeFrequency: "weekly" },
  { path: "/docs/blocks", priority: 0.9, changeFrequency: "weekly" },
  { path: "/docs/installation", priority: 0.8, changeFrequency: "monthly" },
  { path: "/docs/cli", priority: 0.7, changeFrequency: "monthly" },
  { path: "/docs/themes", priority: 0.7, changeFrequency: "monthly" },
  { path: "/docs/ai-agents", priority: 0.7, changeFrequency: "monthly" },
  { path: "/docs/accessibility", priority: 0.6, changeFrequency: "monthly" },
  { path: "/docs/private-registry", priority: 0.6, changeFrequency: "monthly" },
  { path: "/playground", priority: 0.7, changeFrequency: "weekly" },
  { path: "/theme-studio", priority: 0.7, changeFrequency: "monthly" },
  { path: "/generate", priority: 0.6, changeFrequency: "monthly" },
  { path: "/quality", priority: 0.6, changeFrequency: "weekly" },
  { path: "/pricing", priority: 0.8, changeFrequency: "monthly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: new URL(route.path, SITE_URL).toString(),
    lastModified: LAST_MODIFIED,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  for (const component of getComponents()) {
    entries.push({
      url: new URL(`/docs/components/${component.name}`, SITE_URL).toString(),
      lastModified: LAST_MODIFIED,
      changeFrequency: "monthly",
      priority: 0.8,
    });
  }

  for (const block of getBlocks()) {
    entries.push({
      url: new URL(`/docs/blocks/${block.name}`, SITE_URL).toString(),
      lastModified: LAST_MODIFIED,
      changeFrequency: "monthly",
      priority: 0.7,
    });
  }

  return entries;
}
