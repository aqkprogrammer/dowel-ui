"use client";

// Original design (pattern from the WAI-ARIA APG carousel; no code referenced).
import { cva, type VariantProps } from "class-variance-authority";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
  type KeyboardEvent,
} from "react";

import { Button, type ButtonProps } from "@/components/button";
import { useInView } from "@/hooks/use-in-view";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { focusRing, mirrorForDirection } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * The plain carousel: a row (or column) of items you scroll through, several
 * at a time if you like.
 *
 * It is the browser's own scrolling, with snap points. Swipe, trackpad,
 * scroll wheel and dragging the scrollbar all work without a line of gesture
 * code, momentum feels native on every platform, and with JavaScript off it is
 * still a scrollable row. The parts add what scrolling lacks: previous and
 * next, a position, keyboard steps, and — only when asked — rotation.
 *
 * - The position is the item nearest the start edge, read from the layout on
 *   scroll (coalesced to a frame), so it is right however the reader got there.
 *   Buttons, dots and keys set it at once and then scroll.
 * - Arrow keys follow the reading direction: in a right-to-left document the
 *   left arrow goes forward.
 * - Rotation (`autoplay`) is off by default. When on, it pauses while the
 *   pointer is over the carousel, while focus is inside it, while it is
 *   off-screen and while the tab is hidden; it never starts by itself under
 *   reduced motion; and `CarouselPlayPause` stops it — render one, as the APG
 *   requires a control for anything that moves on its own. Development builds
 *   warn when rotation has none.
 */

type Orientation = "horizontal" | "vertical";

interface CarouselContextValue {
  index: number;
  count: number;
  /** The last index a scroll can start at, given how many show at once. */
  lastIndex: number;
  orientation: Orientation;
  loop: boolean;
  playing: boolean;
  rotating: boolean;
  autoplay: boolean;
  viewportRef: (node: HTMLDivElement | null) => void;
  viewport: () => HTMLDivElement | null;
  goTo: (index: number) => void;
  setPlaying: (playing: boolean) => void;
  registerPlayPause: () => () => void;
  label: string;
}

const CarouselContext = createContext<CarouselContextValue | null>(null);

function useCarousel(part: string): CarouselContextValue {
  const context = useContext(CarouselContext);
  if (!context) throw new Error(`<${part}> must be used inside <Carousel>.`);
  return context;
}

/** `index` wrapped into `[0, count)`. */
export function wrapCarouselIndex(index: number, count: number): number {
  if (count <= 0) return 0;
  return ((index % count) + count) % count;
}

/** Items in the viewport, in document order. */
function itemsOf(viewport: HTMLElement | null): HTMLElement[] {
  return viewport
    ? [...viewport.querySelectorAll<HTMLElement>(":scope > [data-slot=carousel-item]")]
    : [];
}

function isRtl(element: HTMLElement): boolean {
  return getComputedStyle(element).direction === "rtl";
}

/**
 * How far `item`'s start edge sits from the viewport's, in scroll units, along
 * the carousel's axis. Measured with rectangles rather than offsets, because
 * offsets and `scrollLeft` disagree about which way is positive in a
 * right-to-left document.
 */
function startOffset(
  viewport: HTMLElement,
  item: HTMLElement,
  orientation: Orientation,
): number {
  const box = viewport.getBoundingClientRect();
  const rect = item.getBoundingClientRect();
  if (orientation === "vertical") return rect.top - box.top;
  return isRtl(viewport) ? rect.right - box.right : rect.left - box.left;
}

/** The item whose start edge is nearest the viewport's. */
export function nearestCarouselIndex(offsets: readonly number[]): number {
  let best = 0;
  for (let i = 1; i < offsets.length; i += 1) {
    if (Math.abs(offsets[i] ?? Infinity) < Math.abs(offsets[best] ?? Infinity)) best = i;
  }
  return best;
}

const carouselVariants = cva("relative isolate flex flex-col gap-3", {
  variants: {
    orientation: {
      horizontal: "",
      vertical: "",
    },
  },
  defaultVariants: { orientation: "horizontal" },
});

export interface CarouselProps
  extends
    Omit<ComponentPropsWithRef<"section">, "onChange">,
    VariantProps<typeof carouselVariants> {
  /** What the carousel holds, e.g. "Featured products". Names the region for screen readers. */
  label: string;
  /** The position (first visible item), controlled. */
  index?: number;
  /** The position it starts at, uncontrolled. Default 0. */
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
  /** Items showing at once. Each item's width (or height) is set from it. Default 1. */
  itemsPerView?: number;
  /** Space between items, in pixels. Default 16. */
  gap?: number;
  /** Previous at the start goes to the end, and next at the end to the start. Default false. */
  loop?: boolean;
  /** Advance on a timer. Pair it with `CarouselPlayPause`. Default false. */
  autoplay?: boolean;
  /** Time on each position while rotating, in milliseconds. Default 5000. */
  interval?: number;
}

/**
 * A scroll-snap carousel: native swipe and scroll, with previous/next, dots,
 * keyboard steps and optional rotation as separate parts.
 */
export function Carousel({
  label,
  index: indexProp,
  defaultIndex = 0,
  onIndexChange,
  itemsPerView = 1,
  gap = 16,
  loop = false,
  autoplay = false,
  interval = 5000,
  orientation,
  className,
  style,
  children,
  onPointerEnter,
  onPointerLeave,
  onFocus,
  onBlur,
  ref,
  ...props
}: CarouselProps) {
  const axis: Orientation = orientation ?? "horizontal";
  const perView = Math.max(1, Math.floor(itemsPerView));
  const [uncontrolled, setUncontrolled] = useState(defaultIndex);
  const index = indexProp ?? uncontrolled;
  const [count, setCount] = useState(0);
  const lastIndex = Math.max(0, count - perView);

  const viewportNode = useRef<HTMLDivElement | null>(null);
  const [viewportElement, setViewportElement] = useState<HTMLDivElement | null>(null);
  const viewportRef = useCallback((node: HTMLDivElement | null) => {
    viewportNode.current = node;
    setViewportElement(node);
  }, []);
  const viewport = useCallback(() => viewportNode.current, []);

  const reduced = useReducedMotion();
  const { ref: inViewRef, inView } = useInView<HTMLElement>({ threshold: 0.25 });
  // Null until the reader presses play or pause: until then rotation follows
  // `autoplay`, except that it never starts by itself under reduced motion.
  const [choice, setChoice] = useState<boolean | null>(null);
  const playing = choice ?? (autoplay && !reduced);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(false);
  const playPauseCount = useRef(0);

  // The latest values the scroll handler and timer read, without re-binding.
  const latest = useRef({ index, onIndexChange, controlled: indexProp !== undefined });
  useLayoutEffect(() => {
    latest.current = { index, onIndexChange, controlled: indexProp !== undefined };
  });

  const commit = useCallback((next: number) => {
    if (next === latest.current.index) return;
    if (!latest.current.controlled) setUncontrolled(next);
    latest.current.onIndexChange?.(next);
  }, []);

  const scrollTo = useCallback(
    (target: number, smooth: boolean) => {
      const node = viewportNode.current;
      const item = itemsOf(node)[target];
      if (!node || !item) return;
      const delta = startOffset(node, item, axis);
      if (Math.abs(delta) < 1) return;
      // `scrollBy` reads the current position itself, which a stale scrollLeft
      // in a right-to-left layout would get wrong.
      node.scrollBy({
        [axis === "vertical" ? "top" : "left"]: delta,
        behavior: smooth ? "smooth" : "auto",
      });
    },
    [axis],
  );

  const goTo = useCallback(
    (target: number) => {
      const total = itemsOf(viewportNode.current).length;
      const last = Math.max(0, total - perView);
      const next = loop
        ? target > last
          ? 0
          : target < 0
            ? last
            : target
        : Math.min(last, Math.max(0, target));
      commit(next);
      scrollTo(next, !reduced);
    },
    [commit, loop, perView, reduced, scrollTo],
  );

  // Count the items, and keep counting as they change.
  useLayoutEffect(() => {
    if (!viewportElement) return;
    const update = () => {
      setCount(itemsOf(viewportElement).length);
    };
    update();
    if (typeof MutationObserver !== "function") return;
    const observer = new MutationObserver(update);
    observer.observe(viewportElement, { childList: true });
    return () => {
      observer.disconnect();
    };
  }, [viewportElement]);

  // A controlled index set from outside scrolls the viewport to it.
  useEffect(() => {
    if (indexProp === undefined) return;
    scrollTo(indexProp, !reduced);
  }, [indexProp, reduced, scrollTo]);

  // Start where defaultIndex says, without animating there — once: later
  // changes to defaultIndex do nothing, as for an input's defaultValue.
  const started = useRef(false);
  useLayoutEffect(() => {
    if (started.current || !viewportElement) return;
    started.current = true;
    if (indexProp === undefined && defaultIndex > 0) scrollTo(defaultIndex, false);
  }, [viewportElement, indexProp, defaultIndex, scrollTo]);

  // Read the position back from the layout as the reader scrolls.
  useEffect(() => {
    if (!viewportElement) return;
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const items = itemsOf(viewportElement);
        if (items.length === 0) return;
        const nearest = nearestCarouselIndex(
          items.map((item) => startOffset(viewportElement, item, axis)),
        );
        commit(Math.min(nearest, Math.max(0, items.length - perView)));
      });
    };
    viewportElement.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      viewportElement.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [viewportElement, axis, commit, perView]);

  useEffect(() => {
    const update = () => {
      setHidden(document.hidden);
    };
    update();
    document.addEventListener("visibilitychange", update);
    return () => {
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  const rotating = autoplay && playing && !hovered && !focused && inView && !hidden;

  useEffect(() => {
    if (!rotating || count <= 1) return;
    const timer = window.setTimeout(
      () => {
        const last = Math.max(0, itemsOf(viewportNode.current).length - perView);
        const next = latest.current.index >= last ? 0 : latest.current.index + 1;
        commit(next);
        scrollTo(next, true);
      },
      Math.max(1000, interval),
    );
    return () => {
      window.clearTimeout(timer);
    };
  }, [rotating, index, count, interval, perView, commit, scrollTo]);

  useEffect(() => {
    if (process.env.NODE_ENV === "production" || !autoplay) return;
    if (playPauseCount.current === 0) {
      console.warn(
        `<Carousel label="${label}"> rotates (autoplay) but has no <CarouselPlayPause>. ` +
          "Anything that moves on its own needs a control that stops it (WCAG 2.2.2).",
      );
    }
  }, [autoplay, label]);

  const registerPlayPause = useCallback(() => {
    playPauseCount.current += 1;
    return () => {
      playPauseCount.current -= 1;
    };
  }, []);

  const setRefs = useCallback(
    (node: HTMLElement | null) => {
      inViewRef(node);
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as { current: HTMLElement | null }).current = node;
    },
    [inViewRef, ref],
  );

  const context: CarouselContextValue = {
    index,
    count,
    lastIndex,
    orientation: axis,
    loop,
    playing,
    rotating,
    autoplay,
    viewportRef,
    viewport,
    goTo,
    setPlaying: setChoice,
    registerPlayPause,
    label,
  };

  return (
    <CarouselContext.Provider value={context}>
      <section
        ref={setRefs}
        aria-roledescription="carousel"
        aria-label={label}
        data-slot="carousel"
        data-orientation={axis}
        data-rotating={rotating || undefined}
        className={cn(carouselVariants({ orientation: axis }), className)}
        style={
          {
            "--carousel-per-view": String(perView),
            "--carousel-gap": `${String(Math.max(0, gap))}px`,
            ...style,
          } as CSSProperties
        }
        onPointerEnter={(event) => {
          onPointerEnter?.(event);
          if (event.pointerType === "mouse") setHovered(true);
        }}
        onPointerLeave={(event) => {
          onPointerLeave?.(event);
          setHovered(false);
        }}
        onFocus={(event) => {
          onFocus?.(event);
          setFocused(true);
        }}
        onBlur={(event) => {
          onBlur?.(event);
          if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
        }}
        {...props}
      >
        {children}
      </section>
    </CarouselContext.Provider>
  );
}

const viewportVariants = cva(
  [
    "flex [scrollbar-width:none] gap-(--carousel-gap) overscroll-contain [&::-webkit-scrollbar]:hidden",
    focusRing,
    "motion-safe:scroll-smooth",
  ],
  {
    variants: {
      orientation: {
        horizontal: "snap-x snap-mandatory overflow-x-auto overflow-y-hidden",
        vertical: "snap-y snap-mandatory flex-col overflow-x-hidden overflow-y-auto",
      },
    },
    defaultVariants: { orientation: "horizontal" },
  },
);

export type CarouselViewportProps = ComponentPropsWithRef<"div">;

/**
 * The scrolling row that holds the items. Focusable, so the arrow keys step
 * through it; a vertical carousel needs a height (`className="h-80"`).
 */
export function CarouselViewport({
  className,
  onKeyDown,
  ref,
  ...props
}: CarouselViewportProps) {
  const { viewportRef, orientation, goTo, index, count, rotating } =
    useCarousel("CarouselViewport");

  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      viewportRef(node);
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as { current: HTMLDivElement | null }).current = node;
    },
    [viewportRef, ref],
  );

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || event.target !== event.currentTarget) return;
    const rtl = isRtl(event.currentTarget);
    const forward = orientation === "vertical" ? "ArrowDown" : rtl ? "ArrowLeft" : "ArrowRight";
    const back = orientation === "vertical" ? "ArrowUp" : rtl ? "ArrowRight" : "ArrowLeft";
    const steps: Record<string, number | undefined> = {
      [forward]: index + 1,
      [back]: index - 1,
      Home: 0,
      End: count - 1,
    };
    const target = steps[event.key];
    if (target === undefined) return;
    event.preventDefault();
    goTo(target);
  };

  return (
    // The keys step a scrolling region the reader has focused; see tabIndex.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <div
      ref={setRefs}
      // A scrolling region must be focusable, or keyboard users cannot reach
      // what is scrolled out of view (WCAG 2.1.1; axe's
      // scrollable-region-focusable). jsx-a11y cannot see that it scrolls.
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={0}
      data-slot="carousel-viewport"
      aria-label="Items"
      // Announces the new position politely when the reader moves; silent
      // while rotating, which would otherwise talk over everything.
      aria-live={rotating ? "off" : "polite"}
      role="group"
      className={cn(viewportVariants({ orientation }), className)}
      onKeyDown={handleKeyDown}
      {...props}
    />
  );
}

export type CarouselItemProps = ComponentPropsWithRef<"div">;

/** One item. Sized from the carousel's `itemsPerView` and `gap`. */
export function CarouselItem({ className, ref, ...props }: CarouselItemProps) {
  const { count } = useCarousel("CarouselItem");
  const node = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState(0);

  useLayoutEffect(() => {
    const element = node.current;
    if (!element?.parentElement) return;
    setPosition(itemsOf(element.parentElement).indexOf(element) + 1);
  }, [count]);

  const setRefs = useCallback(
    (element: HTMLDivElement | null) => {
      node.current = element;
      if (typeof ref === "function") ref(element);
      else if (ref) (ref as { current: HTMLDivElement | null }).current = element;
    },
    [ref],
  );

  return (
    <div
      ref={setRefs}
      role="group"
      aria-roledescription="slide"
      aria-label={
        position > 0 && count > 0 ? `${String(position)} of ${String(count)}` : undefined
      }
      data-slot="carousel-item"
      className={cn(
        // The basis runs along the carousel's axis: a width in a row, a height
        // in a column.
        "min-w-0 shrink-0 grow-0 snap-start",
        "basis-[calc((100%-(var(--carousel-per-view)-1)*var(--carousel-gap))/var(--carousel-per-view))]",
        className,
      )}
      {...props}
    />
  );
}

function Chevron({ direction, mirror }: { direction: "previous" | "next"; mirror: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("size-4", mirror && mirrorForDirection)}
    >
      <path d={direction === "previous" ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6"} />
    </svg>
  );
}

export type CarouselButtonProps = Omit<ButtonProps, "onClick"> & {
  onClick?: ButtonProps["onClick"];
};

function StepButton({
  direction,
  className,
  children,
  onClick,
  variant = "outline",
  size = "icon-sm",
  ...props
}: CarouselButtonProps & { direction: "previous" | "next" }) {
  const { index, lastIndex, loop, goTo, count, orientation } = useCarousel(
    direction === "previous" ? "CarouselPrevious" : "CarouselNext",
  );
  const disabled =
    count <= 1 || (!loop && (direction === "previous" ? index <= 0 : index >= lastIndex));

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      disabled={disabled}
      aria-label={direction === "previous" ? "Previous" : "Next"}
      data-slot={direction === "previous" ? "carousel-previous" : "carousel-next"}
      className={cn(orientation === "vertical" && "rotate-90", className)}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) goTo(direction === "previous" ? index - 1 : index + 1);
      }}
      {...props}
    >
      {children ?? <Chevron direction={direction} mirror={orientation === "horizontal"} />}
    </Button>
  );
}

/** Goes back one position. Disabled at the start unless the carousel loops. */
export function CarouselPrevious(props: CarouselButtonProps) {
  return <StepButton direction="previous" {...props} />;
}

/** Goes forward one position. Disabled at the end unless the carousel loops. */
export function CarouselNext(props: CarouselButtonProps) {
  return <StepButton direction="next" {...props} />;
}

export type CarouselDotsProps = ComponentPropsWithRef<"div">;

/**
 * One dot per position, the current one marked. A row of buttons rather than
 * tabs: the items are all in the page, not panels swapped in and out.
 */
export function CarouselDots({ className, ...props }: CarouselDotsProps) {
  const { index, lastIndex, count, goTo, label } = useCarousel("CarouselDots");
  if (count <= 1) return null;
  const positions = lastIndex + 1;

  return (
    <div
      role="group"
      aria-label={`${label}: choose a position`}
      data-slot="carousel-dots"
      className={cn("flex items-center justify-center gap-1.5", className)}
      {...props}
    >
      {Array.from({ length: positions }, (_, position) => (
        <button
          key={position}
          type="button"
          aria-label={`Go to ${String(position + 1)} of ${String(positions)}`}
          aria-current={position === index ? "true" : undefined}
          data-slot="carousel-dot"
          className={cn(
            // A 24px hit area around a small dot.
            "group/dot grid size-6 place-items-center rounded-full",
            focusRing,
          )}
          onClick={() => {
            goTo(position);
          }}
        >
          <span
            aria-hidden="true"
            className={cn(
              "block h-1.5 rounded-full transition-[width,background-color] duration-(--duration-normal) ease-(--ease-out-quint)",
              position === index
                ? "w-4 bg-foreground"
                : "w-1.5 bg-muted-foreground/40 group-hover/dot:bg-muted-foreground",
            )}
          />
        </button>
      ))}
    </div>
  );
}

/**
 * Stops and starts rotation. Required whenever `autoplay` is on: it is the
 * control the APG and WCAG 2.2.2 ask for.
 */
export function CarouselPlayPause({
  className,
  variant = "ghost",
  size = "icon-sm",
  onClick,
  ...props
}: CarouselButtonProps) {
  const { playing, setPlaying, autoplay, registerPlayPause } = useCarousel("CarouselPlayPause");
  useEffect(() => registerPlayPause(), [registerPlayPause]);
  if (!autoplay) return null;

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      aria-label={playing ? "Stop slide rotation" : "Start slide rotation"}
      data-slot="carousel-play-pause"
      data-state={playing ? "playing" : "paused"}
      className={className}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) setPlaying(!playing);
      }}
      {...props}
    >
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="size-3.5">
        {playing ? (
          <path d="M7 5h3v14H7zM14 5h3v14h-3z" />
        ) : (
          <path d="M8 5.5v13a.5.5 0 0 0 .76.43l10.4-6.5a.5.5 0 0 0 0-.86L8.76 5.07A.5.5 0 0 0 8 5.5z" />
        )}
      </svg>
    </Button>
  );
}

export { carouselVariants, viewportVariants as carouselViewportVariants };
