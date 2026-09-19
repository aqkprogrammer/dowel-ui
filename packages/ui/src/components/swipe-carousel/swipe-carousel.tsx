"use client";

// Original design (pattern inspired by bencho Carousel).
import { cva } from "class-variance-authority";
import {
  MotionConfig,
  animate,
  motion,
  useMotionValue,
  useTransform,
  type AnimationPlaybackControls,
  type MotionValue,
} from "motion/react";
import {
  Children,
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

import {
  CarouselButton,
  handleCarouselKey,
  prefersReducedMotion,
  useCarouselIndex,
  wrapIndex,
} from "./carousel-controls";

/*
 * Cards stand on a ring seen from the front: the current one faces you, the
 * others swing round behind it, smaller and higher, so a swipe turns the ring
 * and nothing ever slides out of the frame.
 *
 * The ring's rotation is one continuous number — the position, in cards. A
 * drag moves it directly under the finger; on release it springs to the
 * nearest card *carrying the flick's velocity*, which is the one thing a CSS
 * transition cannot do honestly, and why this uses `motion`. Buttons and keys
 * move the same number with the same spring and no velocity. Under reduced
 * motion the ring jumps instead of springing, and the idle float stops.
 */

const PREFIX = "dowel-swipe-carousel";

/** Keyframes and the rules for the idle float only; decoration, never an indicator. */
const STYLES = `
@keyframes ${PREFIX}-float{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(calc(var(--${PREFIX}-lift) * -1)) rotate(var(--${PREFIX}-sway))}}
[data-slot=swipe-carousel-float]{animation:${PREFIX}-float var(--${PREFIX}-duration) ease-in-out infinite}
[data-slot=swipe-carousel][data-held] [data-slot=swipe-carousel-float]{animation-play-state:paused}
@media (prefers-reduced-motion: reduce){[data-slot=swipe-carousel-float]{animation:none}}
`;

/** Ring geometry, as fractions of the card: sideways reach and rise at the back. */
const REACH = 67;
const RISE = 6.5;
/** How far, in card widths, a drag travels to turn the ring by one card. */
const DRAG_PER_CARD = 0.64;
/** How far ahead a flick's velocity projects the resting card, in seconds. */
const PROJECTION = 0.15;
/** A resting tilt per card, so the stack reads as a hand of photos, not a grid. */
const TILTS = [1.7, -4.2, 2.6, -1.4, 3.8, -2.4, 1.1];
const FLOAT_SECONDS = [7.1, 4.7, 5.9, 6.7, 5.3, 6.1, 4.9];
const SPRING = { type: "spring", stiffness: 260, damping: 30 } as const;

const swipeCarouselVariants = cva(
  cn(
    "col-start-1 row-start-1",
    "translate-x-(--swipe-x) translate-y-(--swipe-y) scale-(--swipe-s)",
    "rtl:translate-x-[calc(var(--swipe-x)*-1)]",
  ),
);

export interface SwipeCarouselLabels {
  previous: string;
  next: string;
  slide: (index: number, count: number) => string;
}

const DEFAULT_LABELS: SwipeCarouselLabels = {
  previous: "Previous card",
  next: "Next card",
  slide: (index, count) => `${String(index + 1)} of ${String(count)}`,
};

export interface SwipeCarouselProps extends Omit<ComponentPropsWithRef<"section">, "children"> {
  /** One child per card: an image, or any content. */
  children?: ReactNode;
  index?: number;
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
  /** Any CSS length. */
  cardWidth?: string;
  /** Height as a multiple of width. */
  aspectRatio?: number;
  /** Lets each card drift gently while idle. */
  float?: boolean;
  labels?: Partial<SwipeCarouselLabels>;
}

interface Drag {
  pointer: number;
  startX: number;
  startPosition: number;
  cardWidth: number;
  sign: 1 | -1;
  moved: boolean;
}

/** Rounded, and never "-0" from a sine that is a hair below zero. */
function round(value: number, places = 2): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor + 0;
}

/** The shortest whole-card move from `from` that lands on `index`. */
function nearest(from: number, index: number, count: number): number {
  let delta = wrapIndex(index - from, count);
  if (delta > count / 2) delta -= count;
  return from + delta;
}

/** A card that orbits a carousel on a ring, swiped, clicked or stepped with keys. */
export function SwipeCarousel({
  className,
  children,
  index: indexProp,
  defaultIndex = 0,
  onIndexChange,
  cardWidth = "13rem",
  aspectRatio = 1.417,
  float = true,
  labels: labelsProp,
  ...props
}: SwipeCarouselProps) {
  const labels = { ...DEFAULT_LABELS, ...labelsProp };
  const slides = Children.toArray(children);
  const count = slides.length;
  const carousel = useCarouselIndex({
    count,
    index: indexProp,
    defaultIndex,
    onIndexChange,
    loop: true,
  });
  const { index, goTo } = carousel;
  const position = useMotionValue(index);
  // The whole-card position the ring is resting at, or springing toward.
  const target = useRef(index);
  const running = useRef<AnimationPlaybackControls | null>(null);
  const drag = useRef<Drag | null>(null);
  // Set once a pointer has moved far enough to count as a drag, not a tap.
  const dragged = useRef(false);
  const [held, setHeld] = useState(false);

  function settle(next: number, velocity = 0) {
    target.current = next;
    running.current?.stop();
    if (prefersReducedMotion()) {
      position.set(next);
      return;
    }
    running.current = animate(position, next, { ...SPRING, velocity });
  }

  const settleRef = useRef(settle);
  useEffect(() => {
    settleRef.current = settle;
  });

  // Follow the index wherever it changes from: buttons, keys, or the owner.
  useEffect(() => {
    if (count === 0 || wrapIndex(target.current, count) === index) return;
    settleRef.current(nearest(target.current, index, count));
  }, [index, count]);

  useEffect(
    () => () => {
      running.current?.stop();
    },
    [],
  );

  if (count === 0) return null;

  function release(next: number, velocity: number) {
    settle(next, velocity);
    goTo(wrapIndex(next, count));
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    running.current?.stop();
    const card = event.currentTarget.querySelector<HTMLElement>(
      "[data-slot=swipe-carousel-slide]",
    );
    const rtl = event.currentTarget.closest("[dir]")?.getAttribute("dir") === "rtl";
    drag.current = {
      pointer: event.pointerId,
      startX: event.clientX,
      startPosition: position.get(),
      cardWidth: card?.offsetWidth || 200,
      sign: rtl ? -1 : 1,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setHeld(true);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const current = drag.current;
    if (current?.pointer !== event.pointerId) return;
    const dx = event.clientX - current.startX;
    if (Math.abs(dx) > 4) current.moved = true;
    position.set(
      current.startPosition - (current.sign * dx) / (current.cardWidth * DRAG_PER_CARD),
    );
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    const current = drag.current;
    if (current?.pointer !== event.pointerId) return;
    drag.current = null;
    setHeld(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (current.moved) {
      const velocity = position.getVelocity();
      // A flick carries on by at most one more card.
      const carry = Math.max(-1, Math.min(1, velocity * PROJECTION));
      release(Math.round(position.get() + carry), velocity);
      return;
    }

    // A tap on a card peeking out at either side brings it to the front.
    const box = event.currentTarget.getBoundingClientRect();
    const offset = (event.clientX - (box.left + box.width / 2)) * current.sign;
    const step = Math.abs(offset) > current.cardWidth * 0.35 ? Math.sign(offset) : 0;
    release(target.current + step, 0);
  }

  function handlePointerCancel(event: PointerEvent<HTMLDivElement>) {
    if (drag.current?.pointer !== event.pointerId) return;
    drag.current = null;
    setHeld(false);
    release(Math.round(position.get()), 0);
  }

  // A drag that ends over a link in the front card must not also follow it.
  function handleClickCapture(event: MouseEvent<HTMLDivElement>) {
    if (dragged.current) {
      event.preventDefault();
      event.stopPropagation();
    }
    dragged.current = false;
  }

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
    <MotionConfig reducedMotion="user">
      <section
        data-slot="swipe-carousel"
        data-held={held || undefined}
        aria-roledescription="carousel"
        aria-label={props["aria-labelledby"] ? undefined : "Cards"}
        className={cn(
          "relative flex w-full flex-col items-center gap-4 overflow-x-clip",
          className,
        )}
        {...props}
      >
        <style href={PREFIX} precedence="dowel">
          {STYLES}
        </style>
        <div
          data-slot="swipe-carousel-viewport"
          aria-live="polite"
          className={cn(
            "grid max-w-full touch-pan-y place-items-center select-none",
            held ? "cursor-grabbing" : "cursor-grab",
          )}
          style={{
            inlineSize: `calc(${cardWidth} * 2.4)`,
            paddingBlock: `calc(${cardWidth} * 0.15)`,
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={(event) => {
            handlePointerMove(event);
            if (drag.current?.moved) dragged.current = true;
          }}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onClickCapture={handleClickCapture}
          onDragStart={(event) => {
            event.preventDefault();
          }}
        >
          {slides.map((slide, slot) => (
            <Slide
              key={slot}
              slot={slot}
              count={count}
              position={position}
              active={slot === index}
              label={labels.slide(slot, count)}
              float={float}
              style={{ width: cardWidth, aspectRatio: `1 / ${String(aspectRatio)}` }}
            >
              {slide}
            </Slide>
          ))}
        </div>
        <div data-slot="swipe-carousel-controls" className="flex items-center gap-2">
          <CarouselButton
            direction="previous"
            aria-label={labels.previous}
            onClick={carousel.previous}
            onKeyDown={handleKeyDown}
          />
          <CarouselButton
            direction="next"
            aria-label={labels.next}
            onClick={carousel.next}
            onKeyDown={handleKeyDown}
          />
        </div>
      </section>
    </MotionConfig>
  );
}

interface SlideProps {
  slot: number;
  count: number;
  position: MotionValue<number>;
  active: boolean;
  label: string;
  float: boolean;
  style: CSSProperties;
  children: ReactNode;
}

/** One card, placed on the ring from the shared position. */
function Slide({ slot, count, position, active, label, float, style, children }: SlideProps) {
  const angle = useTransform(position, (value) => ((slot - value) * 2 * Math.PI) / count);
  const x = useTransform(angle, (value) => `${String(round(Math.sin(value) * REACH))}%`);
  const y = useTransform(angle, (value) => `${String(round(-(1 - Math.cos(value)) * RISE))}%`);
  const scale = useTransform(angle, (value) => String(round(0.75 + 0.25 * Math.cos(value), 4)));
  const zIndex = useTransform(angle, (value) => Math.round(50 + 50 * Math.cos(value)));
  const tilt = TILTS[slot % TILTS.length] ?? 0;
  const seconds = FLOAT_SECONDS[slot % FLOAT_SECONDS.length] ?? 6;

  return (
    <motion.div
      role="group"
      aria-roledescription="slide"
      aria-label={label}
      aria-hidden={active ? undefined : true}
      inert={active ? undefined : true}
      data-slot="swipe-carousel-slide"
      data-state={active ? "active" : "inactive"}
      className={swipeCarouselVariants()}
      style={{
        ...style,
        zIndex,
        ...({ "--swipe-x": x, "--swipe-y": y, "--swipe-s": scale } as object),
      }}
    >
      <div
        data-slot={float ? "swipe-carousel-float" : "swipe-carousel-card"}
        className="size-full overflow-hidden rounded-[1.125rem] bg-muted shadow-lg [&>img]:size-full [&>img]:object-cover"
        style={
          {
            rotate: `${String(tilt)}deg`,
            [`--${PREFIX}-duration`]: `calc(${String(seconds * 1000)}ms * var(--motion-scale, 1))`,
            [`--${PREFIX}-lift`]: "0.15rem",
            [`--${PREFIX}-sway`]: `${String(tilt > 0 ? 0.2 : -0.2)}deg`,
          } as CSSProperties
        }
      >
        {children}
      </div>
    </motion.div>
  );
}

export { swipeCarouselVariants };
