"use client";

// Original design.
import { useSyncExternalStore } from "react";

/*
 * Whether motion should be reduced: the operating system's preference, or the
 * theme's own `--motion-scale` turned down to (near) zero.
 *
 * One subscription per page however many components ask, through
 * `useSyncExternalStore`, so it updates the moment either changes — the media
 * query's `change` event for the OS setting, a MutationObserver on <html> for
 * a theme switch. It renders `false` on the server and during hydration, so
 * the first paint matches; components decide what that frame shows.
 */

const QUERY = "(prefers-reduced-motion: reduce)";

function media(): MediaQueryList | null {
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia(QUERY)
    : null;
}

/** Reads the preference now, outside React. */
export function motionIsReduced(): boolean {
  if (typeof window === "undefined") return false;
  if (media()?.matches) return true;
  const scale = Number.parseFloat(
    window.getComputedStyle(document.documentElement).getPropertyValue("--motion-scale"),
  );
  return Number.isFinite(scale) && scale < 0.01;
}

function subscribe(onChange: () => void): () => void {
  const query = media();
  query?.addEventListener("change", onChange);
  const observer =
    typeof MutationObserver === "function" ? new MutationObserver(onChange) : undefined;
  observer?.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class", "style", "data-theme"],
  });
  return () => {
    query?.removeEventListener("change", onChange);
    observer?.disconnect();
  };
}

function serverSnapshot(): boolean {
  return false;
}

/** True while motion should be reduced; updates when the setting changes. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, motionIsReduced, serverSnapshot);
}
