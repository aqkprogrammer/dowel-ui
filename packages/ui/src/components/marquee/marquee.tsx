"use client";

// Ported from SmoothUI Infinite Slider (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import { cva, type VariantProps } from "class-variance-authority";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentPropsWithRef,
  type CSSProperties,
  type ReactNode,
} from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * The source drives a motion value from JavaScript and re-measures on every
 * resize. A marquee is a constant-velocity loop, which is exactly what a CSS
 * keyframe is: the track holds two identical halves and slides by -50%, so
 * the second half lands where the first started and the loop has no seam.
 *
 * JavaScript only measures one half, to turn `speed` (px/s) into a duration.
 * Everything else — pausing on hover and focus, reversing, mirroring for
 * right-to-left text, stopping under reduced motion — is CSS, so it holds even
 * before hydration.
 */

const PREFIX = "dowel-marquee";

/*
 * Unlayered, so it outranks utilities: it is limited to the keyframes and to
 * data-slot selectors a consumer has no reason to override. The animation is
 * never set inline, because an inline animation would beat the reduced-motion
 * rule below.
 */
const STYLES = `
@keyframes ${PREFIX}-x{from{transform:translate3d(0,0,0)}to{transform:translate3d(calc(-50% * var(--${PREFIX}-sign,1)),0,0)}}
@keyframes ${PREFIX}-y{from{transform:translate3d(0,0,0)}to{transform:translate3d(0,-50%,0)}}
[data-slot=marquee]:dir(rtl){--${PREFIX}-sign:-1}
[data-slot=marquee]>[data-slot=marquee-track]{animation:var(--${PREFIX}-name) var(--${PREFIX}-duration) linear infinite}
[data-slot=marquee][data-reverse]>[data-slot=marquee-track]{animation-direction:reverse}
[data-slot=marquee][data-paused]>[data-slot=marquee-track],[data-slot=marquee][data-pause-on-hover]:hover>[data-slot=marquee-track],[data-slot=marquee][data-pause-on-hover]:focus-within>[data-slot=marquee-track]{animation-play-state:paused}
@media (prefers-reduced-motion: reduce){[data-slot=marquee]>[data-slot=marquee-track]{animation:none}}
`;

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function prefersReducedMotion(): boolean {
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

/** The root. The track and its halves follow the same orientation. */
const marqueeVariants = cva("relative flex", {
  variants: {
    orientation: {
      horizontal: "flex-row overflow-x-hidden",
      vertical: "flex-col overflow-y-hidden",
    },
  },
  defaultVariants: {
    orientation: "horizontal",
  },
});

/** Seconds a loop takes when nothing has been measured yet (server, first paint). */
const FALLBACK_SECONDS = 20;

export interface MarqueeProps
  extends ComponentPropsWithRef<"div">, VariantProps<typeof marqueeVariants> {
  children?: ReactNode;
  /** Space between items, and between the last item and the first again. Numbers are px. */
  gap?: number | string;
  /** Pixels per second. Converted to a duration from the measured length of the content. */
  speed?: number;
  /** Runs toward the inline end (or downward) instead of toward the start (or upward). */
  reverse?: boolean;
  /** Pauses while the pointer is over the marquee or focus is inside it. */
  pauseOnHover?: boolean;
  /** Pauses it outright — wire this to a visible pause control. */
  paused?: boolean;
  /**
   * How many times to repeat the content inside each half, for content shorter
   * than the viewport. Repeats are hidden from assistive technology.
   */
  repeat?: number;
}

/** Scrolls its children in a seamless, endless loop. */
export function Marquee({
  className,
  children,
  orientation = "horizontal",
  gap = 16,
  speed = 50,
  reverse = false,
  pauseOnHover = true,
  paused = false,
  repeat = 1,
  style,
  ...props
}: MarqueeProps) {
  const vertical = orientation === "vertical";
  const reduced = useSyncExternalStore(
    subscribeReducedMotion,
    prefersReducedMotion,
    () => false,
  );
  const firstHalf = useRef<HTMLDivElement>(null);
  const [length, setLength] = useState(0);

  useEffect(() => {
    const element = firstHalf.current;
    if (!element || reduced) return;
    const measure = () => {
      setLength(vertical ? element.offsetHeight : element.offsetWidth);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [vertical, reduced]);

  const seconds = length > 0 && speed > 0 ? length / speed : FALLBACK_SECONDS;
  const gapValue = typeof gap === "number" ? `${String(gap)}px` : gap;
  const copies = Math.max(1, Math.floor(repeat));

  const rootStyle: CSSProperties & Record<`--${string}`, string> = {
    [`--${PREFIX}-name`]: `${PREFIX}-${vertical ? "y" : "x"}`,
    // Through the motion scale like every other duration in the system.
    [`--${PREFIX}-duration`]: `calc(${String(Math.round(seconds * 1000))}ms * var(--motion-scale, 1))`,
    ...style,
  };

  const half = (index: number) => (
    <div
      key={index}
      ref={index === 0 ? firstHalf : undefined}
      data-slot="marquee-group"
      aria-hidden={index > 0 ? true : undefined}
      inert={index > 0 ? true : undefined}
      className={cn("flex shrink-0", vertical ? "flex-col" : "flex-row")}
      style={
        vertical
          ? { gap: gapValue, paddingBlockEnd: gapValue }
          : { gap: gapValue, paddingInlineEnd: gapValue }
      }
    >
      {Array.from({ length: copies }, (_, copy) =>
        index === 0 && copy === 0 ? (
          <div key={copy} className="contents">
            {children}
          </div>
        ) : (
          <div key={copy} className="contents" aria-hidden="true" inert>
            {children}
          </div>
        ),
      )}
    </div>
  );

  return (
    <div
      data-slot="marquee"
      data-orientation={orientation}
      data-reverse={reverse || undefined}
      data-paused={paused || undefined}
      data-pause-on-hover={pauseOnHover || undefined}
      data-reduced-motion={reduced || undefined}
      // Under reduced motion it stops and becomes an ordinary scroller: a named,
      // focusable region, so a keyboard user can reach it to scroll.
      role={reduced ? "region" : undefined}
      aria-label={reduced && !props["aria-labelledby"] ? "Scrolling content" : undefined}
      tabIndex={reduced ? 0 : undefined}
      className={cn(
        marqueeVariants({ orientation }),
        reduced && [focusRing, vertical ? "overflow-y-auto" : "overflow-x-auto"],
        className,
      )}
      style={rootStyle}
      {...props}
    >
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      <div
        data-slot="marquee-track"
        className={cn("flex shrink-0", vertical ? "h-max flex-col" : "w-max flex-row")}
      >
        {reduced ? half(0) : [half(0), half(1)]}
      </div>
    </div>
  );
}

export { marqueeVariants };
