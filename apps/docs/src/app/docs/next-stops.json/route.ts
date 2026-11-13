import { GUIDES } from "~/lib/navigation";
import { getBlocks, getComponents } from "~/lib/registry";

/**
 * One line about every documentation page, keyed by its path.
 *
 * The card at the end of a page says what the next page is for. That sentence
 * is not in the sidebar's data — three hundred descriptions in every page's
 * payload would be paid for by every reader, to be read by the few who reach
 * the end — so it lives here, fetched once when an end card first comes near
 * the viewport, and cached. Static: the registry is fixed at build time.
 */
export const dynamic = "force-static";

export function GET(): Response {
  const stops: Record<string, string> = {};
  for (const guide of GUIDES.items) {
    if (guide.description) stops[guide.href] = guide.description;
  }
  for (const component of getComponents()) {
    stops[`/docs/components/${component.name}`] = component.description;
  }
  for (const block of getBlocks()) {
    stops[`/docs/blocks/${block.name}`] = block.description;
  }
  return Response.json(stops, {
    headers: {
      "cache-control": "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
