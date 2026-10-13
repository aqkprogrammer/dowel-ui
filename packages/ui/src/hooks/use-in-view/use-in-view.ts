"use client";

// Original design.
import { useCallback, useEffect, useRef, useState } from "react";

/*
 * Whether an element is on screen, for pausing what nobody can see: an
 * autoplaying carousel, a canvas loop, a ticker.
 *
 * It returns a callback ref rather than taking one, so it follows the element
 * if React swaps it, and disconnects when the element goes. Where there is no
 * IntersectionObserver — old browsers, tests, the server — it reports
 * `initial`, which defaults to true: assuming an element is visible keeps
 * content showing and behaviour working; assuming it is hidden would strand
 * something invisible or frozen.
 */

export interface UseInViewOptions {
  /** Grows (or shrinks) the viewport used for the test, as CSS margins. Default "0px". */
  rootMargin?: string;
  /** Fraction of the element that must be visible to count, 0–1. Default 0. */
  threshold?: number;
  /** Stop watching after the first time it comes into view. Default false. */
  once?: boolean;
  /** What to report before the first observation, and with no observer. Default true. */
  initial?: boolean;
}

export interface UseInViewResult<T extends Element> {
  /** Attach to the element to watch. */
  ref: (node: T | null) => void;
  inView: boolean;
}

export function useInView<T extends Element = HTMLElement>({
  rootMargin = "0px",
  threshold = 0,
  once = false,
  initial = true,
}: UseInViewOptions = {}): UseInViewResult<T> {
  const [node, setNode] = useState<T | null>(null);
  const [inView, setInView] = useState(initial);
  const seen = useRef(false);

  useEffect(() => {
    if (!node || typeof IntersectionObserver !== "function") return;
    if (once && seen.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          // After the first sighting, `once` ignores any entry still in flight.
          if (once && seen.current) return;
          setInView(entry.isIntersecting);
          if (entry.isIntersecting && once) {
            seen.current = true;
            observer.disconnect();
          }
        }
      },
      { rootMargin, threshold },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
    };
  }, [node, rootMargin, threshold, once]);

  const ref = useCallback((next: T | null) => {
    setNode(next);
  }, []);

  return { ref, inView };
}
