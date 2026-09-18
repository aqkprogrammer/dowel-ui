"use client";

// Original design (pattern inspired by the WAI-ARIA APG Carousel pattern).
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FocusEvent,
  type KeyboardEvent,
} from "react";

import { Button, type ButtonProps } from "@/components/button";
import { mirrorForDirection } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * The state, keyboard and rotation rules every Dowel carousel shares, kept in
 * one file that each carousel carries so it installs on its own.
 *
 * - The index is controllable (`index` / `defaultIndex` / `onIndexChange`).
 * - Arrow keys follow the reading direction: in a right-to-left document the
 *   right arrow goes back, because "next" lies toward the inline end.
 * - Automatic rotation follows the APG: it has a stop/start control, pauses
 *   while the pointer is over the carousel or focus is inside it, and never
 *   starts by itself under reduced motion.
 */

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia(REDUCED_MOTION).matches
  );
}

function subscribeReducedMotion(onChange: () => void): () => void {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return () => {};
  }
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => {
    query.removeEventListener("change", onChange);
  };
}

/** Whether the reader has asked for less motion, kept live. */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribeReducedMotion, prefersReducedMotion, () => false);
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

export interface AutoRotateOptions {
  autoPlay: boolean;
  /** Milliseconds per slide. */
  interval: number;
  count: number;
  /** Changes whenever the slide changes, so a manual move restarts the clock. */
  resetKey: number;
  advance: () => void;
}

/** APG automatic rotation: a stop/start control, and pauses for hover and focus. */
export function useAutoRotate({
  autoPlay,
  interval,
  count,
  resetKey,
  advance,
}: AutoRotateOptions) {
  const reduced = usePrefersReducedMotion();
  const [playing, setPlaying] = useState(autoPlay);
  // Under reduced motion rotation only runs once the reader has asked for it.
  const [chosen, setChosen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const advanceRef = useRef(advance);

  useEffect(() => {
    advanceRef.current = advance;
  });

  const enabled = playing && (chosen || !reduced);
  const rotating = enabled && !hovered && !focused && count > 1;

  useEffect(() => {
    if (!rotating) return;
    const timer = setInterval(() => {
      advanceRef.current();
    }, interval);
    return () => {
      clearInterval(timer);
    };
  }, [rotating, interval, resetKey]);

  return {
    /** Whether rotation is switched on (it may still be paused by hover or focus). */
    enabled,
    /** Whether slides are changing by themselves right now. */
    rotating,
    toggle: () => {
      setChosen(true);
      setPlaying(!enabled);
    },
    rootProps: {
      onPointerEnter: () => {
        setHovered(true);
      },
      onPointerLeave: () => {
        setHovered(false);
      },
      // Focus on the rotation control itself does not pause: that is where a
      // keyboard user sits to start rotation and watch it run.
      onFocus: (event: FocusEvent<HTMLElement>) => {
        const target = event.target as Element;
        setFocused(target.closest("[data-slot=carousel-rotation]") === null);
      },
      onBlur: (event: FocusEvent<HTMLElement>) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
      },
    },
  };
}

/** Chains a consumer's handler before ours. */
export function chain<E>(ours: (event: E) => void, theirs?: (event: E) => void) {
  return (event: E) => {
    theirs?.(event);
    ours(event);
  };
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

export interface RotationButtonProps extends Omit<ButtonProps, "children" | "onClick"> {
  enabled: boolean;
  onToggle: () => void;
  stopLabel: string;
  startLabel: string;
}

/** The APG rotation control. Its name says what pressing it will do. */
export function RotationButton({
  enabled,
  onToggle,
  stopLabel,
  startLabel,
  className,
  ...props
}: RotationButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      data-slot="carousel-rotation"
      aria-label={enabled ? stopLabel : startLabel}
      className={cn("size-8 rounded-full bg-background/70 backdrop-blur-sm", className)}
      onClick={onToggle}
      {...props}
    >
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="size-3.5">
        {enabled ? (
          <path d="M7 5h3v14H7zM14 5h3v14h-3z" />
        ) : (
          <path d="M8 5.5v13a.5.5 0 0 0 .76.43l10.4-6.5a.5.5 0 0 0 0-.86L8.76 5.07A.5.5 0 0 0 8 5.5z" />
        )}
      </svg>
    </Button>
  );
}
