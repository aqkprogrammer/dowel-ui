"use client";

// Ported from SmoothUI Dynamic Island (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import { cva, type VariantProps } from "class-variance-authority";
import {
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type ReactNode,
  type RefObject,
} from "react";

import { cn } from "@/lib/utils";

/*
 * A pill that reshapes itself around whatever it is showing: an idle glyph,
 * an incoming call, a timer, a player. The source drove this with motion's
 * `layout` spring; here the pill's size is measured (ResizeObserver) and the
 * width/height change is a CSS transition on an overshooting curve, which is
 * the same bounce without a JavaScript animation loop. Any change of size
 * animates — a new view *or* content growing inside the current one — because
 * the measurement does not care why the content changed.
 *
 * The incoming view blurs and scales in through a hoisted keyframe. Both stop
 * under reduced motion: the pill simply is its new size.
 */

const STYLES = `
@keyframes dowel-island-enter {
  from { opacity: 0; scale: 0.9; filter: blur(5px); }
  to { opacity: 1; scale: 1; filter: blur(0); }
}
[data-slot="island-content"] {
  animation: dowel-island-enter calc(300ms * var(--motion-scale)) var(--ease-out-quint)
    calc(50ms * var(--motion-scale)) both;
}
`;

const islandVariants = cva(
  cn(
    "relative inline-flex min-w-[6.25rem] items-center justify-center overflow-hidden rounded-[2rem]",
    "transition-[width,height] duration-[var(--duration-slow)]",
  ),
  {
    variants: {
      tone: {
        /** The source's black pill: the inverse of the page. */
        inverted: "bg-foreground text-background",
        card: "border border-border bg-card text-card-foreground shadow-md",
        primary: "bg-primary text-primary-foreground",
      },
    },
    defaultVariants: {
      tone: "inverted",
    },
  },
);

export type IslandBounce = number | ((from: string, to: string) => number);

export interface IslandProps<V extends string = string>
  extends Omit<ComponentPropsWithRef<"div">, "children">, VariantProps<typeof islandVariants> {
  /** The view currently shown — a key of `views`. */
  view: V;
  /** Content for each view, e.g. `{ compact: …, expanded: … }`. */
  views: Record<V, ReactNode>;
  /**
   * How far the pill overshoots its new size, 0 (none) to 1. A function gets
   * the previous and next view, so each transition can have its own feel.
   */
  bounce?: IslandBounce;
  /**
   * Announce each new view to screen readers. Off by default: an island that
   * announces every idle tick trains people to ignore it.
   */
  live?: "off" | "polite" | "assertive";
}

/** Maps a 0–1 bounce onto the overshoot of a cubic-bezier, clamped. */
export function islandEasing(bounce: number): string {
  const overshoot = 1 + Math.min(1, Math.max(0, bounce)) * 0.8;
  return `cubic-bezier(0.34, ${overshoot.toFixed(2)}, 0.64, 1)`;
}

/** The content box's size, or null until it has been measured. */
function useMeasuredSize(ref: RefObject<HTMLElement | null>) {
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => {
      const width = element.offsetWidth;
      const height = element.offsetHeight;
      if (!width || !height) return;
      setSize((previous) =>
        previous?.width === width && previous.height === height ? previous : { width, height },
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return size;
}

/** A pill that morphs between views, resizing around its content. */
export function Island<V extends string>({
  className,
  style,
  view,
  views,
  bounce = 0.5,
  live = "off",
  tone,
  ...props
}: IslandProps<V>) {
  const measureRef = useRef<HTMLDivElement>(null);
  const size = useMeasuredSize(measureRef);

  // The view we are coming from, captured when `view` changes, so a bounce
  // function can tell one transition from another.
  const [shown, setShown] = useState<V>(view);
  const [from, setFrom] = useState<V>(view);
  if (shown !== view) {
    setFrom(shown);
    setShown(view);
  }

  const amount = typeof bounce === "function" ? bounce(from, view) : bounce;

  return (
    <div
      data-slot="island"
      data-view={view}
      aria-live={live === "off" ? undefined : live}
      aria-atomic={live === "off" ? undefined : true}
      className={cn(islandVariants({ tone }), className)}
      style={{
        width: size?.width,
        height: size?.height,
        transitionTimingFunction: islandEasing(amount),
        ...style,
      }}
      {...props}
    >
      <style href="dowel-island" precedence="dowel">
        {STYLES}
      </style>
      <div ref={measureRef} data-slot="island-measure" className="w-max shrink-0">
        <div key={view} data-slot="island-content">
          {views[view]}
        </div>
      </div>
    </div>
  );
}

export { islandVariants };
