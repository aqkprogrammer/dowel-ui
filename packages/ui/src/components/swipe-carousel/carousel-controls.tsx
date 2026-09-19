"use client";

// Original design (pattern inspired by the WAI-ARIA APG Carousel pattern).
import { useCallback, useState, type KeyboardEvent } from "react";

import { Button, type ButtonProps } from "@/components/button";
import { mirrorForDirection } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * The state and keyboard rules every Dowel carousel shares, kept in one file
 * that each carousel carries so it installs on its own. This carousel never
 * rotates by itself, so it carries the subset without the rotation control
 * (see reviews-carousel/carousel-controls.tsx for the full set).
 *
 * - The index is controllable (`index` / `defaultIndex` / `onIndexChange`).
 * - Arrow keys follow the reading direction: in a right-to-left document the
 *   right arrow goes back, because "next" lies toward the inline end.
 */

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia(REDUCED_MOTION).matches
  );
}

/** `index` wrapped into `[0, count)`. */
export function wrapIndex(index: number, count: number): number {
  if (count <= 0) return 0;
  return ((index % count) + count) % count;
}

export interface CarouselIndexOptions {
  count: number;
  index?: number;
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
  /** Wrap from the last slide to the first. Otherwise the ends are hard stops. */
  loop: boolean;
}

/** A controllable slide index that wraps or clamps. */
export function useCarouselIndex({
  count,
  index: indexProp,
  defaultIndex = 0,
  onIndexChange,
  loop,
}: CarouselIndexOptions) {
  const [uncontrolled, setUncontrolled] = useState(defaultIndex);
  const controlled = indexProp !== undefined;
  const raw = controlled ? indexProp : uncontrolled;
  const last = Math.max(0, count - 1);
  const index = loop ? wrapIndex(raw, count) : Math.min(Math.max(raw, 0), last);

  const goTo = useCallback(
    (target: number) => {
      const next = loop ? wrapIndex(target, count) : Math.min(Math.max(target, 0), last);
      if (next === index) return;
      if (!controlled) setUncontrolled(next);
      onIndexChange?.(next);
    },
    [loop, count, last, index, controlled, onIndexChange],
  );

  return {
    index,
    goTo,
    next: () => {
      goTo(index + 1);
    },
    previous: () => {
      goTo(index - 1);
    },
    canNext: count > 1 && (loop || index < last),
    canPrevious: count > 1 && (loop || index > 0),
  };
}

function isRightToLeft(element: Element): boolean {
  return element.closest("[dir]")?.getAttribute("dir") === "rtl";
}

export interface CarouselKeys {
  next: () => void;
  previous: () => void;
  first: () => void;
  last: () => void;
}

/**
 * Arrow keys (mirrored in RTL), Home and End, for the carousel's own controls.
 * It is bound to the buttons rather than the region, so arrow keys pressed
 * inside a slide's content — a text field, a slider — are never taken over.
 * Returns true when it handled the key.
 */
export function handleCarouselKey(
  event: KeyboardEvent<HTMLElement>,
  keys: CarouselKeys,
): boolean {
  if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return false;
  const rtl = isRightToLeft(event.currentTarget);
  const action = {
    ArrowRight: rtl ? keys.previous : keys.next,
    ArrowLeft: rtl ? keys.next : keys.previous,
    Home: keys.first,
    End: keys.last,
  }[event.key];
  if (!action) return false;
  event.preventDefault();
  action();
  return true;
}

export interface CarouselButtonProps extends Omit<ButtonProps, "children"> {
  direction: "previous" | "next";
}

/** A round previous/next button whose chevron mirrors in RTL. */
export function CarouselButton({ direction, className, ...props }: CarouselButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      data-slot={`carousel-${direction}`}
      className={cn("size-8 rounded-full bg-background/70 backdrop-blur-sm", className)}
      {...props}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={cn("size-4", mirrorForDirection)}
      >
        <path d={direction === "previous" ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6"} />
      </svg>
    </Button>
  );
}
