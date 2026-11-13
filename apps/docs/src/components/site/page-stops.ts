import { usePathname } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";

import { findStops } from "./trail-stops";

/**
 * The sections of the documentation page being read, and which one is current.
 *
 * One tracker for the whole page, however many things show it — the sidebar's
 * timeline and the mobile progress bar read the same store, so there is one
 * lookup of the headings and one IntersectionObserver, never a scroll handler.
 * It runs only while something is subscribed.
 */

/** A documentation page's stops: its section headings and its prose headings. */
export const DOC_STOPS = "[data-trail-stop], [data-prose] > h2";

export interface PageStop {
  id: string;
  label: string;
}

export interface PageStops {
  stops: PageStop[];
  /** Index of the section being read; -1 above the first. */
  active: number;
}

const EMPTY: PageStops = { stops: [], active: -1 };

let state: PageStops = EMPTY;
const listeners = new Set<() => void>();
let request: (() => void) | undefined;
let stop: (() => void) | undefined;

function publish(next: PageStops) {
  state = next;
  for (const listener of listeners) listener();
}

function start(): () => void {
  let headings: HTMLElement[] = [];
  let spy: IntersectionObserver | undefined;
  let frame = 0;
  const passed = new Set<Element>();

  const discover = () => {
    frame = 0;
    const content = document.getElementById("content");
    // Only what can be linked to: every documentation heading is rendered
    // with an id, and one without is not this tracker's to invent.
    const found = (content ? findStops(content, DOC_STOPS) : []).filter(
      (entry) => entry.heading.id !== "",
    );
    if (
      found.length === headings.length &&
      found.every((entry, index) => entry.heading === headings[index])
    ) {
      return;
    }

    spy?.disconnect();
    passed.clear();
    headings = found.map((entry) => entry.heading);
    publish({
      // The heading's own words, whole: these lists have the width to
      // truncate by, where a station sign has to be cut to a length.
      stops: found.map((entry) => ({
        id: entry.heading.id,
        label: entry.heading.textContent.replace(/\s+/g, " ").trim() || entry.label,
      })),
      active: -1,
    });
    if (headings.length === 0) return;

    // Everything above a line a third of the way down the viewport, however
    // far above: a heading inside that region has been reached. One tall
    // region rather than a thin band, so a jump straight past the line — a
    // followed link, a restored scroll position — still changes the answer.
    spy = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) passed.add(entry.target);
          else passed.delete(entry.target);
        }
        let active = -1;
        headings.forEach((heading, index) => {
          if (passed.has(heading)) active = index;
        });
        if (active !== state.active) publish({ stops: state.stops, active });
      },
      { rootMargin: "1000000px 0px -66% 0px" },
    );
    for (const heading of headings) spy.observe(heading);
  };

  request = () => {
    if (frame === 0) frame = requestAnimationFrame(discover);
  };
  request();
  // A page that streams in, or a navigation, changes the document's height.
  const resize = new ResizeObserver(request);
  resize.observe(document.body);

  return () => {
    cancelAnimationFrame(frame);
    resize.disconnect();
    spy?.disconnect();
    request = undefined;
    state = EMPTY;
  };
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) stop = start();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      stop?.();
      stop = undefined;
    }
  };
}

const read = () => state;
const readOnServer = () => EMPTY;

export function usePageStops(): PageStops {
  const pathname = usePathname();
  useEffect(() => {
    request?.();
  }, [pathname]);
  return useSyncExternalStore(subscribe, read, readOnServer);
}
