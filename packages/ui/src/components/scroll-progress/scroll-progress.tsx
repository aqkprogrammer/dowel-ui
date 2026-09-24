"use client";

// Original design (pattern inspired by Rare UI Scroll Progress; no code referenced).
import { cva, type VariantProps } from "class-variance-authority";
import { MotionConfig, motion, useReducedMotion, useScroll, useSpring } from "motion/react";
import { useMemo, type ComponentPropsWithRef, type RefObject } from "react";

import { cn } from "@/lib/utils";

/*
 * A thin bar that fills as the reader moves through the page, or through one
 * scroll container.
 *
 * Progress is derived, never stored: motion's `useScroll` reads the scroll
 * offset over the scrollable distance on every scroll (on the compositor,
 * where scroll timelines are supported), so it stays right through resizes
 * and content that loads late. Scroll values arrive in steps, so the fill
 * follows them through a spring rather than jumping frame to frame; under
 * reduced motion it tracks the raw value instead. Nothing re-renders on scroll.
 *
 * The fill is a `scaleX` from the start edge — the reading direction, so the
 * origin flips in right-to-left — never a width, so scrolling costs no
 * layout. Colour it with a text utility (the fill is `currentColor`, the
 * foreground by default) and give the track a background if you want one.
 *
 * It is decorative and aria-hidden. It repeats what the scrollbar already
 * reports, and a live progressbar would be worse than nothing: some screen
 * readers announce, or beep for, every change of a progressbar's value, which
 * on a scrolling page is a continuous stream.
 */

const scrollProgressVariants = cva("pointer-events-none overflow-hidden text-foreground", {
  variants: {
    /** Pinned to an edge of the viewport, or in the flow where it is placed. */
    position: {
      top: "fixed inset-x-0 top-0 z-[var(--z-sticky)]",
      bottom: "fixed inset-x-0 bottom-0 z-[var(--z-sticky)]",
      static: "relative w-full",
    },
    /** Thickness of the bar. */
    size: {
      xs: "h-px",
      sm: "h-0.5",
      md: "h-[3px]",
      lg: "h-1",
    },
  },
  defaultVariants: { position: "top", size: "sm" },
});

/** A scroll container: a ref to one, or the element itself. */
export type ScrollProgressContainer = RefObject<HTMLElement | null> | HTMLElement | null;

export interface ScrollProgressProps
  extends
    Omit<ComponentPropsWithRef<"div">, "children">,
    VariantProps<typeof scrollProgressVariants> {
  /** The element whose scrolling is tracked. Omit it to track the page. */
  container?: ScrollProgressContainer;
}

const SPRING = { stiffness: 240, damping: 36, restDelta: 0.0005, skipInitialAnimation: true };

function isRef(container: ScrollProgressContainer): container is RefObject<HTMLElement | null> {
  return container !== null && "current" in container;
}

/** A bar tracking how far the page, or a container, has been scrolled. */
export function ScrollProgress({
  className,
  container,
  position,
  size,
  ...props
}: ScrollProgressProps) {
  const element = container && !isRef(container) ? container : null;
  // `useScroll` takes a ref; an element is wrapped in a stable one.
  const elementRef = useMemo(() => ({ current: element }), [element]);
  const ref = container && isRef(container) ? container : element ? elementRef : undefined;
  const { scrollYProgress } = useScroll(ref ? { container: ref } : {});
  const smoothed = useSpring(scrollYProgress, SPRING);
  const reduced = useReducedMotion() ?? false;

  return (
    <MotionConfig reducedMotion="user">
      <div
        aria-hidden="true"
        data-slot="scroll-progress"
        className={cn(scrollProgressVariants({ position, size }), className)}
        {...props}
      >
        <motion.div
          data-slot="scroll-progress-bar"
          className="size-full origin-left bg-current rtl:origin-right"
          style={{ scaleX: reduced ? scrollYProgress : smoothed }}
        />
      </div>
    </MotionConfig>
  );
}

export { scrollProgressVariants };
