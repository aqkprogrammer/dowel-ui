"use client";

import { ArrowDown, ArrowLeft } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import type { SidebarTree } from "~/lib/sidebar";

import { useNearViewport } from "../live-stage";

import styles from "./docs-journey.module.css";
import { usePageStops } from "./page-stops";

/**
 * The end of a documentation page, and the way into the next one.
 *
 * The documentation is read in the sidebar's order, so the end of a page names
 * the page after it — and a reader who simply keeps scrolling past the bottom
 * is carried there, with no button to find. Scrolling up past the top of a
 * page carries them back to the end of the one before.
 *
 * Every page keeps its own URL: this is a navigation, not one endless page, so
 * the back button, deep links and search engines see exactly what they did.
 *
 * It is deliberately hard to do by accident. Only scrolling that *starts* at
 * the edge counts — the momentum of the fling that reached the bottom never
 * does — it takes a firm continuation rather than a nudge, and a meter shows
 * it filling, so letting go cancels it. The scrolling itself is the browser's.
 */

interface Neighbour {
  title: string;
  href: string;
  group: string;
}

/** How much wheel travel, starting at the edge, turns the page. */
const WHEEL_TRAVEL = 820;
/** How far a finger drags up from the bottom to do the same. */
const TOUCH_TRAVEL = 190;
/** Key presses at the edge: three of them. */
const KEY_STEP = 0.34;
/** A gap this long between wheel events is a new gesture, not momentum. */
const GESTURE_GAP = 140;
/** With no further input for this long, a half-filled meter empties. */
const PATIENCE = 900;
/** The directions the badge's sparks fly in when the card is reached. */
const SPARKS = [0, 36, 72, 108, 144, 180, 216, 252, 288, 324];
const LAND_KEY = "docs-land-at-end";

/** The next page's component, live. Fetched only when an end card wants one. */
const NextPreview = dynamic(() => import("./next-preview"), { ssr: false });

/** One line about each page, by path: fetched once, by the first card to need it. */
let blurbs: Promise<Record<string, string>> | undefined;
function loadBlurbs(): Promise<Record<string, string>> {
  blurbs ??= fetch("/docs/next-stops.json")
    .then((response) =>
      response.ok ? (response.json() as Promise<Record<string, string>>) : {},
    )
    .catch(() => {
      // Asked again next time rather than remembered as empty.
      blurbs = undefined;
      return {};
    });
  return blurbs;
}

// Across navigations on purpose: the fling that turned the page is still
// delivering wheel events when the next page mounts.
let lastWheelAt = 0;

export function neighbours(tree: SidebarTree, pathname: string) {
  const components = tree.components.flatMap((section) =>
    section.items.map((item) => ({ title: item.title, href: item.href, group: section.label })),
  );
  const blocks = tree.blocks.flatMap((section) =>
    section.items.map((item) => ({ title: item.title, href: item.href, group: section.label })),
  );
  const order: Neighbour[] = [
    ...tree.guides
      .filter((item) => item.href.startsWith("/docs"))
      .map((item) => ({ title: item.title, href: item.href, group: "Get started" })),
    ...components,
    ...blocks,
  ];
  const index = order.findIndex((item) => item.href === pathname);
  if (index >= 0)
    return { current: order[index], previous: order[index - 1], next: order[index + 1] };
  // The galleries are not in the reading order; they lead into what they list.
  if (pathname === "/docs/components") {
    return { current: undefined, previous: undefined, next: components[0] };
  }
  if (pathname === "/docs/blocks") {
    return { current: undefined, previous: undefined, next: blocks[0] };
  }
  return { current: undefined, previous: undefined, next: undefined };
}

export function typing(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target.closest(
      "input, textarea, select, [role='slider'], [role='listbox'], [role='menu'], [role='tablist'], [role='radiogroup'], [role='dialog']",
    ) !== null
  );
}

export function DocsContinue({ tree }: { tree: SidebarTree }) {
  const pathname = usePathname();
  const router = useRouter();
  const meterRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [nearRef, near] = useNearViewport<HTMLElement>("700px");
  const [about, setAbout] = useState<Record<string, string>>({});
  const { current, previous, next } = useMemo(
    () => neighbours(tree, pathname),
    [tree, pathname],
  );
  const { stops } = usePageStops();
  const nextHref = next?.href;
  const previousHref = previous?.href;

  // Arriving from the page after this one: land at its end, where the reader
  // was headed, rather than at the top.
  useEffect(() => {
    let landing = false;
    try {
      landing = sessionStorage.getItem(LAND_KEY) === pathname;
      sessionStorage.removeItem(LAND_KEY);
    } catch {
      // No session storage: the page opens at its top, as any page does.
    }
    if (!landing) return;
    const timer = setTimeout(() => {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" });
    }, 80);
    return () => {
      clearTimeout(timer);
    };
  }, [pathname]);

  // What the next page is for, once the end of this one is in reach.
  useEffect(() => {
    if (!near) return;
    let wanted = true;
    void loadBlurbs().then((all) => {
      if (wanted) setAbout(all);
    });
    return () => {
      wanted = false;
    };
  }, [near]);

  // Arrival: the card lights once it is properly in view — the stops count in,
  // the badge throws its sparks, and the guide comes over to sit on it.
  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        card.setAttribute("data-arrived", "");
        // For whatever follows the reader about: the page has a new last stop.
        window.dispatchEvent(new Event("docs-journey-arrived"));
        observer.disconnect();
      },
      { threshold: 0.75 },
    );
    observer.observe(card);
    return () => {
      observer.disconnect();
      card.removeAttribute("data-arrived");
    };
  }, [pathname, nextHref]);

  useEffect(() => {
    if (!nextHref && !previousHref) return;
    const meter = meterRef.current;
    const card = cardRef.current;
    let pull = 0;
    let towards: 1 | -1 = 1;
    let counting = false;
    let gone = false;
    let patience: ReturnType<typeof setTimeout> | undefined;
    let touchY: number | undefined;

    const atEnd = () =>
      window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
    const atStart = () => window.scrollY <= 0;
    /** The edge this movement is pressing against, if there is a page beyond it. */
    const edge = (delta: number): 1 | -1 | 0 => {
      if (delta > 0 && nextHref && atEnd()) return 1;
      if (delta < 0 && previousHref && atStart()) return -1;
      return 0;
    };

    const paint = () => {
      if (!meter) return;
      meter.style.setProperty("--pull", Math.min(1, pull).toFixed(3));
      // The card fills with the meter when it is the way forward being pulled.
      card?.style.setProperty("--pull", towards > 0 ? Math.min(1, pull).toFixed(3) : "0");
      meter.dataset.towards = towards > 0 ? "next" : "previous";
      meter.toggleAttribute("data-active", pull > 0);
    };
    const release = () => {
      clearTimeout(patience);
      if (pull === 0 || gone) return;
      pull = 0;
      paint();
    };
    const turn = () => {
      const href = towards > 0 ? nextHref : previousHref;
      if (!href || gone) return;
      gone = true;
      clearTimeout(patience);
      meter?.setAttribute("data-gone", "");
      if (towards < 0) {
        try {
          sessionStorage.setItem(LAND_KEY, href);
        } catch {
          // Lands at the top instead.
        }
      }
      // Typed, so the stylesheet can move the pages the way the scroll was
      // going: the next one rises from below, the previous comes down.
      router.push(href, { transitionTypes: [towards > 0 ? "docs-forward" : "docs-back"] });
    };
    const add = (direction: 1 | -1, amount: number) => {
      if (gone) return;
      if (direction !== towards) pull = 0;
      towards = direction;
      if (pull === 0 && direction < 0 && previousHref) router.prefetch(previousHref);
      pull += amount;
      paint();
      if (pull >= 1) {
        turn();
        return;
      }
      clearTimeout(patience);
      patience = setTimeout(release, PATIENCE);
    };

    const onWheel = (event: WheelEvent) => {
      const now = event.timeStamp;
      const fresh = now - lastWheelAt > GESTURE_GAP;
      lastWheelAt = now;
      if (event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      const direction = edge(event.deltaY);
      if (direction === 0) {
        counting = false;
        release();
        return;
      }
      // Only a gesture that began at the edge counts; one that arrived there
      // mid-fling is the page coming to rest.
      if (fresh) counting = true;
      if (!counting) return;
      const travel = event.deltaMode === 1 ? event.deltaY * 32 : event.deltaY;
      add(direction, Math.abs(travel) / WHEEL_TRAVEL);
    };

    const onTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      touchY =
        touch && event.touches.length === 1 && nextHref && atEnd() ? touch.clientY : undefined;
    };
    const onTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (touchY === undefined || !touch || gone) return;
      const dragged = touchY - touch.clientY;
      if (dragged <= 0 || !atEnd()) {
        release();
        return;
      }
      towards = 1;
      pull = Math.min(1, dragged / TOUCH_TRAVEL);
      paint();
    };
    const onTouchEnd = () => {
      if (touchY === undefined) return;
      touchY = undefined;
      if (pull >= 1) turn();
      else release();
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      if (typing(event.target)) return;
      const down =
        event.key === "ArrowDown" ||
        event.key === "PageDown" ||
        (event.key === " " && !event.shiftKey);
      const up =
        event.key === "ArrowUp" ||
        event.key === "PageUp" ||
        (event.key === " " && event.shiftKey);
      if (!down && !up) return;
      const direction = edge(down ? 1 : -1);
      if (direction === 0) release();
      else add(direction, KEY_STEP);
    };

    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(patience);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
      window.removeEventListener("keydown", onKey);
      meter?.removeAttribute("data-active");
      meter?.removeAttribute("data-gone");
      meter?.style.removeProperty("--pull");
      card?.style.removeProperty("--pull");
    };
  }, [nextHref, previousHref, router]);

  if (!next && !previous) return null;

  const item = next?.href.match(/^\/docs\/(components|blocks)\/([^/]+)$/);
  const preview = item
    ? {
        kind: item[1] === "blocks" ? ("block" as const) : ("component" as const),
        name: item[2] ?? "",
      }
    : undefined;
  const blurb = next ? about[next.href] : undefined;
  const title = next ? <span className={styles.nextTitle}>{next.title}</span> : null;

  return (
    <>
      <nav ref={nearRef} aria-label="Continue reading" className={styles.continue}>
        {next ? (
          <div
            ref={cardRef}
            className={styles.nextCard}
            data-preview={preview ? "" : undefined}
            data-trail-terminus=""
            data-guide={`End of the line! Keep scrolling and I'll take you on to ${next.title}.`}
          >
            <div className={styles.nextText}>
              {/* What was just read: one light a section, counting in on arrival. */}
              {stops.length > 1 ? (
                <span className={styles.nextRecap}>
                  <span className={styles.nextDots} aria-hidden="true">
                    {stops.map((stop, index) => (
                      <span
                        key={stop.id}
                        className={styles.nextDot}
                        style={{ "--i": index } as CSSProperties}
                      />
                    ))}
                  </span>
                  <span>
                    {current ? `${current.title} · ` : ""}
                    {stops.length} sections read
                  </span>
                </span>
              ) : null}
              <span className={styles.nextEyebrow}>
                <span className={styles.nextPip} aria-hidden="true" />
                Next stop · {next.group}
              </span>
              {/* The link is the title, and reaches the whole card through its
                  ::after — the live preview beside it cannot sit inside an <a>. */}
              <Link href={next.href} className={styles.nextLink}>
                {title}
              </Link>
              {blurb ? <span className={styles.nextBlurb}>{blurb}</span> : null}
              <span className={styles.nextHint}>
                Keep scrolling past the end of the page to carry on
              </span>
            </div>
            {preview ? (
              <div className={`${styles.nextStage ?? ""} stage-surface`} aria-hidden="true">
                {near ? <NextPreview name={preview.name} kind={preview.kind} /> : null}
              </div>
            ) : null}
            <span className={styles.nextBadge} aria-hidden="true">
              <span className={styles.nextRing} />
              {SPARKS.map((angle) => (
                <span
                  key={angle}
                  className={styles.nextSpark}
                  style={{ "--angle": `${String(angle)}deg` } as CSSProperties}
                />
              ))}
              <ArrowDown className={styles.nextArrow} />
            </span>
          </div>
        ) : null}
        {previous ? (
          <Link href={previous.href} className={styles.previousLink}>
            <ArrowLeft aria-hidden="true" className="size-3.5" />
            <span className="truncate">Previous: {previous.title}</span>
          </Link>
        ) : null}
        <p className={styles.keysHint}>
          <kbd>j</kbd> <kbd>k</kbd> sections · <kbd>n</kbd> <kbd>p</kbd> pages · <kbd>?</kbd>{" "}
          all shortcuts
        </p>
      </nav>

      {/* The meter: what a continued scroll is filling, and what it leads to.
          The links above are the same journey for anyone not scrolling. */}
      <div ref={meterRef} className={styles.meter} aria-hidden="true">
        <span className={styles.meterFill} />
        <span className={styles.meterLabel} data-for="next">
          Keep scrolling · {next?.title}
        </span>
        <span className={styles.meterLabel} data-for="previous">
          Keep scrolling · back to {previous?.title}
        </span>
      </div>
    </>
  );
}
