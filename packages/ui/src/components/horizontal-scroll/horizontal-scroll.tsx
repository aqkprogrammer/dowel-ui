"use client";

// Original design.
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentPropsWithRef,
  type CSSProperties,
  type FocusEvent,
} from "react";

import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A row of items that travels sideways as the page scrolls down: the section
 * pins to the screen and its row slides across, then the page carries on.
 *
 * The page's own vertical scroll drives it — nothing listens to the wheel and
 * nothing takes the scroll over. The section is made exactly as much taller
 * as the row is wider than the screen, and the row's offset is read from how
 * far the section has scrolled. It renders as a plain horizontal scroller on
 * the server, without JavaScript, under reduced motion and with `pin={false}`,
 * and only pins once it is mounted and allowed to.
 *
 * Keyboard users are not stranded: focusing an item that is off to the side
 * scrolls the page to the point where that item is in view.
 */

/**
 * How far through its travel the row is, 0–1: the section's top has moved
 * `scrolled` pixels above the viewport's, out of `travel` it can move while
 * pinned.
 */
export function horizontalProgress(scrolled: number, travel: number): number {
  if (travel <= 0) return 0;
  return Math.min(1, Math.max(0, scrolled / travel));
}

const noSubscription = () => () => {};
const mounted = () => true;
const notMounted = () => false;

export interface HorizontalScrollProps extends ComponentPropsWithRef<"section"> {
  /** What the row holds, e.g. "Case studies". Names the region for screen readers. */
  label: string;
  /** Pin the section and slide the row as the page scrolls. Default true; false keeps a plain scroller. */
  pin?: boolean;
  /** Space between items, in pixels. Default 24. */
  gap?: number;
  /** Class for the row that holds the items. */
  trackClassName?: string;
}

/** A pinned section whose row of items slides sideways as the page scrolls down. */
export function HorizontalScroll({
  label,
  pin = true,
  gap = 24,
  className,
  trackClassName,
  style,
  children,
  ref,
  ...props
}: HorizontalScrollProps) {
  const reduced = useReducedMotion();
  const isMounted = useSyncExternalStore(noSubscription, mounted, notMounted);
  const pinned = pin && isMounted && !reduced;

  const section = useRef<HTMLElement | null>(null);
  const viewport = useRef<HTMLDivElement | null>(null);
  const track = useRef<HTMLDivElement | null>(null);
  // How much wider the row is than the screen: the distance it travels.
  const [travel, setTravel] = useState(0);

  const setRefs = useCallback(
    (node: HTMLElement | null) => {
      section.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  // Measure the row against the screen, and again whenever either resizes.
  useEffect(() => {
    if (!pinned) return;
    const row = track.current;
    const screen = viewport.current;
    if (!row || !screen) return;
    const measure = () => {
      setTravel(Math.max(0, row.scrollWidth - screen.clientWidth));
    };
    measure();
    if (typeof ResizeObserver !== "function") return;
    const observer = new ResizeObserver(measure);
    observer.observe(row);
    observer.observe(screen);
    return () => {
      observer.disconnect();
    };
  }, [pinned]);

  // Slide the row as the section scrolls past.
  useEffect(() => {
    const row = track.current;
    if (!row) return;
    if (!pinned) {
      row.style.transform = "";
      return;
    }
    let frame = 0;
    const update = () => {
      frame = 0;
      const box = section.current?.getBoundingClientRect();
      if (!box) return;
      const offset = horizontalProgress(-box.top, travel) * travel;
      row.style.transform = `translate3d(${(-offset).toFixed(1)}px, 0, 0)`;
    };
    const request = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request, { passive: true });
    return () => {
      window.removeEventListener("scroll", request);
      window.removeEventListener("resize", request);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [pinned, travel]);

  // Focus an item off to the side, and the page scrolls to where it shows.
  const handleFocus = (event: FocusEvent<HTMLDivElement>) => {
    if (!pinned || travel <= 0) return;
    const screen = viewport.current;
    const row = track.current;
    const box = section.current?.getBoundingClientRect();
    const item = (event.target as HTMLElement).closest<HTMLElement>(
      "[data-slot=horizontal-scroll-item]",
    );
    if (!screen || !row || !box || !item) return;
    // Focus scrolls an overflow-hidden box by itself; undo it, the page does it.
    screen.scrollLeft = 0;
    const wanted = item.offsetLeft - (screen.clientWidth - item.offsetWidth) / 2;
    const progress = horizontalProgress(wanted, travel);
    const top = window.scrollY + box.top + progress * travel;
    window.scrollTo({ top, behavior: "auto" });
  };

  return (
    <section
      ref={setRefs}
      aria-label={label}
      data-slot="horizontal-scroll"
      data-pinned={pinned || undefined}
      className={cn("relative", className)}
      style={
        {
          "--horizontal-scroll-gap": `${String(Math.max(0, gap))}px`,
          // Taller by exactly the row's extra width, so the pin lasts as long
          // as the row takes to cross.
          height: pinned ? `calc(100svh + ${String(travel)}px)` : undefined,
          ...style,
        } as CSSProperties
      }
      {...props}
    >
      <div
        ref={viewport}
        data-slot="horizontal-scroll-viewport"
        // A plain scroller must be focusable, or what is scrolled away is
        // unreachable by keyboard; pinned, the items carry the focus.
        tabIndex={pinned ? undefined : 0}
        className={cn(
          pinned
            ? "sticky top-0 flex h-svh items-center overflow-hidden"
            : "overflow-x-auto overscroll-x-contain",
          !pinned && focusRing,
        )}
        onFocus={handleFocus}
      >
        <div
          ref={track}
          data-slot="horizontal-scroll-track"
          className={cn(
            "flex w-max gap-(--horizontal-scroll-gap) will-change-transform",
            trackClassName,
          )}
        >
          {children}
        </div>
      </div>
    </section>
  );
}

export type HorizontalScrollItemProps = ComponentPropsWithRef<"div">;

/** One item in the row. Give it a width; it will not shrink. */
export function HorizontalScrollItem({ className, ...props }: HorizontalScrollItemProps) {
  return (
    <div data-slot="horizontal-scroll-item" className={cn("shrink-0", className)} {...props} />
  );
}
