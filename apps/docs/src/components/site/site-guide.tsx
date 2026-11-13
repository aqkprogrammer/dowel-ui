"use client";

import { ArrowRight, ArrowUp } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

import styles from "./site-guide.module.css";
import { findStops, type TrailStop } from "./trail-stops";

/**
 * Peg, the site's guide.
 *
 * A small lime character in the corner of the page who walks a reader through
 * it: at each section it hops and says one line about what is on screen, and
 * offers the next stop. It blinks, watches the pointer, is startled by a fast
 * scroll and pleased at the end of a page.
 *
 * It is company, not content. Nothing it says is announced unasked — the lines
 * restate what the page already says — it can be sent away for good, and it
 * holds still for anyone who has asked for less motion.
 */

/** Where a page's stops are found, inside `#content`. */
const STOPS = ":scope > section[data-guide], [data-trail-stop], [data-prose] > h2";
/** Tools, where a character in the corner would sit on the controls. */
const QUIET = ["/playground", "/theme-studio", "/generate", "/agent-demo"];
const HIDDEN_KEY = "docs-guide-hidden";
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
    return `Hi, I'm Peg. This page has ${String(count)} stops — I'll keep your place as you read.`;
  return "Hi, I'm Peg. Click me whenever you want me out of the way.";
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
  const hopRef = useRef<HTMLSpanElement | null>(null);
  const stopsRef = useRef<TrailStop[]>([]);
  const lingerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [spot, setSpot] = useState<Spot | null>(null);
  const [open, setOpen] = useState(false);

  const linger = useCallback(() => {
    clearTimeout(lingerRef.current);
    lingerRef.current = setTimeout(() => {
      setOpen(false);
    }, LINGER);
  }, []);

  const hold = useCallback(() => {
    clearTimeout(lingerRef.current);
  }, []);

  // Follow the page: which stop is being read, and how fast it is going by.
  useEffect(() => {
    if (!shown) return;
    const root = rootRef.current;
    let active = -2;
    let known = -1;
    let refreshed = 0;
    let frame = 0;
    let lastY = window.scrollY;
    let startled: ReturnType<typeof setTimeout> | undefined;

    const update = () => {
      frame = 0;
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
      if (root && travelled > 110) {
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
      if (index === active && stops.length === known) return;
      const arrived = index !== active;
      active = index;
      known = stops.length;

      const stop = stops[index];
      setSpot({
        index,
        count: stops.length,
        text: stop
          ? (stop.tip ?? fallback(stop, index, stops.length))
          : greeting(pathname, stops.length),
        next: stops[index + 1]?.label ?? null,
      });
      root?.toggleAttribute("data-happy", stops.length > 0 && index === stops.length - 1);
      if (!arrived) return;
      // On a phone the bubble would cover what is being read, so there the
      // hop is the whole announcement and a tap opens the line.
      if (window.innerWidth >= 640) {
        setOpen(true);
        linger();
      }
      // Restart the hop: the same class, removed and put back across a reflow.
      const hopper = hopRef.current;
      if (hopper) {
        hopper.classList.remove(styles.hopping ?? "");
        void hopper.offsetWidth;
        hopper.classList.add(styles.hopping ?? "");
      }
    };
    const request = () => {
      if (frame === 0) frame = requestAnimationFrame(update);
    };

    request();
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request);
    // Content arriving changes the page's height, and where every stop is.
    const observer = new ResizeObserver(request);
    observer.observe(document.body);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(startled);
      clearTimeout(lingerRef.current);
      window.removeEventListener("scroll", request);
      window.removeEventListener("resize", request);
      observer.disconnect();
    };
  }, [shown, pathname, linger]);

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
      const dx = x - (box.right - 34);
      const dy = y - (box.bottom - 34);
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
          {spot && spot.count > 0 ? (
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
          {spot && spot.index >= 0 ? (
            <span className={styles.count} aria-hidden="true">
              {spot.index + 1}/{spot.count}
            </span>
          ) : null}
        </div>
        <span className={styles.tail} aria-hidden="true" />
        <span className={styles.tail} aria-hidden="true" />
      </div>

      <button
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
