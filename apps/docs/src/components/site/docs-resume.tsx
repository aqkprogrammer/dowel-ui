"use client";

import { ArrowDown, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import styles from "./docs-journey.module.css";
import { usePageStops } from "./page-stops";

/**
 * Remembers where on a page a reader stopped, and offers it back.
 *
 * Whichever section was being read when they left is kept, per page, in the
 * browser. Coming back to the top of that page, a small offer drops in — one
 * click and they are where they were. It is an offer, not a jump: nothing
 * moves unless asked, it goes away on its own, and a page read to its end has
 * nothing to resume.
 */
const KEY = "docs-reading-places";
/** A place older than this is a different visit, not an interrupted one. */
const SHELF_LIFE = 30 * 24 * 60 * 60 * 1000;
const MOST = 40;

interface Place {
  id: string;
  label: string;
  at: number;
}

function readPlaces(): Record<string, Place> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<string, Place>;
  } catch {
    return {};
  }
}

function writePlace(pathname: string, place: Place | null) {
  try {
    const places = readPlaces();
    if (place) places[pathname] = place;
    else delete places[pathname];
    // The most recent few; nobody resumes their forty-first page.
    const kept = Object.entries(places)
      .sort(([, a], [, b]) => b.at - a.at)
      .slice(0, MOST);
    localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(kept)));
  } catch {
    // Blocked site data: there is simply nothing to resume.
  }
}

export function DocsResume() {
  const pathname = usePathname();
  const { stops, active } = usePageStops();
  const [offer, setOffer] = useState<{ pathname: string; place: Place } | null>(null);

  // Keep the place: past the first section and short of the last.
  useEffect(() => {
    const stop = stops[active];
    if (!stop || active < 1) return;
    writePlace(
      pathname,
      active >= stops.length - 1 ? null : { id: stop.id, label: stop.label, at: Date.now() },
    );
  }, [pathname, stops, active]);

  // Offer it back, to someone who has arrived at the top with nowhere in mind.
  useEffect(() => {
    const place = readPlaces()[pathname];
    if (!place || Date.now() - place.at > SHELF_LIFE || window.location.hash) return;
    const show = setTimeout(() => {
      if (window.scrollY > 80 || !document.getElementById(place.id)) return;
      setOffer({ pathname, place });
    }, 700);
    const withdraw = setTimeout(() => {
      setOffer(null);
    }, 12_000);
    // Reading on from the top is an answer too.
    const onScroll = () => {
      if (window.scrollY > 500) setOffer(null);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      clearTimeout(show);
      clearTimeout(withdraw);
      window.removeEventListener("scroll", onScroll);
    };
  }, [pathname]);

  if (offer?.pathname !== pathname) return null;

  return (
    <aside aria-label="Resume reading" className={styles.resume}>
      <span className={styles.resumeLabel}>Pick up where you left off</span>
      <button
        type="button"
        className={styles.resumeGo}
        onClick={() => {
          document.getElementById(offer.place.id)?.scrollIntoView();
          setOffer(null);
        }}
      >
        <span className="truncate">{offer.place.label}</span>
        <ArrowDown aria-hidden="true" className="size-3.5 shrink-0" />
      </button>
      <button
        type="button"
        className={styles.resumeClose}
        aria-label="Dismiss"
        onClick={() => {
          setOffer(null);
        }}
      >
        <X aria-hidden="true" className="size-3.5" />
      </button>
    </aside>
  );
}
