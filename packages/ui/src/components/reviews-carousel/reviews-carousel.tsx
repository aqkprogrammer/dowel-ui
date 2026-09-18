"use client";

// Ported from SmoothUI Reviews Carousel (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import { cva } from "class-variance-authority";
import type { ComponentPropsWithRef, CSSProperties, KeyboardEvent, ReactNode } from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

import {
  CarouselButton,
  RotationButton,
  chain,
  handleCarouselKey,
  useAutoRotate,
  useCarouselIndex,
} from "./carousel-controls";

/*
 * A stack of cards: the active review in front, the next three receding
 * upward behind it, the ones already read fading and blurring out below.
 *
 * The source animates each card with a motion spring. Nothing here carries a
 * gesture's velocity — every change comes from a button, a key or a timer — so
 * each card is a CSS transition between computed positions, and the global
 * reduced-motion rule makes the change instant.
 */

/** Vertical step between stacked cards, and how many stay visible behind. */
const STEP_REM = 1.875;
const VISIBLE_BEHIND = 3;

const reviewsCarouselVariants = cva(
  cn(
    "col-start-1 row-start-1 w-[calc(100%-2rem)] max-w-xl rounded-2xl border border-border",
    "bg-card/80 p-4 text-card-foreground shadow-lg backdrop-blur-md sm:p-6",
    "transition-[translate,scale,opacity,filter] duration-[var(--duration-slow)] ease-[var(--ease-out-quint)]",
    "pointer-events-none data-[state=active]:pointer-events-auto",
  ),
);

export interface Review {
  id: string | number;
  /** The quotation. */
  body: ReactNode;
  author: ReactNode;
  /** A role or affiliation under the author's name. */
  title?: ReactNode;
  /** An avatar node, rendered before the author. */
  avatar?: ReactNode;
}

export interface ReviewsCarouselLabels {
  previous: string;
  next: string;
  stop: string;
  start: string;
  /** Names each slide for its position. */
  slide: (index: number, count: number) => string;
  /** Names each indicator button. */
  indicator: (index: number, count: number) => string;
}

const DEFAULT_LABELS: ReviewsCarouselLabels = {
  previous: "Previous review",
  next: "Next review",
  stop: "Stop automatic slide show",
  start: "Start automatic slide show",
  slide: (index, count) => `${String(index + 1)} of ${String(count)}`,
  indicator: (index) => `Review ${String(index + 1)}`,
};

export interface ReviewsCarouselProps extends Omit<
  ComponentPropsWithRef<"section">,
  "children"
> {
  reviews: Review[];
  /** Controlled active review. */
  index?: number;
  /** Initial active review when uncontrolled. */
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
  /** Wrap from the last review to the first. The source stops at the ends. */
  loop?: boolean;
  showNavigation?: boolean;
  showIndicators?: boolean;
  /** Advances on a timer, with a stop/start control; never starts by itself under reduced motion. */
  autoPlay?: boolean;
  /** Milliseconds per review while playing. */
  autoPlayInterval?: number;
  /** Visible and accessible text, for localisation. */
  labels?: Partial<ReviewsCarouselLabels>;
}

/** Where a card sits relative to the active one. */
function placement(offset: number): CSSProperties {
  if (offset < 0) {
    return {
      translate: `0 ${String(-offset * STEP_REM)}rem`,
      scale: "1.08",
      opacity: 0,
      filter: "blur(2px)",
    };
  }
  const depth = Math.min(offset, VISIBLE_BEHIND);
  return {
    translate: `0 ${String(-depth * STEP_REM)}rem`,
    scale: String(Math.max(0.08, 1 - offset * 0.08)),
    opacity: offset > VISIBLE_BEHIND ? 0 : 1,
  };
}

/** Testimonials stacked in depth, stepped through with buttons, indicators or arrow keys. */
export function ReviewsCarousel({
  className,
  reviews,
  index: indexProp,
  defaultIndex,
  onIndexChange,
  loop = false,
  showNavigation = true,
  showIndicators = true,
  autoPlay = false,
  autoPlayInterval = 5000,
  labels: labelsProp,
  onPointerEnter,
  onPointerLeave,
  onFocus,
  onBlur,
  ...props
}: ReviewsCarouselProps) {
  const labels = { ...DEFAULT_LABELS, ...labelsProp };
  const count = reviews.length;
  const carousel = useCarouselIndex({
    count,
    index: indexProp,
    defaultIndex,
    onIndexChange,
    loop,
  });
  const { index, goTo } = carousel;
  const rotation = useAutoRotate({
    autoPlay,
    interval: autoPlayInterval,
    count,
    resetKey: index,
    // A timer always wraps, even when the buttons stop at the ends.
    advance: () => {
      goTo(index >= count - 1 ? 0 : index + 1);
    },
  });

  if (count === 0) return null;

  const hasControls = showNavigation || showIndicators || autoPlay;

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    handleCarouselKey(event, {
      next: carousel.next,
      previous: carousel.previous,
      first: () => {
        goTo(0);
      },
      last: () => {
        goTo(count - 1);
      },
    });
  }

  return (
    <section
      data-slot="reviews-carousel"
      aria-roledescription="carousel"
      aria-label={props["aria-labelledby"] ? undefined : "Reviews"}
      className={cn("relative mx-auto flex h-80 w-full max-w-4xl flex-col", className)}
      onPointerEnter={chain(rotation.rootProps.onPointerEnter, onPointerEnter)}
      onPointerLeave={chain(rotation.rootProps.onPointerLeave, onPointerLeave)}
      onFocus={chain(rotation.rootProps.onFocus, onFocus)}
      onBlur={chain(rotation.rootProps.onBlur, onBlur)}
      {...props}
    >
      <div
        data-slot="reviews-carousel-viewport"
        aria-live={rotation.rotating ? "off" : "polite"}
        className="relative grid min-h-0 flex-1 place-items-center py-8"
      >
        {reviews.map((review, position) => {
          const offset = position - index;
          const active = offset === 0;
          return (
            <div
              key={review.id}
              role="group"
              aria-roledescription="slide"
              aria-label={labels.slide(position, count)}
              aria-hidden={active ? undefined : true}
              inert={active ? undefined : true}
              data-slot="reviews-carousel-slide"
              data-state={active ? "active" : offset < 0 ? "past" : "upcoming"}
              className={reviewsCarouselVariants()}
              style={{ ...placement(offset), zIndex: count - position }}
            >
              <figure>
                <blockquote className="relative">
                  <span
                    aria-hidden="true"
                    className="absolute -start-2 -top-1 text-4xl leading-none text-foreground/10"
                  >
                    &ldquo;
                  </span>
                  <p className="relative text-sm leading-relaxed text-foreground/80">
                    {review.body}
                  </p>
                </blockquote>
                <figcaption className="mt-4 flex items-center gap-2 border-t border-border pt-4">
                  {review.avatar}
                  <span className="flex flex-col">
                    <span className="text-xs font-semibold text-foreground">
                      {review.author}
                    </span>
                    {review.title != null ? (
                      <span className="text-xs text-muted-foreground">{review.title}</span>
                    ) : null}
                  </span>
                </figcaption>
              </figure>
            </div>
          );
        })}
      </div>

      {hasControls ? (
        <div
          data-slot="reviews-carousel-controls"
          className="relative z-10 flex items-center justify-center gap-2 pb-4"
        >
          {autoPlay ? (
            <RotationButton
              enabled={rotation.enabled}
              onToggle={rotation.toggle}
              onKeyDown={handleKeyDown}
              stopLabel={labels.stop}
              startLabel={labels.start}
            />
          ) : null}
          {showNavigation ? (
            <CarouselButton
              direction="previous"
              aria-label={labels.previous}
              // aria-disabled rather than disabled: a button that disables itself
              // under the pointer or the keyboard would drop focus to the page.
              aria-disabled={!carousel.canPrevious || undefined}
              onClick={carousel.previous}
              onKeyDown={handleKeyDown}
            />
          ) : null}
          {showIndicators ? (
            <div data-slot="reviews-carousel-indicators" className="flex items-center">
              {reviews.map((review, position) => {
                const current = position === index;
                return (
                  <button
                    key={review.id}
                    type="button"
                    aria-label={labels.indicator(position, count)}
                    aria-current={current ? "true" : undefined}
                    className={cn("group flex h-6 items-center rounded-full px-1", focusRing)}
                    onClick={() => {
                      goTo(position);
                    }}
                    onKeyDown={handleKeyDown}
                  >
                    <span
                      className={cn(
                        "block h-2 rounded-full transition-[width,background-color] duration-[var(--duration-normal)] ease-[var(--ease-out-quint)]",
                        current
                          ? "w-8 bg-primary"
                          : "w-2 bg-primary/30 group-hover:bg-primary/50",
                      )}
                    />
                  </button>
                );
              })}
            </div>
          ) : null}
          {showNavigation ? (
            <CarouselButton
              direction="next"
              aria-label={labels.next}
              aria-disabled={!carousel.canNext || undefined}
              onClick={carousel.next}
              onKeyDown={handleKeyDown}
            />
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export { reviewsCarouselVariants };
