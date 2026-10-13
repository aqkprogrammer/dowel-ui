"use client";

// Original design.
import {
  useEffect,
  useReducer,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type KeyboardEvent,
  type PointerEvent,
} from "react";

import { useInView } from "@/hooks/use-in-view";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * Images stood on a turning ring — a circular gallery in CSS 3D.
 *
 * Each image is placed once, around a cylinder whose radius fits them edge to
 * edge; only the ring's angle changes, written straight to the DOM each
 * frame, so turning costs no re-renders. Images further round fade back.
 * It turns slowly on its own, and stops while the pointer or focus is on it,
 * while it is off-screen, in a hidden tab, and always under reduced motion.
 * Drag it, or focus it and use the arrow keys, to turn it by hand; it eases
 * to the angle rather than snapping. To assistive technology it is a named
 * list of images, so every alt text is read in order, whatever is in front.
 * Too wide for its container, it scales down to fit.
 */

export interface ImageRingItem {
  src: string;
  /** Describes the image. Pass "" only for an image that is pure decoration. */
  alt: string;
}

export interface ImageRingProps extends ComponentPropsWithRef<"div"> {
  images: ImageRingItem[];
  /** Names the gallery. */
  label: string;
  /** Width of each image, in pixels. Default 160. */
  itemWidth?: number;
  /** Height of each image, in pixels. Default 220. */
  itemHeight?: number;
  /** Space between neighbours, in pixels. Default 16. */
  gap?: number;
  /** Seconds for one full turn on its own; 0 holds it still. Default 40. */
  duration?: number;
  /** Tilt of the ring toward the viewer, in degrees. Default -6. */
  tilt?: number;
}

/** The ring's radius that sets `count` items of `span` pixels edge to edge. */
export function ringRadius(count: number, span: number): number {
  if (count < 3) return span;
  return span / 2 / Math.tan(Math.PI / count);
}

/** A circular gallery of images on a slowly turning ring. */
export function ImageRing({
  images,
  label,
  itemWidth = 160,
  itemHeight = 220,
  gap = 16,
  duration = 40,
  tilt = -6,
  className,
  style,
  ...props
}: ImageRingProps) {
  const count = images.length;
  const step = count > 0 ? 360 / count : 0;
  const radius = ringRadius(count, itemWidth + gap);
  const reduced = useReducedMotion();
  const { ref: viewRef, inView } = useInView<HTMLDivElement>({ rootMargin: "100px" });
  const [held, setHeld] = useState(false);
  const [scale, setScale] = useState(1);
  const ring = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement | null>(null);
  const angle = useRef({ now: 0, target: 0 });
  const drag = useRef<{ x: number; from: number; id: number } | null>(null);
  // Whether a frame is scheduled; when it is not, a manual turn re-renders to start one.
  const running = useRef(false);
  const [, kick] = useReducer((n: number) => n + 1, 0);

  // Scale down to fit a narrow container.
  useEffect(() => {
    const node = box.current;
    if (!node) return;
    const needed = radius * 2 + itemWidth;
    // Measure now as well: the observer's first report waits for a rendering
    // step, which a background tab does not take.
    if (node.clientWidth > 0) setScale(Math.min(1, node.clientWidth / needed));
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      const width = entry?.contentRect.width ?? needed;
      setScale(Math.min(1, width / needed));
    });
    observer.observe(node);
    return () => {
      observer.disconnect();
    };
  }, [radius, itemWidth]);

  /** Writes the ring's angle and each image's fade, without re-rendering. */
  const paint = () => {
    const node = ring.current;
    if (!node) return;
    const { now } = angle.current;
    node.style.transform = `translateZ(${String(-radius)}px) rotateX(${String(tilt)}deg) rotateY(${String(now)}deg)`;
    const items = node.children;
    for (let i = 0; i < items.length; i += 1) {
      const facing = Math.cos(((i * step + now) * Math.PI) / 180);
      (items[i] as HTMLElement).style.opacity = String(0.3 + 0.7 * Math.max(0, facing));
    }
  };

  const spinning = duration > 0 && !reduced && inView && !held && count > 1;
  const easing = !reduced;

  // One loop: drift on its own when allowed, and ease toward the target angle.
  useEffect(() => {
    paint();
    if (!spinning && !easing) return;
    running.current = true;
    let frame = 0;
    let last = 0;
    const speed = duration > 0 ? 360 / duration : 0;
    const tick = (time: number) => {
      const dt = last ? Math.min(0.1, (time - last) / 1000) : 0;
      last = time;
      const state = angle.current;
      if (spinning && !drag.current) state.target -= speed * dt;
      const gap = state.target - state.now;
      state.now = Math.abs(gap) < 0.01 ? state.target : state.now + gap * Math.min(1, dt * 8);
      paint();
      if (spinning || Math.abs(state.target - state.now) > 0.01 || drag.current) {
        frame = requestAnimationFrame(tick);
      } else {
        frame = 0;
        running.current = false;
      }
    };
    frame = requestAnimationFrame(tick);
    return () => {
      running.current = false;
      if (frame) cancelAnimationFrame(frame);
    };
  });

  /** Moves the target; reduced motion jumps straight there. */
  const turnTo = (target: number) => {
    angle.current.target = target;
    if (reduced) angle.current.now = target;
    paint();
    if (!running.current && !reduced) kick();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
    const by = event.key === "ArrowRight" ? -step : event.key === "ArrowLeft" ? step : 0;
    if (!by) return;
    event.preventDefault();
    // Snap to the nearest image, then step one.
    const base = Math.round(angle.current.target / step) * step;
    turnTo(base + (rtl ? -by : by));
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    drag.current = { x: event.clientX, from: angle.current.target, id: event.pointerId };
    event.currentTarget.setPointerCapture(event.pointerId);
    setHeld(true);
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (current?.id !== event.pointerId) return;
    // A drag the width of one image turns the ring by one image.
    turnTo(current.from + ((event.clientX - current.x) / (itemWidth + gap)) * step);
  };
  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.id !== event.pointerId) return;
    drag.current = null;
    setHeld(false);
  };

  return (
    // The arrow keys turn the ring the reader has focused; a focusable region.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <div
      ref={(node) => {
        box.current = node;
        viewRef(node);
      }}
      role="region"
      aria-label={label}
      tabIndex={0}
      data-slot="image-ring"
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerEnter={() => {
        setHeld(true);
      }}
      onPointerLeave={() => {
        if (!drag.current) setHeld(false);
      }}
      onFocus={() => {
        setHeld(true);
      }}
      onBlur={() => {
        setHeld(false);
      }}
      className={cn(
        "relative flex w-full cursor-grab touch-pan-y items-center justify-center overflow-hidden rounded-xl select-none active:cursor-grabbing",
        focusRing,
        className,
      )}
      style={{ height: (itemHeight + 80) * scale, ...style }}
      {...props}
    >
      <div
        className="relative perspective-[1600px]"
        style={{ width: itemWidth, height: itemHeight, scale: String(scale) }}
      >
        <div
          ref={ring}
          role="list"
          data-slot="image-ring-ring"
          className="relative size-full transform-3d"
          style={{
            transform: `translateZ(${String(-radius)}px) rotateX(${String(tilt)}deg) rotateY(0deg)`,
          }}
        >
          {images.map((image, index) => (
            <div
              key={`${image.src}-${String(index)}`}
              role="listitem"
              data-slot="image-ring-item"
              className="absolute inset-0 overflow-hidden rounded-xl border border-border bg-muted shadow-md"
              style={{
                transform: `rotateY(${String(index * step)}deg) translateZ(${String(radius)}px)`,
              }}
            >
              <img
                src={image.src}
                alt={image.alt}
                draggable={false}
                loading="lazy"
                decoding="async"
                className="size-full object-cover"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
