"use client";

// Original design.
import { cva, type VariantProps } from "class-variance-authority";
import { useRef, type ComponentPropsWithRef, type PointerEvent } from "react";

import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

/*
 * Images dropped along the pointer's path as it crosses a section, each one
 * landing, holding a moment and fading away — a portfolio hero, a gallery
 * teaser.
 *
 * Scoped to its own box: the system cursor is left alone and nothing happens
 * outside. A fixed pool of image elements is reused in turn, so moving the
 * pointer re-renders nothing and allocates nothing; each drop is one Web
 * Animation. Off for touch (there is no hover path to follow) and under
 * reduced motion, where the images never appear at all. The images are
 * decoration: alt-less, aria-hidden, and behind the content by default.
 */

const imageTrailVariants = cva("relative isolate overflow-hidden", {
  variants: {
    /** Whether the images pass behind the content or over it. */
    layer: {
      behind: "[&>[data-slot=image-trail-layer]]:z-0",
      above: "[&>[data-slot=image-trail-layer]]:z-20",
    },
  },
  defaultVariants: { layer: "behind" },
});

export interface ImageTrailProps
  extends ComponentPropsWithRef<"div">, VariantProps<typeof imageTrailVariants> {
  /** Image URLs, dropped in turn. */
  images: readonly string[];
  /** Width of each image, in pixels. Default 160. */
  size?: number;
  /** Height as a share of width. Default 1.25 (portrait, 4:5). */
  ratio?: number;
  /** Pointer travel between drops, in pixels. Default 80. */
  spacing?: number;
  /** How long each image stays, in milliseconds. Default 900. */
  lifetime?: number;
  /** Largest random tilt, in degrees. Default 8. */
  tilt?: number;
  /** How many images can be on screen at once. Default 10. */
  poolSize?: number;
}

/** Drops images along the pointer's path inside its box. */
export function ImageTrail({
  images,
  size = 160,
  ratio = 1.25,
  spacing = 80,
  lifetime = 900,
  tilt = 8,
  poolSize = 10,
  layer,
  className,
  children,
  onPointerMove,
  onPointerLeave,
  ...props
}: ImageTrailProps) {
  const reduced = useReducedMotion();
  const pool = useRef<(HTMLImageElement | null)[]>([]);
  const state = useRef({ x: 0, y: 0, started: false, next: 0, image: 0, z: 1, seed: 7 });
  const count = Math.max(1, Math.min(32, Math.round(poolSize)));
  const width = Math.max(16, size);
  const height = width * Math.max(0.2, ratio);

  const drop = (x: number, y: number) => {
    const trail = state.current;
    const element = pool.current[trail.next % count];
    const src = images[trail.image % images.length];
    if (!element || !src) return;
    trail.next += 1;
    trail.image += 1;
    trail.z += 1;
    // A cheap, repeatable wobble for the tilt.
    trail.seed = (trail.seed * 16807) % 2147483647;
    const angle = ((trail.seed / 2147483647) * 2 - 1) * tilt;

    element.src = src;
    element.style.left = `${String(x - width / 2)}px`;
    element.style.top = `${String(y - height / 2)}px`;
    element.style.zIndex = String(trail.z);
    const duration = Math.max(100, lifetime);
    if (typeof element.animate === "function") {
      element.animate(
        [
          { opacity: 0, transform: `scale(0.6) rotate(${String(angle)}deg)` },
          { opacity: 1, transform: `scale(1) rotate(${String(angle)}deg)`, offset: 0.15 },
          { opacity: 1, transform: `scale(1) rotate(${String(angle)}deg)`, offset: 0.6 },
          { opacity: 0, transform: `scale(0.9) rotate(${String(angle)}deg)` },
        ],
        { duration, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "forwards" },
      );
    } else {
      element.style.opacity = "1";
      window.setTimeout(() => {
        element.style.opacity = "0";
      }, duration);
    }
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    onPointerMove?.(event);
    if (reduced || event.pointerType !== "mouse" || images.length === 0) return;
    const box = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - box.left;
    const y = event.clientY - box.top;
    const trail = state.current;
    if (!trail.started) {
      trail.started = true;
      trail.x = x;
      trail.y = y;
      drop(x, y);
      return;
    }
    if (Math.hypot(x - trail.x, y - trail.y) < Math.max(4, spacing)) return;
    trail.x = x;
    trail.y = y;
    drop(x, y);
  };

  return (
    <div
      data-slot="image-trail"
      className={cn(imageTrailVariants({ layer }), className)}
      onPointerMove={handlePointerMove}
      onPointerLeave={(event) => {
        onPointerLeave?.(event);
        state.current.started = false;
      }}
      {...props}
    >
      <div
        aria-hidden="true"
        data-slot="image-trail-layer"
        className="pointer-events-none absolute inset-0"
      >
        {reduced
          ? null
          : Array.from({ length: count }, (_, index) => (
              <img
                key={index}
                ref={(element) => {
                  pool.current[index] = element;
                }}
                alt=""
                draggable={false}
                data-slot="image-trail-image"
                className="absolute rounded-lg object-cover opacity-0 shadow-lg select-none"
                style={{ width, height }}
              />
            ))}
      </div>
      <div data-slot="image-trail-content" className="relative z-10 h-full">
        {children}
      </div>
    </div>
  );
}

export { imageTrailVariants };
