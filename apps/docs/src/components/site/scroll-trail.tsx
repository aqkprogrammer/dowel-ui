"use client";

import { cn } from "@dowel-ui/react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import styles from "./scroll-trail.module.css";
import { findStops } from "./trail-stops";

/**
 * A route drawn down the page, travelled as it is read.
 *
 * The line runs down one margin beside a section, crosses the page in the gap
 * before the next one — through a station sign naming what was just read and
 * what comes next — and carries on down the other margin. The part already
 * read is lit; the rest is dotted; a marker rides the join.
 *
 * It is decoration over a page that is complete without it: hidden from
 * assistive technology, never in the way of a pointer, and absent wherever the
 * margins are too narrow to hold it. The parent must be positioned, and is the
 * element the stops are looked for in.
 */

interface Station {
  x: number;
  y: number;
  /** How far along the route the sign sits. */
  at: number;
  from: string;
  to: string;
}

interface Geometry {
  d: string;
  width: number;
  height: number;
  total: number;
  /** Page height → distance along the route, as the corners of a polyline. */
  knots: [number, number][];
  stations: Station[];
  start: { x: number; y: number };
}

/** The corner radius where the line turns to cross the page. */
const RADIUS = 18;
/** The stretch of scrolling, either side of a crossing, spent making it. */
const BAND = 64;
const QUARTER = (Math.PI * RADIUS) / 2;

const round = (value: number) => Math.round(value * 10) / 10;

interface TrailOptions {
  stops: string;
  span?: number;
  lead: number;
  inset: number;
  minViewport: number;
  terminus?: string;
}

function build(container: HTMLElement, options: TrailOptions): Geometry | null {
  const viewport = document.documentElement.clientWidth;
  if (viewport < options.minViewport) return null;
  const frame = container.getBoundingClientRect();

  // A stop too close under the last one has no room for a crossing of its
  // own; it rides along as part of the stop above.
  const stops: { top: number; label: string; region: DOMRect }[] = [];
  for (const stop of findStops(container, options.stops)) {
    const top = stop.heading.getBoundingClientRect().top - frame.top - options.lead;
    const previous = stops.at(-1);
    if (previous && top - previous.top < BAND * 5) continue;
    stops.push({ top, label: stop.label, region: stop.region.getBoundingClientRect() });
  }
  const first = stops[0];
  const last = stops.at(-1);
  if (!first || !last || stops.length < 2) return null;

  let left: number;
  let right: number;
  if (options.span === undefined) {
    left = Math.min(...stops.map((stop) => stop.region.left)) - frame.left - options.inset;
    right = Math.max(...stops.map((stop) => stop.region.right)) - frame.left + options.inset;
  } else {
    left = (frame.width - options.span) / 2 - options.inset;
    right = frame.width - left;
  }
  const edge = 12;
  left = round(Math.max(left, edge - frame.left));
  right = round(Math.min(right, viewport - edge - frame.left));
  if (right - left < 420) return null;

  const lane = (index: number) => (index % 2 === 0 ? left : right);
  const startY = round(Math.max(first.top, 0));
  const endY = round(
    Math.min(
      Math.max(last.region.bottom - frame.top - 8, last.top + BAND * 3),
      frame.height - 4,
    ),
  );

  let d = `M${String(left)} ${String(startY)}`;
  let length = 0;
  let y = startY;
  const knots: [number, number][] = [[startY, 0]];
  const stations: Station[] = [];

  for (let index = 1; index < stops.length; index += 1) {
    const stop = stops[index];
    const before = stops[index - 1];
    if (!stop || !before) continue;
    const cross = round(stop.top);
    const from = lane(index - 1);
    const to = lane(index);
    const direction = to > from ? 1 : -1;
    const run = Math.abs(to - from) - RADIUS * 2;

    length += cross - RADIUS - y;
    knots.push([cross - BAND, length - (BAND - RADIUS)]);
    d +=
      ` V${String(cross - RADIUS)}` +
      ` A${String(RADIUS)} ${String(RADIUS)} 0 0 ${direction > 0 ? "0" : "1"} ${String(from + direction * RADIUS)} ${String(cross)}` +
      ` H${String(to - direction * RADIUS)}` +
      ` A${String(RADIUS)} ${String(RADIUS)} 0 0 ${direction > 0 ? "1" : "0"} ${String(to)} ${String(cross + RADIUS)}`;
    stations.push({
      x: (from + to) / 2,
      y: cross,
      at: length + QUARTER + run / 2,
      from: before.label,
      to: stop.label,
    });
    length += QUARTER * 2 + run;
    knots.push([cross + BAND, length + (BAND - RADIUS)]);
    y = cross + RADIUS;
  }

  // Where the route arrives, when the page has somewhere for it to: the line
  // runs on past the last section, turns in over that element and comes down
  // onto its top edge, a little way in from the side it came from.
  const terminus = options.terminus
    ? container.querySelector<HTMLElement>(options.terminus)
    : null;
  const dock = terminus?.offsetParent ? terminus.getBoundingClientRect() : undefined;
  const from = lane(stops.length - 1);
  const dockTop = dock ? round(dock.top - frame.top) : 0;
  const cross = dockTop - 44;
  const dockLeft = dock ? dock.left - frame.left : 0;
  const dockRight = dock ? dock.right - frame.left : 0;
  const into = round(
    Math.abs(from - dockLeft) < Math.abs(from - dockRight) ? dockLeft + 46 : dockRight - 46,
  );

  if (dock && cross - y > BAND * 2 && Math.abs(into - from) > RADIUS * 2) {
    const direction = into > from ? 1 : -1;
    length += cross - RADIUS - y;
    knots.push([cross - BAND, length - (BAND - RADIUS)]);
    d +=
      ` V${String(cross - RADIUS)}` +
      ` A${String(RADIUS)} ${String(RADIUS)} 0 0 ${direction > 0 ? "0" : "1"} ${String(from + direction * RADIUS)} ${String(cross)}` +
      ` H${String(into - direction * RADIUS)}` +
      ` A${String(RADIUS)} ${String(RADIUS)} 0 0 ${direction > 0 ? "1" : "0"} ${String(into)} ${String(cross + RADIUS)}` +
      ` V${String(dockTop)}`;
    length += QUARTER * 2 + Math.abs(into - from) - RADIUS * 2 + (dockTop - cross - RADIUS);
    knots.push([dockTop, length]);
  } else {
    d += ` V${String(endY)}`;
    length += endY - y;
    knots.push([endY, length]);
  }

  return {
    d,
    width: round(frame.width),
    height: round(frame.height),
    total: length,
    knots,
    stations,
    start: { x: left, y: startY },
  };
}

/** Where on the route the reader is, for a height on the page. */
function lengthAt(knots: [number, number][], y: number): number {
  const first = knots[0];
  const last = knots.at(-1);
  if (!first || !last) return 0;
  if (y <= first[0]) return 0;
  if (y >= last[0]) return last[1];
  for (let index = 1; index < knots.length; index += 1) {
    const a = knots[index - 1];
    const b = knots[index];
    if (!a || !b || y > b[0]) continue;
    return a[1] + ((y - a[0]) / (b[0] - a[0] || 1)) * (b[1] - a[1]);
  }
  return last[1];
}

export function ScrollTrail({
  stops = ":scope > section[aria-labelledby]",
  span,
  lead = 84,
  inset = 36,
  minViewport = 1280,
  weight = "bold",
  terminus,
  className,
}: {
  /** Selector for the element the route ends at, if the page has one. */
  terminus?: string;
  /** Selector for the stops, resolved inside the trail's parent. */
  stops?: string;
  /** Width of the page's content column, when the stops themselves are full-bleed. */
  span?: number;
  /** How far above a heading the line crosses the page. */
  lead?: number;
  /** How far outside the content the lanes run. */
  inset?: number;
  /** Below this viewport width there are no margins to draw in. */
  minViewport?: number;
  weight?: "bold" | "fine";
  className?: string;
}) {
  const pathname = usePathname();
  const hostRef = useRef<HTMLDivElement | null>(null);
  const doneRef = useRef<SVGPathElement | null>(null);
  const haloRef = useRef<SVGPathElement | null>(null);
  const headRef = useRef<HTMLSpanElement | null>(null);
  const arrowRef = useRef<SVGSVGElement | null>(null);
  const stationRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [geometry, setGeometry] = useState<Geometry | null>(null);

  // Measure: whenever the page under the trail changes size, or is another page.
  useEffect(() => {
    const container = hostRef.current?.parentElement;
    if (!container) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const next = build(container, { stops, span, lead, inset, minViewport, terminus });
      setGeometry((current) =>
        current?.d === next?.d && current?.height === next?.height ? current : next,
      );
    };
    const request = () => {
      if (frame === 0) frame = requestAnimationFrame(measure);
    };
    request();
    const observer = new ResizeObserver(request);
    observer.observe(container);
    window.addEventListener("resize", request);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", request);
    };
  }, [pathname, stops, span, lead, inset, minViewport, terminus]);

  // Travel: the lit length follows the middle of the viewport, eased, written
  // straight to the elements — a scroll never passes through React.
  useEffect(() => {
    const host = hostRef.current;
    const done = doneRef.current;
    if (!geometry || !host || !done) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let current = -1;
    let frame = 0;

    const paint = (length: number) => {
      const offset = String(geometry.total - length);
      done.style.strokeDashoffset = offset;
      if (haloRef.current) haloRef.current.style.strokeDashoffset = offset;
      const head = headRef.current;
      if (head) {
        const point = done.getPointAtLength(length);
        const ahead = done.getPointAtLength(Math.min(geometry.total, length + 2));
        head.style.transform = `translate(${String(point.x)}px, ${String(point.y)}px)`;
        head.toggleAttribute("data-live", length > 0 && length < geometry.total);
        if (arrowRef.current && (ahead.x !== point.x || ahead.y !== point.y)) {
          const angle = (Math.atan2(ahead.y - point.y, ahead.x - point.x) * 180) / Math.PI;
          arrowRef.current.style.transform = `rotate(${String(angle)}deg)`;
        }
      }
      geometry.stations.forEach((station, index) => {
        stationRefs.current[index]?.toggleAttribute("data-passed", length >= station.at);
      });
    };

    const tick = () => {
      frame = 0;
      const top = host.getBoundingClientRect().top;
      // At the foot of the document the middle of the viewport can go no
      // further down the page, so the route is simply finished.
      const ended =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      const goal = ended
        ? geometry.total
        : lengthAt(geometry.knots, window.innerHeight * 0.5 - top);
      current = current < 0 || still ? goal : current + (goal - current) * 0.16;
      if (Math.abs(goal - current) < 0.4) current = goal;
      paint(current);
      if (current !== goal) frame = requestAnimationFrame(tick);
    };
    const request = () => {
      if (frame === 0) frame = requestAnimationFrame(tick);
    };

    request();
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", request);
      window.removeEventListener("resize", request);
    };
  }, [geometry]);

  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      data-weight={weight}
      className={cn(styles.trail, className)}
    >
      {geometry ? (
        <>
          <svg
            className={styles.canvas}
            width={geometry.width}
            height={geometry.height}
            viewBox={`0 0 ${String(geometry.width)} ${String(geometry.height)}`}
          >
            <path d={geometry.d} className={styles.rest} />
            <path
              ref={haloRef}
              d={geometry.d}
              className={styles.halo}
              strokeDasharray={geometry.total}
              strokeDashoffset={geometry.total}
            />
            <path
              ref={doneRef}
              d={geometry.d}
              className={styles.done}
              strokeDasharray={geometry.total}
              strokeDashoffset={geometry.total}
            />
          </svg>
          <span
            className={styles.origin}
            style={{ left: geometry.start.x, top: geometry.start.y }}
          />
          {geometry.stations.map((station, index) => (
            <span
              key={`${String(index)}-${station.to}`}
              ref={(node) => {
                stationRefs.current[index] = node;
              }}
              className={styles.station}
              style={{ left: station.x, top: station.y }}
            >
              <span className={styles.pip} />
              <span className={styles.from}>{station.from} done ·</span>
              <span>next stop: {station.to}</span>
            </span>
          ))}
          <span ref={headRef} className={styles.head}>
            <svg ref={arrowRef} viewBox="0 0 12 12" width="12" height="12">
              <path d="M3 1.5 9.5 6 3 10.5Z" fill="currentColor" />
            </svg>
          </span>
        </>
      ) : null}
    </div>
  );
}
