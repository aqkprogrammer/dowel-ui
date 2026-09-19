"use client";

// Ported from amicro Time Machine Stack (MIT, © 2026 Syed Subhan Uddin). See THIRD_PARTY_NOTICES.md.
import { cva, type VariantProps } from "class-variance-authority";
import {
  Fragment,
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * Cards recede in depth behind the current one; the ones already passed fall
 * forward and fade. A timeline scrubber at the inline end picks the moment.
 *
 * The scrubber is a vertical role="slider" with the newest entry at the bottom
 * and history rising above it, as in macOS Time Machine — so ArrowUp, which a
 * vertical slider must use to increase, goes back in time and moves the thumb
 * up. amicro stacks the newest at the top; that order would make the keys
 * contradict the picture.
 *
 * Motion is CSS transitions on transform and opacity. The source's gooey SVG
 * filter is dropped: it softened every card edge and could not be themed.
 */

const timeStackVariants = cva(
  "relative flex w-full items-center justify-center gap-6 overflow-hidden rounded-2xl p-4",
  {
    variants: {
      /** Card width. The stack's depth and height derive from it. */
      size: {
        sm: "[--ts-card:10rem]",
        md: "[--ts-card:13.75rem]",
        lg: "[--ts-card:18rem]",
      },
      tone: {
        media: "",
        mono: "",
      },
    },
    defaultVariants: {
      size: "md",
      tone: "media",
    },
  },
);

export interface TimeStackItem {
  /** Names the card. */
  title: string;
  /** The moment on the timeline: "Today", "1w ago", a date. */
  label: string;
  /** Image URL for the card when `tone="media"` and no `content` is given. */
  image?: string;
  /** Alternative text for `image`. Defaults to empty: the title names the card. */
  alt?: string;
  /** Custom card content. Replaces the image or the numbered tile. */
  content?: ReactNode;
}

export interface TimeStackProps
  extends
    Omit<ComponentPropsWithRef<"section">, "children">,
    VariantProps<typeof timeStackVariants> {
  /** Newest first: index 0 is the front of the stack and the bottom of the timeline. */
  items: TimeStackItem[];
  index?: number;
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
  /** Step through with the mouse wheel over the stack. */
  wheel?: boolean;
  /** Select as the pointer moves over the timeline, as in the source, rather than on press. */
  hoverScrub?: boolean;
  /** Accessible name of the scrubber. */
  scrubberLabel?: string;
}

/** Placement of one card by its distance from the current one. */
function cardStyle(offset: number, count: number, i: number): CSSProperties {
  const past = offset < 0;
  return {
    zIndex: count - i,
    opacity: past ? 0 : Math.max(0, 1 - offset * 0.2),
    transform: past
      ? "translate3d(0, calc(var(--ts-card) * 1.35), calc(var(--ts-card) * 0.9)) rotateX(-20deg) scale(1.3)"
      : [
          `translate3d(0, calc(var(--ts-card) * ${String(-offset * 0.055)}),`,
          `calc(var(--ts-card) * ${String(-offset * 0.27)}))`,
          `rotateX(${String(offset * 2)}deg)`,
        ].join(" "),
  };
}

const WHEEL_STEP = 60;

/** A depth stack of moments with a timeline scrubber — amicro's Time Machine. */
export function TimeStack({
  className,
  items,
  index: indexProp,
  defaultIndex = 0,
  onIndexChange,
  wheel = true,
  hoverScrub = false,
  scrubberLabel = "Timeline",
  size,
  tone,
  ref,
  "aria-label": ariaLabel,
  ...props
}: TimeStackProps) {
  const count = items.length;
  const last = Math.max(0, count - 1);
  const clamp = (value: number) => Math.min(last, Math.max(0, value));
  const [uncontrolled, setUncontrolled] = useState(() => clamp(defaultIndex));
  const index = clamp(indexProp ?? uncontrolled);
  const [hovered, setHovered] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const id = useId();
  const stackRef = useRef<HTMLDivElement>(null);
  const tickRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const pressing = useRef<number | null>(null);

  function goTo(next: number, announce = false) {
    const target = clamp(next);
    if (target === index) return;
    if (indexProp === undefined) setUncontrolled(target);
    onIndexChange?.(target);
    const item = items[target];
    if (announce && item) setAnnouncement(`${item.label}: ${item.title}`);
  }

  // The latest goTo for the native wheel listener, which is bound once.
  const goToRef = useRef(goTo);
  const indexRef = useRef(index);
  useEffect(() => {
    goToRef.current = goTo;
    indexRef.current = index;
  });

  // React's wheel listener is passive and cannot stop the page scrolling, so
  // bind natively. The page still scrolls once the stack is at either end.
  useEffect(() => {
    const stack = stackRef.current;
    if (!stack || !wheel) return;
    let accumulated = 0;
    function onWheel(event: WheelEvent) {
      const direction = Math.sign(event.deltaY);
      const next = indexRef.current + direction;
      if (direction === 0 || next < 0 || next > last) return;
      event.preventDefault();
      accumulated += event.deltaY;
      if (Math.abs(accumulated) < WHEEL_STEP) return;
      accumulated = 0;
      goToRef.current(next, true);
    }
    stack.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      stack.removeEventListener("wheel", onWheel);
    };
  }, [wheel, last]);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const steps: Record<string, number> = {
      ArrowUp: index + 1,
      ArrowRight: index + 1,
      ArrowDown: index - 1,
      ArrowLeft: index - 1,
      PageUp: index + 2,
      PageDown: index - 2,
      Home: 0,
      End: last,
    };
    const next = steps[event.key];
    if (next === undefined) return;
    event.preventDefault();
    goTo(next);
  }

  /** The tick nearest the pointer, by measured geometry. */
  function nearest(clientY: number) {
    let best: number | null = null;
    let distance = Infinity;
    tickRefs.current.forEach((tick, i) => {
      if (!tick) return;
      const rect = tick.getBoundingClientRect();
      const d = Math.abs(clientY - (rect.top + rect.height / 2));
      if (d < distance) {
        distance = d;
        best = i;
      }
    });
    return best;
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    pressing.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    const at = nearest(event.clientY);
    if (at !== null) goTo(at);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const at = nearest(event.clientY);
    setHovered(at);
    if (at !== null && (hoverScrub || pressing.current === event.pointerId)) goTo(at);
  }

  function release(event: PointerEvent<HTMLDivElement>) {
    if (pressing.current !== event.pointerId) return;
    pressing.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  const current = items[index];
  const card = cn(
    "grid size-full place-items-center overflow-hidden rounded-2xl border border-border shadow-lg",
    tone === "mono"
      ? "bg-muted text-sm font-bold text-muted-foreground"
      : "bg-card text-card-foreground",
  );

  return (
    <section
      ref={ref}
      data-slot="time-stack"
      aria-roledescription="time stack"
      aria-label={ariaLabel ?? (props["aria-labelledby"] ? undefined : "Time stack")}
      className={cn(timeStackVariants({ size, tone }), className)}
      {...props}
    >
      <div
        ref={stackRef}
        id={`${id}-stack`}
        data-slot="time-stack-stack"
        className="relative grid flex-1 place-items-center"
        style={{
          maxWidth: "calc(var(--ts-card) * 1.32)",
          aspectRatio: "4 / 3",
          perspective: "calc(var(--ts-card) * 3.6)",
          transformStyle: "preserve-3d",
        }}
      >
        {items.map((item, i) => {
          const offset = i - index;
          const isCurrent = offset === 0;
          return (
            <div
              key={i}
              role={isCurrent ? "group" : undefined}
              aria-roledescription={isCurrent ? "slide" : undefined}
              aria-label={isCurrent ? `${item.label}: ${item.title}` : undefined}
              aria-hidden={isCurrent ? undefined : true}
              inert={!isCurrent}
              data-slot="time-stack-card"
              data-state={offset < 0 ? "past" : isCurrent ? "current" : "future"}
              className={cn(
                "col-start-1 row-start-1 origin-center will-change-transform",
                "transition-[transform,opacity] duration-[var(--duration-slower)] ease-[var(--ease-out-quint)]",
              )}
              style={{
                width: "var(--ts-card)",
                aspectRatio: "220 / 135",
                ...cardStyle(offset, count, i),
              }}
            >
              <div className={card}>
                {item.content ??
                  (tone !== "mono" && item.image ? (
                    <img
                      src={item.image}
                      alt={item.alt ?? ""}
                      draggable={false}
                      className="size-full object-cover"
                    />
                  ) : (
                    <span aria-hidden="true">{i + 1}</span>
                  ))}
              </div>
            </div>
          );
        })}
      </div>

      <div
        role="slider"
        tabIndex={0}
        aria-label={scrubberLabel}
        aria-orientation="vertical"
        aria-valuemin={0}
        aria-valuemax={last}
        aria-valuenow={index}
        aria-valuetext={current ? `${current.label}: ${current.title}` : undefined}
        aria-controls={`${id}-stack`}
        data-slot="time-stack-scrubber"
        className={cn(
          "group/scrub relative z-10 flex cursor-pointer touch-none flex-col-reverse items-end rounded-md px-1 py-2 select-none",
          "[--ts-origin:right] rtl:[--ts-origin:left]",
          focusRing,
        )}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={release}
        onPointerCancel={release}
        onPointerLeave={() => {
          setHovered(null);
        }}
      >
        {items.map((item, i) => {
          const selected = i === index;
          const showLabel = hovered === i || (selected && hovered === null);
          const near = hovered !== null && Math.abs(i - hovered) < 1;
          return (
            <Fragment key={i}>
              {i > 0
                ? [0, 1].map((sub) => (
                    <span
                      key={sub}
                      aria-hidden="true"
                      data-slot="time-stack-subtick"
                      className="flex w-20 justify-end py-px"
                    >
                      <span
                        className={cn(
                          "h-[3px] w-6 rounded-full bg-foreground/20 transition-[scale,opacity] duration-[var(--duration-fast)] ease-[var(--ease-out-quint)]",
                          near ? "scale-x-115 opacity-50" : "opacity-30",
                        )}
                        style={{ transformOrigin: "var(--ts-origin)" }}
                      />
                    </span>
                  ))
                : null}
              <span
                ref={(node) => {
                  tickRefs.current[i] = node;
                }}
                aria-hidden="true"
                data-slot="time-stack-tick"
                data-state={selected ? "active" : "inactive"}
                className="relative flex w-20 items-center justify-end py-px"
              >
                <span
                  data-slot="time-stack-tick-label"
                  className={cn(
                    "absolute end-10 text-[10px] font-semibold whitespace-nowrap",
                    "transition-[opacity,scale,filter] duration-[var(--duration-fast)] ease-[var(--ease-out-quint)]",
                    selected ? "text-primary" : "text-foreground/90",
                    !showLabel && "scale-80 opacity-0 blur-[2px]",
                  )}
                >
                  {item.label}
                </span>
                <span
                  className={cn(
                    "h-[3px] w-6 rounded-full transition-[scale,background-color] duration-[var(--duration-fast)] ease-[var(--ease-overshoot)]",
                    selected ? "bg-primary" : "bg-foreground/50",
                    hovered !== null && (selected ? "scale-x-140" : near ? "scale-x-125" : ""),
                  )}
                  style={{ transformOrigin: "var(--ts-origin)" }}
                />
              </span>
            </Fragment>
          );
        })}
      </div>

      <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </p>
    </section>
  );
}

export { timeStackVariants };
