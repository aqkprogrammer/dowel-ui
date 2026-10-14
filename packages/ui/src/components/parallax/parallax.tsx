"use client";

// Original design.
import { useCallback, useEffect, useRef, type ComponentPropsWithRef } from "react";

import { useInView } from "@/hooks/use-in-view";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

/*
 * Content that moves at its own rate as the page scrolls — slower, for depth
 * behind a hero; faster, for something that leaps forward.
 *
 * The outer box is measured and the inner box is moved, so the movement never
 * feeds back into the measurement. Offsets are relative to the middle of the
 * viewport: content sits exactly where the layout put it when it is centred,
 * and drifts either side of that. Updates are coalesced to one per frame, run
 * only while the element is near the screen, and write a transform and
 * nothing else. Scrolling itself is untouched. Under reduced motion it does
 * not move at all.
 */

/**
 * The offset for an element whose centre is `elementCentre` pixels from the
 * top of a viewport `viewport` tall: positive `speed` lags the scroll, as
 * something farther away would; negative leads it. Clamped to `max`.
 */
export function parallaxOffset(
  elementCentre: number,
  viewport: number,
  speed: number,
  max: number,
): number {
  const raw = (viewport / 2 - elementCentre) * speed;
  return Math.max(-max, Math.min(max, raw));
}

export interface ParallaxProps extends ComponentPropsWithRef<"div"> {
  /**
   * How much it lags (positive) or leads (negative) the scroll, as a share of
   * the distance scrolled. 0.2 is gentle; 1 stays fixed to the screen. Default 0.2.
   */
  speed?: number;
  /** Direction of travel. Default "vertical". */
  axis?: "vertical" | "horizontal";
  /** Furthest it moves from its place, in pixels. Default 200. */
  max?: number;
  /** Class for the inner, moving box. */
  layerClassName?: string;
}

/** Moves its content at a different rate from the scroll, for depth. */
export function Parallax({
  speed = 0.2,
  axis = "vertical",
  max = 200,
  className,
  layerClassName,
  children,
  ref,
  ...props
}: ParallaxProps) {
  const reduced = useReducedMotion();
  const { ref: inViewRef, inView } = useInView<HTMLDivElement>({ rootMargin: "200px" });
  const outer = useRef<HTMLDivElement | null>(null);
  const inner = useRef<HTMLDivElement | null>(null);

  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      outer.current = node;
      inViewRef(node);
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [inViewRef, ref],
  );

  useEffect(() => {
    const layer = inner.current;
    if (!layer) return;
    if (reduced || speed === 0 || !inView) {
      if (reduced || speed === 0) layer.style.transform = "";
      return;
    }

    let frame = 0;
    const update = () => {
      frame = 0;
      const box = outer.current?.getBoundingClientRect();
      if (!box) return;
      const vertical = axis === "vertical";
      const centre = vertical ? box.top + box.height / 2 : box.left + box.width / 2;
      const offset = parallaxOffset(
        centre,
        vertical ? window.innerHeight : window.innerWidth,
        speed,
        Math.max(0, max),
      );
      layer.style.transform = vertical
        ? `translate3d(0, ${offset.toFixed(1)}px, 0)`
        : `translate3d(${offset.toFixed(1)}px, 0, 0)`;
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
  }, [reduced, speed, axis, max, inView]);

  return (
    <div
      ref={setRefs}
      data-slot="parallax"
      data-axis={axis}
      className={cn("relative", className)}
      {...props}
    >
      <div
        ref={inner}
        data-slot="parallax-layer"
        className={cn("will-change-transform", layerClassName)}
      >
        {children}
      </div>
    </div>
  );
}
