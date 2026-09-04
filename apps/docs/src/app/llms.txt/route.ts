import { renderLlmsTxt } from "~/lib/agent-docs";

/**
 * The llms.txt index, served as text.
 *
 * A route rather than a file in `public/`, so it is generated from the same
 * registry the site renders from and cannot fall behind a release. Static: the
 * registry is fixed at build time, so there is nothing to recompute per
 * request.
 */
export const dynamic = "force-static";

export function GET(): Response {
  return new Response(renderLlmsTxt(), {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
