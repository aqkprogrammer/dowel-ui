"use client";

import { ArrowRight, ArrowUp, Footprints, Move } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

import styles from "./site-guide.module.css";
import { findStops, type TrailStop } from "./trail-stops";

/**
 * Peg, the site's guide.
 *
 * A small lime character who walks a reader through the page. It waits at its
 * dock — any edge or corner of the window, chosen by dragging it there or from
 * its own menu — and when a new section is reached it flies over, lands beside
 * the heading and says one line about what is on screen. When the heading
 * scrolls away it goes home. It blinks, watches the pointer, leans into a
 * flight, is startled by a fast scroll and pleased at the end of a page.
 *
 * It is company, not content. Nothing it says is announced unasked — the lines
 * restate what the page already says — it can be sent away for good, and it
 * holds still for anyone who has asked for less motion.
 */

/** Where a page's stops are found, inside `#content`. */
const STOPS = ":scope > section[data-guide], [data-trail-stop], [data-prose] > h2";
/** Tools, where a character in the corner would sit on the controls. */
const QUIET = ["/playground", "/theme-studio", "/generate", "/agent-demo"];
/** The end of a page: somewhere for the guide to sit once it is reached. */
const TERMINUS = "[data-trail-terminus][data-arrived]";
const HIDDEN_KEY = "docs-guide-hidden";
const PREFS_KEY = "docs-guide-prefs";
const HIDDEN_EVENT = "docs-guide-hidden-change";
/** How long a line stays up before the bubble folds away on its own. */
const LINGER = 9000;

type Presence = "server" | "shown" | "hidden";

function subscribePresence(notify: () => void) {
  window.addEventListener("storage", notify);
  window.addEventListener(HIDDEN_EVENT, notify);
  return () => {
    window.removeEventListener("storage", notify);
    window.removeEventListener(HIDDEN_EVENT, notify);
  };
}

function readPresence(): Presence {
  try {
    return localStorage.getItem(HIDDEN_KEY) === "1" ? "hidden" : "shown";
  } catch {
    return "shown";
  }
}

function writeHidden(hidden: boolean) {
  try {
    if (hidden) localStorage.setItem(HIDDEN_KEY, "1");
    else localStorage.removeItem(HIDDEN_KEY);
  } catch {
    // Blocked site data: the guide simply comes back next visit.
  }
  window.dispatchEvent(new Event(HIDDEN_EVENT));
}

/** Where the guide waits: the eight edges and corners of the window. */
const DOCKS = ["tl", "t", "tr", "l", "r", "bl", "b", "br"] as const;
type Dock = (typeof DOCKS)[number];

const DOCK_NAMES: Record<Dock, string> = {
  tl: "Top left",
  t: "Top",
  tr: "Top right",
  l: "Left",
  r: "Right",
  bl: "Bottom left",
  b: "Bottom",
  br: "Bottom right",
};

/** The picker: the docks laid out as the window is, with walking at its centre. */
const PICKER: (Dock | "roam")[] = ["tl", "t", "tr", "l", "roam", "r", "bl", "b", "br"];

interface Prefs {
  dock: Dock;
  /** Whether the guide leaves its dock to visit each section. */
  roam: boolean;
}

const DEFAULT_PREFS: Prefs = { dock: "br", roam: true };

function readPrefs(): Prefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const stored = JSON.parse(localStorage.getItem(PREFS_KEY) ?? "{}") as Partial<Prefs>;
    return {
      dock: DOCKS.find((dock) => dock === stored.dock) ?? DEFAULT_PREFS.dock,
      roam: typeof stored.roam === "boolean" ? stored.roam : DEFAULT_PREFS.roam,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

interface Place {
  x: number;
  y: number;
  scale: number;
  /** What the guide is at: a dock's name, or the element it is perched on. */
  at: Dock | Element;
}

/** The guide's box at a dock. Its height is 1.1 times its width. */
function dockPlace(dock: Dock, width: number, viewport: { w: number; h: number }): Place {
  const height = width * 1.1;
  const gap = viewport.w >= 640 ? 20 : 12;
  const x = dock.endsWith("l")
    ? gap
    : dock.endsWith("r")
      ? viewport.w - width - gap
      : (viewport.w - width) / 2;
  const y = dock.startsWith("t")
    ? 72
    : dock.startsWith("b")
      ? viewport.h - height - gap
      : (viewport.h - height) / 2;
  return { x, y, scale: 1, at: dock };
}

/**
 * Where the guide stands at a stop, if the stop is comfortably on screen:
 * at the end of a heading's words, feet on its baseline, or on the top edge of
 * the card that ends the page.
 */
function perchPlace(
  target: HTMLElement,
  width: number,
  viewport: { w: number; h: number },
): Place | null {
  const height = width * 1.1;
  const box = target.getBoundingClientRect();
  if (box.top < 84 || box.top > viewport.h - 150) return null;

  if (target.matches(TERMINUS)) {
    const scale = 0.72;
    return {
      x: Math.max(box.left + 16, box.right - width * scale - 104),
      y: box.top - height + 7,
      scale,
      at: target,
    };
  }

  // The heading is a full-width block; its words are not.
  const words = document.createRange();
  words.selectNodeContents(target);
  const text = words.getBoundingClientRect();
  const scale = Math.min(0.9, Math.max(0.52, (box.height * 1.9) / height));
  const x = Math.min(
    (text.width > 0 ? text.right : box.left) + 14,
    viewport.w - width * scale - 12,
  );
  return { x, y: box.bottom - height + 3, scale, at: target };
}

interface Spot {
  /** -1 above the first stop. */
  index: number;
  count: number;
  text: string;
  next: string | null;
}

function greeting(pathname: string, count: number): string {
  if (pathname === "/") return "Hi, I'm Peg! Scroll down and I'll walk you through the tour.";
  if (count > 1)
    return `Hi, I'm Peg. This page has ${String(count)} stops — I'll meet you at each one.`;
  return "Hi, I'm Peg. Drag me wherever you'd like me to wait.";
}

/** A line for a stop the page has written nothing for. */
function fallback(stop: TrailStop, index: number, count: number): string {
  const left = count - index - 1;
  if (left === 0) return `Last stop: ${stop.label}. That's the whole page!`;
  if (index === 0) return `First up: ${stop.label}.`;
  return left === 1
    ? `Now reading: ${stop.label}. One more stop after this.`
    : `Now reading: ${stop.label}. ${String(left)} stops to go.`;
}

/** The line, typed out. The whole of it is in the DOM from the start. */
function Typed({ text }: { text: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const step = still ? text.length : 2;
    let typed = 0;
    const timer = setInterval(() => {
      typed = Math.min(text.length, typed + step);
      setCount(typed);
      if (typed >= text.length) clearInterval(timer);
    }, 24);
    return () => {
      clearInterval(timer);
    };
  }, [text]);

  return (
    <>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {text.slice(0, count)}
        {/* The rest holds the bubble at its final size while the line arrives. */}
        <span className="opacity-0">{text.slice(count)}</span>
      </span>
    </>
  );
}

export function SiteGuide() {
  const pathname = usePathname();
  const presence = useSyncExternalStore<Presence>(
    subscribePresence,
    readPresence,
    () => "server",
  );
  const quiet = QUIET.some((prefix) => pathname.startsWith(prefix));
  const shown = presence === "shown" && !quiet;

  const rootRef = useRef<HTMLElement | null>(null);
  const pegRef = useRef<HTMLButtonElement | null>(null);
  const hopRef = useRef<HTMLSpanElement | null>(null);
  const stopsRef = useRef<TrailStop[]>([]);
  const lingerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  /** The stop the guide was told to stay docked through; it roams again at the next. */
  const heldRef = useRef<number | null>(null);
  const activeRef = useRef(-1);
  const wakeRef = useRef<(() => void) | undefined>(undefined);
  const [spot, setSpot] = useState<Spot | null>(null);
  const [open, setOpen] = useState(false);
  const [picking, setPicking] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>(readPrefs);
  const prefsRef = useRef(prefs);

  const linger = useCallback(() => {
    clearTimeout(lingerRef.current);
    lingerRef.current = setTimeout(() => {
      setOpen(false);
      setPicking(false);
    }, LINGER);
  }, []);

  const hold = useCallback(() => {
    clearTimeout(lingerRef.current);
  }, []);

  /** A choice of dock, or of whether to walk: remembered, and acted on at once. */
  const choose = useCallback((change: Partial<Prefs>) => {
    const next = { ...prefsRef.current, ...change };
    prefsRef.current = next;
    setPrefs(next);
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(next));
    } catch {
      // Blocked site data: the choice lasts for this visit.
    }
    // Sent to a dock, it stays there until the next section; told to walk,
    // it sets off now.
    heldRef.current = change.dock ? activeRef.current : null;
    wakeRef.current?.();
  }, []);

  // Follow the page, and move: which stop is being read, where that puts the
  // guide, and the flight between the two. One loop, running only while there
  // is somewhere to get to or the page is moving.
  useEffect(() => {
    if (!shown) return;
    const root = rootRef.current;
    const peg = pegRef.current;
    if (!root || !peg) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let active = -2;
    let known = -1;
    let refreshed = 0;
    let frame = 0;
    let lastY = window.scrollY;
    let startled: ReturnType<typeof setTimeout> | undefined;
    let perch: HTMLElement | null = null;

    let x = Number.NaN;
    let y = 0;
    let scale = 1;
    let at: Place["at"] | undefined;
    let settled = false;
    let flown = 0;
    let sides = "";
    let drag: { dx: number; dy: number; x: number; y: number; moved: boolean } | undefined;

    const hop = () => {
      // Restart the hop: the same class, removed and put back across a reflow.
      const hopper = hopRef.current;
      if (!hopper) return;
      hopper.classList.remove(styles.hopping ?? "");
      void hopper.offsetWidth;
      hopper.classList.add(styles.hopping ?? "");
    };

    const follow = () => {
      const now = performance.now();
      // The page under the guide can change without the guide remounting — a
      // navigation, a section that streams in — so the stops are looked up
      // again as it goes, but not on every frame.
      if (now - refreshed > 500) {
        const content = document.getElementById("content");
        stopsRef.current = content ? findStops(content, STOPS) : [];
        refreshed = now;
      }
      const stops = stopsRef.current;

      const travelled = Math.abs(window.scrollY - lastY);
      lastY = window.scrollY;
      if (travelled > 110) {
        root.dataset.mood = "wow";
        clearTimeout(startled);
        startled = setTimeout(() => {
          delete root.dataset.mood;
        }, 520);
      }

      const line = window.innerHeight * 0.6;
      let index = -1;
      stops.forEach((stop, position) => {
        if (stop.heading.getBoundingClientRect().top < line) index = position;
      });
      // The card that ends the page is one stop more, once it has been reached.
      const terminus = document.querySelector<HTMLElement>(TERMINUS);
      if (terminus && index === stops.length - 1) index = stops.length;
      perch = index === stops.length ? terminus : (stops[index]?.heading ?? null);

      if (index === active && stops.length === known) return;
      const arrived = index !== active;
      active = index;
      activeRef.current = index;
      known = stops.length;

      const stop = stops[index];
      const ended = index === stops.length && terminus !== null;
      setSpot({
        index,
        count: stops.length,
        text: ended
          ? (terminus.dataset.guide ?? "That's the whole page!")
          : stop
            ? (stop.tip ?? fallback(stop, index, stops.length))
            : greeting(pathname, stops.length),
        next: ended ? null : (stops[index + 1]?.label ?? null),
      });
      root.toggleAttribute("data-happy", stops.length > 0 && index >= stops.length - 1);
      if (!arrived) return;
      // On a phone the bubble would cover what is being read, so there the
      // hop is the whole announcement and a tap opens the line.
      // Nor on the card that ends the page: it says the same thing itself,
      // and the bubble would sit on top of it.
      if (ended) setOpen(false);
      else if (window.innerWidth >= 640) {
        setOpen(true);
        linger();
      }
      hop();
    };

    const tick = () => {
      frame = 0;
      follow();

      const viewport = { w: document.documentElement.clientWidth, h: window.innerHeight };
      const wide = viewport.w >= 640;
      const width = wide ? 68 : 52;
      const { dock, roam } = prefsRef.current;
      const visiting = roam && wide && !still && perch !== null && heldRef.current !== active;
      const goal =
        (visiting && perch ? perchPlace(perch, width, viewport) : null) ??
        dockPlace(dock, width, viewport);

      if (Number.isNaN(x)) {
        // The entrance: up from under the window's edge.
        x = goal.x;
        y = viewport.h + 20;
      }
      if (goal.at !== at) {
        at = goal.at;
        settled = false;
        flown = Math.hypot(goal.x - x, goal.y - y);
      }

      let lean = 0;
      if (drag?.moved) {
        x = drag.x;
        y = drag.y;
        scale += (1 - scale) * 0.2;
        settled = false;
      } else if (settled || still) {
        // Landed: it stays exactly where its perch is, however the page moves.
        x = goal.x;
        y = goal.y;
        scale = goal.scale;
        settled = true;
      } else {
        const dx = goal.x - x;
        const dy = goal.y - y;
        x += dx * 0.14;
        y += dy * 0.14;
        scale += (goal.scale - scale) * 0.14;
        lean = Math.max(-18, Math.min(18, dx * 0.22));
        if (Math.hypot(dx, dy) < 0.7) {
          x = goal.x;
          y = goal.y;
          scale = goal.scale;
          settled = true;
          lean = 0;
          if (flown > 60) hop();
        }
      }

      root.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      root.style.setProperty("--scale", scale.toFixed(3));
      root.style.setProperty("--lean", `${lean.toFixed(1)}deg`);
      root.style.setProperty("--size", `${String(width)}px`);
      root.toggleAttribute("data-flying", !settled && !drag?.moved && flown > 60);
      root.toggleAttribute("data-perched", settled && typeof at !== "string");
      // The bubble is as wide as its stylesheet says, hangs from the side of
      // the guide nearer the window's edge, and is slid back in if it would
      // leave the window; the tail stays over the guide's head regardless.
      const bubble = Math.min(wide ? 280 : 240, viewport.w - (wide ? 40 : 24));
      const head = x + (width * scale) / 2;
      const wanted = head > viewport.w / 2 ? head - bubble + 36 : head - 36;
      const left = Math.max(8, Math.min(viewport.w - bubble - 8, wanted));
      root.style.setProperty("--bubble-x", `${(left - x).toFixed(1)}px`);
      root.style.setProperty(
        "--tail-x",
        `${Math.max(18, Math.min(bubble - 18, head - left)).toFixed(1)}px`,
      );
      // The bubble opens towards the middle of the window, whichever way that is.
      const next = `${x + width / 2 > viewport.w / 2 ? "left" : "right"} ${y < 190 ? "below" : "above"}`;
      if (next !== sides) {
        sides = next;
        const [across = "left", down = "above"] = next.split(" ");
        root.dataset.across = across;
        root.dataset.down = down;
      }

      if (!settled) frame = requestAnimationFrame(tick);
    };
    const request = () => {
      if (frame === 0) frame = requestAnimationFrame(tick);
    };
    wakeRef.current = request;

    // Dragging: pick the guide up and put it down near any edge or corner.
    const onDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      drag = { dx: event.clientX - x, dy: event.clientY - y, x, y, moved: false };
    };
    const onMove = (event: PointerEvent) => {
      if (!drag) return;
      const nx = event.clientX - drag.dx;
      const ny = event.clientY - drag.dy;
      if (!drag.moved && Math.hypot(nx - x, ny - y) < 6) return;
      if (!drag.moved) {
        drag.moved = true;
        root.setAttribute("data-dragging", "");
        setOpen(false);
      }
      drag.x = nx;
      drag.y = ny;
      request();
    };
    const onUp = () => {
      if (!drag) return;
      const dropped = drag;
      drag = undefined;
      if (!dropped.moved) return;
      root.removeAttribute("data-dragging");
      const viewport = { w: document.documentElement.clientWidth, h: window.innerHeight };
      const width = viewport.w >= 640 ? 68 : 52;
      let nearest: Dock = prefsRef.current.dock;
      let closest = Infinity;
      for (const dock of DOCKS) {
        const place = dockPlace(dock, width, viewport);
        const distance = Math.hypot(place.x - dropped.x, place.y - dropped.y);
        if (distance < closest) {
          closest = distance;
          nearest = dock;
        }
      }
      at = undefined;
      choose({ dock: nearest });
    };
    // A drag ends in a click on the same element; that one is not a click.
    const onClick = (event: MouseEvent) => {
      if (root.hasAttribute("data-dragged")) event.stopPropagation();
    };
    const markDragged = (event: PointerEvent) => {
      const moved = drag?.moved === true;
      onUp();
      if (!moved || event.type !== "pointerup") return;
      root.setAttribute("data-dragged", "");
      setTimeout(() => {
        root.removeAttribute("data-dragged");
      }, 0);
    };

    request();
    peg.addEventListener("pointerdown", onDown);
    peg.addEventListener("click", onClick);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", markDragged);
    window.addEventListener("pointercancel", markDragged);
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request);
    window.addEventListener("docs-journey-arrived", request);
    // Content arriving changes the page's height, and where every stop is.
    const observer = new ResizeObserver(request);
    observer.observe(document.body);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(startled);
      clearTimeout(lingerRef.current);
      wakeRef.current = undefined;
      peg.removeEventListener("pointerdown", onDown);
      peg.removeEventListener("click", onClick);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", markDragged);
      window.removeEventListener("pointercancel", markDragged);
      window.removeEventListener("scroll", request);
      window.removeEventListener("resize", request);
      window.removeEventListener("docs-journey-arrived", request);
      observer.disconnect();
    };
  }, [shown, pathname, linger, choose]);

  // The eyes follow the pointer, a few pixels' worth.
  useEffect(() => {
    if (!shown) return;
    const root = rootRef.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    let x = 0;
    let y = 0;
    const look = () => {
      frame = 0;
      const box = root.getBoundingClientRect();
      const dx = x - (box.left + box.width / 2);
      const dy = y - (box.top + box.height / 2);
      const reach = Math.hypot(dx, dy) || 1;
      const pull = Math.min(1, reach / 240);
      root.style.setProperty("--look-x", `${((dx / reach) * 3.2 * pull).toFixed(2)}px`);
      root.style.setProperty("--look-y", `${((dy / reach) * 2.6 * pull).toFixed(2)}px`);
    };
    const move = (event: PointerEvent) => {
      x = event.clientX;
      y = event.clientY;
      if (frame === 0) frame = requestAnimationFrame(look);
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", move);
    };
  }, [shown]);

  if (presence === "server" || quiet) return null;

  if (presence === "hidden") {
    return (
      <button
        type="button"
        className={styles.revive}
        aria-label="Bring back Peg, the site guide"
        title="Bring back the guide"
        onClick={() => {
          writeHidden(false);
        }}
      />
    );
  }

  const still =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const advance = () => {
    const stop = spot ? stopsRef.current[spot.index + 1] : undefined;
    const top = stop ? window.scrollY + stop.heading.getBoundingClientRect().top - 150 : 0;
    window.scrollTo({ top, behavior: still ? "auto" : "smooth" });
  };
  const ended = spot !== null && spot.index >= spot.count;

  return (
    <aside ref={rootRef} aria-label="Site guide" className={styles.guide}>
      <div
        className={styles.bubble}
        data-open={open}
        inert={!open}
        onPointerEnter={hold}
        onPointerLeave={linger}
        onFocus={hold}
        onBlur={linger}
      >
        <p className={styles.line}>
          {spot ? <Typed key={spot.text} text={spot.text} /> : null}
        </p>
        <div className={styles.actions}>
          {spot && spot.count > 0 && !ended ? (
            <button type="button" className={styles.next} onClick={advance}>
              {spot.next ? (
                <>
                  <span className="truncate">Next: {spot.next}</span>
                  <ArrowRight aria-hidden="true" className="size-3 shrink-0" />
                </>
              ) : (
                <>
                  Back to the top
                  <ArrowUp aria-hidden="true" className="size-3 shrink-0" />
                </>
              )}
            </button>
          ) : null}
          <button
            type="button"
            className={styles.dismiss}
            onClick={() => {
              writeHidden(true);
            }}
          >
            Hide Peg
          </button>
          {spot && spot.index >= 0 && !ended ? (
            <span className={styles.count} aria-hidden="true">
              {spot.index + 1}/{spot.count}
            </span>
          ) : null}
          <button
            type="button"
            className={styles.tool}
            aria-label="Choose where Peg waits"
            aria-expanded={picking}
            onClick={() => {
              setPicking((value) => !value);
              hold();
            }}
          >
            <Move aria-hidden="true" className="size-3.5" />
          </button>
        </div>

        {picking ? (
          <div className={styles.picker}>
            <div className={styles.grid} role="group" aria-label="Where Peg waits">
              {PICKER.map((cell) =>
                cell === "roam" ? (
                  <button
                    key={cell}
                    type="button"
                    className={styles.cell}
                    data-roam=""
                    aria-pressed={prefs.roam}
                    aria-label="Walk to each section"
                    title="Walk to each section"
                    onClick={() => {
                      choose({ roam: !prefs.roam });
                    }}
                  >
                    <Footprints aria-hidden="true" className="size-3.5" />
                  </button>
                ) : (
                  <button
                    key={cell}
                    type="button"
                    className={styles.cell}
                    aria-pressed={prefs.dock === cell}
                    aria-label={DOCK_NAMES[cell]}
                    title={DOCK_NAMES[cell]}
                    onClick={() => {
                      choose({ dock: cell });
                    }}
                  />
                ),
              )}
            </div>
            <p className={styles.pickerNote}>
              Pick where I wait, or drag me there.
              <br />
              {prefs.roam
                ? "I walk to each section as you reach it."
                : "I'm staying put — the middle sets me walking."}
            </p>
          </div>
        ) : null}
        <span className={styles.tail} aria-hidden="true" />
        <span className={styles.tail} aria-hidden="true" />
      </div>

      <button
        ref={pegRef}
        type="button"
        className={styles.peg}
        aria-label="Peg, the site guide"
        aria-expanded={open}
        onClick={() => {
          setOpen((value) => !value);
          hold();
        }}
      >
        <span ref={hopRef} className={styles.hopper}>
          <svg className={styles.body} viewBox="0 0 80 88" aria-hidden="true">
            <defs>
              <radialGradient id="peg-skin" cx="36%" cy="28%" r="78%">
                <stop offset="0%" stopColor="#efff9a" />
                <stop offset="48%" stopColor="#b8f400" />
                <stop offset="100%" stopColor="#6fcf00" />
              </radialGradient>
            </defs>
            <ellipse className={styles.shadow} cx="40" cy="83" rx="20" ry="3" />
            <g className={styles.antenna}>
              <path
                d="M40 26 C40 16 43 11 48 8"
                fill="none"
                stroke="#8fe000"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
              <circle cx="49" cy="7" r="4" fill="url(#peg-skin)" />
            </g>
            <ellipse cx="31" cy="78" rx="6.5" ry="3.6" fill="#6fcf00" />
            <ellipse cx="49" cy="78" rx="6.5" ry="3.6" fill="#6fcf00" />
            <ellipse cx="12.5" cy="55" rx="4.2" ry="6.4" fill="#8fe000" />
            <ellipse
              className={styles.arm}
              cx="67.5"
              cy="55"
              rx="4.2"
              ry="6.4"
              fill="#8fe000"
            />
            <ellipse
              cx="40"
              cy="51"
              rx="27"
              ry="26"
              fill="url(#peg-skin)"
              stroke="#6fcf00"
              strokeWidth="1"
            />
            <ellipse
              cx="29"
              cy="36"
              rx="8"
              ry="4.5"
              fill="#fff"
              opacity="0.38"
              transform="rotate(-24 29 36)"
            />
            <circle cx="23" cy="59" r="4" fill="#ff9d5c" opacity="0.28" />
            <circle cx="57" cy="59" r="4" fill="#ff9d5c" opacity="0.28" />
            <g className={styles.eyes}>
              <g className={styles.lids}>
                <g className={styles.eyesOpen}>
                  <ellipse cx="31" cy="49" rx="4.1" ry="5.6" fill="#14210a" />
                  <ellipse cx="49" cy="49" rx="4.1" ry="5.6" fill="#14210a" />
                  <circle cx="32.4" cy="46.8" r="1.4" fill="#fff" />
                  <circle cx="50.4" cy="46.8" r="1.4" fill="#fff" />
                </g>
                <g
                  className={styles.eyesGlad}
                  fill="none"
                  stroke="#14210a"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                >
                  <path d="M26.5 50.5q4.5-6 9 0" />
                  <path d="M44.5 50.5q4.5-6 9 0" />
                </g>
              </g>
            </g>
            <path
              className={styles.smile}
              d="M35 59.5q5 4.5 10 0"
              fill="none"
              stroke="#14210a"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <ellipse className={styles.gasp} cx="40" cy="61.5" rx="3" ry="3.8" fill="#14210a" />
          </svg>
        </span>
      </button>
    </aside>
  );
}
