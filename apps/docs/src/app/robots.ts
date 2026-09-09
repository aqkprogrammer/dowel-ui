import type { MetadataRoute } from "next";

import { IS_PRODUCTION_HOST, SITE_URL } from "~/lib/site";

/**
 * What may be crawled.
 *
 * Two decisions worth stating.
 *
 * Preview deployments answer `Disallow: /`. Every push gets its own hostname
 * serving a byte-identical site; each one Google finds is a duplicate competing
 * with the real domain, and the fix has to be a refusal to crawl rather than a
 * canonical, because a canonical is a hint and there are unboundedly many of
 * these hosts.
 *
 * AI crawlers are named and allowed on purpose. This library's actual audience
 * reaches it through a coding assistant at least as often as through a search
 * box, and the site already publishes `/llms.txt` and `/llms-full.txt` for
 * exactly that reader. Allowing them is the whole point of having written those.
 *
 * `/r/pro/` is excluded not as a security measure — the route itself refuses
 * anyone without a licence — but so crawlers stop requesting URLs that can only
 * ever answer 401.
 */

export const dynamic = "force-static";

const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-User",
  "Claude-SearchBot",
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "meta-externalagent",
  "Bytespider",
  "CCBot",
  "cohere-ai",
  "Diffbot",
  "Amazonbot",
  "DuckAssistBot",
  "MistralAI-User",
  "YouBot",
];

const PRIVATE_PATHS = ["/r/pro/", "/r/license"];

export default function robots(): MetadataRoute.Robots {
  if (!IS_PRODUCTION_HOST) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE_PATHS },
      ...AI_CRAWLERS.map((userAgent) => ({
        userAgent,
        allow: "/",
        disallow: PRIVATE_PATHS,
      })),
    ],
    sitemap: new URL("/sitemap.xml", SITE_URL).toString(),
    host: SITE_URL,
  };
}
