"use client";

import { cn } from "@dowel-ui/react";
import { ChevronDown } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import styles from "./docs-journey.module.css";
import { usePageStops } from "./page-stops";

/**
 * Where a reader is on the page, for screens with no room for a sidebar.
 *
 * A slim bar under the header: the section being read, how many there are,
 * and a line that fills with the page. It opens to the page's sections — the
 * sidebar's timeline, folded into one row. A native disclosure, so it works
 * before the page hydrates and needs no state.
 */
export function DocsProgress({ className }: { className?: string }) {
  const pathname = usePathname();
  const { stops, active } = usePageStops();
  const detailsRef = useRef<HTMLDetailsElement | null>(null);
  const fillRef = useRef<HTMLSpanElement | null>(null);

  // The line follows the scroll directly: one transform a frame, no render.
  useEffect(() => {
    const fill = fillRef.current;
    if (!fill) return;
    let frame = 0;
    const paint = () => {
      frame = 0;
      const room = document.documentElement.scrollHeight - window.innerHeight;
      const read = room > 0 ? Math.min(1, Math.max(0, window.scrollY / room)) : 0;
      fill.style.transform = `scaleX(${read.toFixed(4)})`;
    };
    const request = () => {
      if (frame === 0) frame = requestAnimationFrame(paint);
    };
    request();
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", request);
      window.removeEventListener("resize", request);
    };
  }, []);

  // Another page: the list that was open belonged to the last one.
  useEffect(() => {
    if (detailsRef.current) detailsRef.current.open = false;
  }, [pathname]);

  const current = stops[active];

  return (
    <div className={cn(styles.progress, "glass", className)}>
      {stops.length > 1 ? (
        <details ref={detailsRef} className={styles.progressDetails}>
          <summary className={styles.progressSummary}>
            <span className={styles.progressDot} aria-hidden="true" />
            <span className="truncate">{current ? current.label : "On this page"}</span>
            <span className={styles.progressCount}>
              {Math.max(active, 0) + (current ? 1 : 0)}/{stops.length}
            </span>
            <ChevronDown aria-hidden="true" className={styles.progressChevron} />
          </summary>
          <ol className={styles.progressList}>
            {stops.map((stop, index) => (
              <li key={stop.id}>
                <a
                  href={`#${stop.id}`}
                  aria-current={index === active ? "location" : undefined}
                  data-state={index < active ? "done" : index === active ? "current" : "ahead"}
                  className={styles.section}
                  onClick={() => {
                    if (detailsRef.current) detailsRef.current.open = false;
                  }}
                >
                  <span className="truncate">{stop.label}</span>
                </a>
              </li>
            ))}
          </ol>
        </details>
      ) : null}
      <span className={styles.progressTrack} aria-hidden="true">
        <span ref={fillRef} className={styles.progressFill} />
      </span>
    </div>
  );
}
