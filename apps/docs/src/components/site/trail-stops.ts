/**
 * The stops on a page: the headings a reader passes on the way down.
 *
 * Shared by the scroll trail, which draws a route through them, and the guide,
 * which says something at each one — so the two can never disagree about where
 * a page's sections are.
 */
export interface TrailStop {
  /** The heading itself: what the stop is measured from and scrolled to. */
  heading: HTMLElement;
  /** The block the heading opens, whose edges the trail's lanes run along. */
  region: HTMLElement;
  /** A short name for the stop, as a station sign would have it. */
  label: string;
  /** What the guide says here, when the page has written something. */
  tip: string | null;
}

/** A station sign has room for a few words, not a headline. */
const LABEL_LENGTH = 30;

function shorten(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > LABEL_LENGTH ? `${clean.slice(0, LABEL_LENGTH - 1).trimEnd()}…` : clean;
}

/**
 * Every stop under `root` matching `selector`, in document order.
 *
 * A match is either a heading or a section labelled by one. `data-trail-label`
 * names the stop when the heading is too long to be a sign; `data-guide` is
 * the guide's line for it.
 */
export function findStops(root: Element, selector: string): TrailStop[] {
  const stops: TrailStop[] = [];
  for (const element of root.querySelectorAll<HTMLElement>(selector)) {
    // Not rendered — a collapsed panel, a hidden tab — so not on the route.
    if (element.offsetParent === null) continue;
    const labelledBy = element.getAttribute("aria-labelledby");
    const heading = labelledBy ? document.getElementById(labelledBy) : element;
    if (!heading) continue;
    const region =
      element.tagName === "SECTION"
        ? element
        : (element.closest<HTMLElement>("section") ?? element.parentElement ?? element);
    stops.push({
      heading,
      region,
      label: shorten(element.dataset.trailLabel ?? heading.textContent),
      tip: element.dataset.guide ?? null,
    });
  }
  return stops;
}
