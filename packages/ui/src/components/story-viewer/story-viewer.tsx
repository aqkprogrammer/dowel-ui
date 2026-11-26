"use client";

// Original design.
import { cva, type VariantProps } from "class-variance-authority";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { focusRingInset } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A story card: segmented progress bars along the top, media that
 * crossfades from slide to slide, and an avatar and caption underneath.
 *
 * Timing. Each slide shows for `interval` ms. The active segment's fill is
 * driven from a requestAnimationFrame loop that writes one custom property,
 * so the bar is exact, never re-renders, and pausing really stops the clock
 * (resuming carries on from where it was). This is content timing rather
 * than decoration, so it is not on the motion scale; the crossfade between
 * slides is, and under reduced motion slides simply swap.
 *
 * Pausing. Pointer over the card or focus inside it holds the story, as
 * does `paused`. That gives keyboard and screen reader users all the time
 * they need (WCAG 2.2.2): reaching the controls stops the clock.
 *
 * Navigation. The start and end halves of the media are real buttons
 * ("Previous story", "Next story") so tapping, clicking, Tab and Enter all
 * work; ArrowLeft and ArrowRight anywhere in the card do the same, swapped
 * in right-to-left layouts. The root is a labelled carousel region, each
 * slide a group named "2 of 3: …". The slide area is aria-live="polite"
 * only while held, so changes the user makes are announced and the
 * auto-advance does not chatter.
 */

export interface StorySlide {
  /** A short description of the slide, used in its accessible name. */
  label: string;
  /** The picture. Omitted, a placeholder gradient is drawn. */
  media?: ReactNode;
  /** The caption under the media. Falls back to the viewer's `caption`. */
  caption?: ReactNode;
}

const storyViewerVariants = cva(
  "flex flex-col rounded-2xl border border-border bg-card text-card-foreground shadow-lg select-none",
  {
    variants: {
      size: {
        sm: "w-32 gap-1.5 p-2 text-2xs",
        md: "w-44 gap-2 p-2.5 text-xs",
        lg: "w-64 gap-3 p-3 text-sm",
      },
    },
    defaultVariants: { size: "md" },
  },
);

/** Mixes the foreground into transparency, so placeholders follow the theme. */
function tint(percent: number): string {
  return `color-mix(in oklab, var(--color-foreground) ${String(percent)}%, transparent)`;
}

const PLACEHOLDERS: CSSProperties[] = [
  {
    background: `radial-gradient(circle at 38% 32%, ${tint(90)}, ${tint(42)} 38%, ${tint(12)} 72%)`,
  },
  { background: `linear-gradient(165deg, ${tint(72)}, ${tint(38)} 55%, ${tint(18)})` },
  {
    background: `repeating-linear-gradient(45deg, ${tint(62)} 0 0.45em, ${tint(14)} 0.45em 0.9em)`,
  },
];

export interface StoryViewerProps
  extends
    Omit<ComponentPropsWithRef<"section">, "children" | "onChange">,
    VariantProps<typeof storyViewerVariants> {
  slides: StorySlide[];
  /** Controlled slide index. */
  index?: number;
  /** Initial slide index when uncontrolled. */
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
  /** How long each slide shows, in milliseconds. */
  interval?: number;
  /** Hold the story on the current slide. */
  paused?: boolean;
  /** Start again after the last slide. Otherwise it stops there and calls `onEnd`. */
  loop?: boolean;
  /** Called when the last slide finishes and `loop` is off. */
  onEnd?: () => void;
  /** The caption for slides without their own. */
  caption?: ReactNode;
  /** The avatar beside the caption. Defaults to a dot in the foreground colour. */
  avatar?: ReactNode;
  /** Names for the tap zones. */
  labels?: { previous?: string; next?: string };
}

/** A story card with segmented progress, crossfading slides and tap-zone navigation. */
export function StoryViewer({
  className,
  slides,
  index: indexProp,
  defaultIndex = 0,
  onIndexChange,
  interval = 2000,
  paused = false,
  loop = true,
  onEnd,
  caption,
  avatar,
  labels,
  size,
  onPointerEnter,
  onPointerLeave,
  onFocus,
  onBlur,
  onKeyDown,
  "aria-label": ariaLabel = "Stories",
  ...props
}: StoryViewerProps) {
  const count = slides.length;
  const [uncontrolled, setUncontrolled] = useState(defaultIndex);
  const controlled = indexProp !== undefined;
  const index = Math.min(
    Math.max(controlled ? indexProp : uncontrolled, 0),
    Math.max(count - 1, 0),
  );

  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [ended, setEnded] = useState(false);
  const held = paused || hovered || focused;

  const fill = useRef<HTMLSpanElement>(null);
  const clock = useRef({ index, elapsed: 0 });

  const go = useCallback(
    (next: number) => {
      let target = next;
      if (target >= count) {
        if (!loop) {
          setEnded(true);
          onEnd?.();
          return;
        }
        target = 0;
      }
      if (target < 0) target = loop ? count - 1 : 0;
      setEnded(false);
      clock.current = { index: target, elapsed: 0 };
      if (!controlled) setUncontrolled(target);
      onIndexChange?.(target);
    },
    [count, loop, controlled, onEnd, onIndexChange],
  );

  useEffect(() => {
    if (clock.current.index !== index) clock.current = { index, elapsed: 0 };
    if (held || ended || count < 2) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      clock.current.elapsed += now - last;
      last = now;
      const progress = Math.min(clock.current.elapsed / interval, 1);
      fill.current?.style.setProperty("--progress", String(progress));
      if (progress >= 1) {
        go(index + 1);
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [index, held, ended, count, interval, go]);

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
    const forward = (event.key === "ArrowRight") !== rtl;
    event.preventDefault();
    go(index + (forward ? 1 : -1));
  }

  const current = slides[index];
  const shownCaption = current?.caption ?? caption;

  return (
    // The keys and pointer listeners are delegated from the real buttons inside
    // (arrow keys while one is focused), and hover only pauses the clock.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <section
      data-slot="story-viewer"
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      className={cn(storyViewerVariants({ size }), className)}
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
      onKeyDown={handleKeyDown}
      {...props}
    >
      <div data-slot="story-viewer-progress" aria-hidden="true" className="flex gap-1">
        {slides.map((slide, position) => (
          <span
            key={`${String(position)}-${slide.label}`}
            className="h-[0.1875rem] flex-1 overflow-hidden rounded-full bg-foreground/25"
          >
            <span
              ref={position === index ? fill : undefined}
              data-part="fill"
              className="block h-full rounded-full bg-foreground"
              style={
                {
                  "--progress": position < index || (position === index && ended) ? 1 : 0,
                  width: "calc(var(--progress) * 100%)",
                } as CSSProperties
              }
            />
          </span>
        ))}
      </div>

      <div className="relative aspect-square overflow-hidden rounded-xl bg-muted">
        <div aria-live={held ? "polite" : "off"} className="absolute inset-0">
          {slides.map((slide, position) => {
            const active = position === index;
            return (
              <div
                key={`${String(position)}-${slide.label}`}
                role="group"
                aria-roledescription="slide"
                aria-label={`${String(position + 1)} of ${String(count)}: ${slide.label}`}
                aria-hidden={!active}
                data-state={active ? "active" : "inactive"}
                className={cn(
                  "absolute inset-0 transition-[opacity,scale] duration-[var(--duration-slower)] ease-[var(--ease-out-quint)]",
                  "[&>img]:size-full [&>img]:object-cover",
                  active ? "scale-100 opacity-100" : "scale-105 opacity-0",
                )}
                style={slide.media ? undefined : PLACEHOLDERS[position % PLACEHOLDERS.length]}
              >
                {slide.media}
              </div>
            );
          })}
        </div>
        <button
          type="button"
          aria-label={labels?.previous ?? "Previous story"}
          className={cn("absolute inset-y-0 start-0 w-1/2 rounded-s-xl", focusRingInset)}
          onClick={() => go(index - 1)}
        />
        <button
          type="button"
          aria-label={labels?.next ?? "Next story"}
          className={cn("absolute inset-y-0 end-0 w-1/2 rounded-e-xl", focusRingInset)}
          onClick={() => go(index + 1)}
        />
      </div>

      <div className="flex min-w-0 items-center gap-2">
        <span aria-hidden="true" className="grid size-[1.1em] shrink-0 place-items-center">
          {avatar ?? <span className="size-full rounded-full bg-foreground" />}
        </span>
        {shownCaption ? (
          <span className="truncate text-muted-foreground">{shownCaption}</span>
        ) : (
          <span aria-hidden="true" className="h-[0.25em] w-2/3 rounded-full bg-foreground/30" />
        )}
      </div>
    </section>
  );
}

export { storyViewerVariants };
