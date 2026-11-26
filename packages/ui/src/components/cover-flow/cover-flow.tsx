"use client";

// Original design.
import { cva, type VariantProps } from "class-variance-authority";
import {
  Children,
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
  type KeyboardEvent,
} from "react";

import { focusRing, mirrorForDirection } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A perspective stack of cards.
 *
 * The active card sits in front at full size; each neighbour steps out to the
 * side, a little smaller, turned a little away and dimmed by a veil, tucked
 * behind the one before it. Every card's place is a function of one number —
 * its offset from the active index — written as a custom property, so moving
 * the index re-targets every card at once and a single transition on the
 * overshoot curve springs the whole stack into its new shape. The duration is
 * on the motion scale, so under reduced motion the stack re-forms instantly.
 *
 * The sideways step is multiplied by `--cover-flow-dir`, which is -1 in
 * right-to-left layouts: "next" lies at the inline end in either direction,
 * and the chevrons mirror to match.
 *
 * It is a carousel region (aria-roledescription="carousel") that takes focus
 * itself: ArrowLeft/ArrowRight (swapped in RTL), Home and End move it. Each
 * card is a group named "2 of 5"; the contents of every card but the active
 * one are inert and aria-hidden, so they cannot be tabbed into half-hidden. Clicking
 * a side card brings it forward. A polite live region says "Slide 2 of 5"
 * after each move.
 */

const OFFSET = "--cover-flow-offset";
const DISTANCE = "--cover-flow-distance";

const coverFlowVariants = cva("", {
  variants: {
    size: {
      sm: "[--cover-flow-h:6.5rem] [--cover-flow-w:5rem]",
      md: "[--cover-flow-h:9.5rem] [--cover-flow-w:7.5rem]",
      lg: "[--cover-flow-h:14rem] [--cover-flow-w:11rem]",
    },
  },
  defaultVariants: { size: "md" },
});

export interface CoverFlowProps
  extends
    Omit<ComponentPropsWithRef<"div">, "defaultValue" | "onChange">,
    VariantProps<typeof coverFlowVariants> {
  /** Controlled active index. */
  index?: number;
  /** Initial active index when uncontrolled. Defaults to the middle card. */
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
  /** Wrap past the ends. */
  loop?: boolean;
  /** How many cards show on each side of the active one. */
  visible?: number;
  /** The carousel's accessible name. */
  label?: string;
  /** Hide the ‹ › buttons. Arrow keys still work. */
  hideControls?: boolean;
  /** Classes for every card's frame. */
  itemClassName?: string;
}

function Chevron({ back }: { back?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={mirrorForDirection}
    >
      {back ? <path d="m15 18-6-6 6-6" /> : <path d="m9 18 6-6-6-6" />}
    </svg>
  );
}

const navButton = cn(
  "grid size-7 place-items-center rounded-full border border-border bg-card text-muted-foreground shadow-sm",
  "transition-[color,background-color,scale] duration-[var(--duration-fast)] ease-[var(--ease-out-quint)]",
  "hover:bg-accent hover:text-accent-foreground motion-safe:active:scale-90",
  "disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-3.5",
  focusRing,
);

/** A perspective stack of cards that springs to a new centre, with ‹ › buttons and arrow keys. */
export function CoverFlow({
  className,
  size,
  children,
  index: indexProp,
  defaultIndex,
  onIndexChange,
  loop = false,
  visible = 2,
  label = "Gallery",
  hideControls = false,
  itemClassName,
  onKeyDown,
  ...props
}: CoverFlowProps) {
  const items = Children.toArray(children);
  const count = items.length;
  const [uncontrolled, setUncontrolled] = useState(defaultIndex ?? Math.floor((count - 1) / 2));
  const index = Math.min(Math.max(0, indexProp ?? uncontrolled), Math.max(0, count - 1));

  // Announce moves, not the first paint.
  const [previous, setPrevious] = useState(index);
  const [announced, setAnnounced] = useState("");
  if (previous !== index) {
    setPrevious(index);
    setAnnounced(`Slide ${String(index + 1)} of ${String(count)}`);
  }

  function goTo(next: number) {
    const target = loop
      ? ((next % count) + count) % count
      : Math.min(Math.max(0, next), count - 1);
    if (target === index || count === 0) return;
    if (indexProp === undefined) setUncontrolled(target);
    onIndexChange?.(target);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    onKeyDown?.(event);
    if (event.defaultPrevented || event.target !== event.currentTarget) return;
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
    const forward = rtl ? "ArrowLeft" : "ArrowRight";
    const back = rtl ? "ArrowRight" : "ArrowLeft";
    let next: number | null = null;
    if (event.key === forward) next = index + 1;
    else if (event.key === back) next = index - 1;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = count - 1;
    if (next === null) return;
    event.preventDefault();
    goTo(next);
  }

  return (
    <div
      data-slot="cover-flow"
      className={cn(coverFlowVariants({ size }), "flex flex-col items-center gap-3", className)}
      {...props}
    >
      {/* The carousel pattern: a focusable region that owns its arrow keys. */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <div
        role="region"
        aria-roledescription="carousel"
        aria-label={label}
        tabIndex={0}
        data-slot="cover-flow-stage"
        onKeyDown={handleKeyDown}
        className={cn(
          "relative isolate w-full rounded-xl [--cover-flow-dir:1] rtl:[--cover-flow-dir:-1]",
          "h-(--cover-flow-h) [perspective:60rem]",
          focusRing,
        )}
      >
        {items.map((item, position) => {
          const offset = position - index;
          const distance = Math.abs(offset);
          const hidden = distance > visible;
          return (
            <div
              key={position}
              role="group"
              aria-roledescription="slide"
              aria-label={`${String(position + 1)} of ${String(count)}`}
              aria-hidden={offset !== 0 || undefined}
              data-slot="cover-flow-item"
              data-active={offset === 0 || undefined}
              onClick={offset === 0 ? undefined : () => goTo(position)}
              className={cn(
                "absolute inset-y-0 start-1/2 -ms-[calc(var(--cover-flow-w)/2)] w-(--cover-flow-w)",
                "overflow-hidden rounded-xl border border-border bg-card shadow-lg",
                "transition-[translate,scale,rotate,opacity] duration-[calc(560ms*var(--motion-scale,1))] ease-[var(--ease-overshoot)]",
                offset !== 0 && "cursor-pointer",
                hidden && "pointer-events-none opacity-0",
                itemClassName,
              )}
              style={
                {
                  [OFFSET]: offset,
                  [DISTANCE]: distance,
                  zIndex: 100 - distance,
                  translate: `calc(var(${OFFSET}) * var(--cover-flow-w) * 0.42 * var(--cover-flow-dir)) 0 0`,
                  scale: `calc(1 - min(var(${DISTANCE}), 3) * 0.12)`,
                  rotate: `0 1 0 calc(clamp(-1, var(${OFFSET}), 1) * -18deg * var(--cover-flow-dir))`,
                } as CSSProperties
              }
            >
              {/* Inert while off-centre, so its contents cannot be tabbed into; a
                  click passes through to the frame, which brings it forward. */}
              <div inert={offset !== 0} className="size-full">
                {item}
              </div>
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-background transition-opacity duration-[calc(560ms*var(--motion-scale,1))] ease-[var(--ease-out-quint)]"
                style={{ opacity: Math.min(distance * 0.28, 0.75) }}
              />
            </div>
          );
        })}
      </div>
      {hideControls ? null : (
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Previous"
            className={navButton}
            disabled={!loop && index === 0}
            onClick={() => goTo(index - 1)}
          >
            <Chevron back />
          </button>
          <button
            type="button"
            aria-label="Next"
            className={navButton}
            disabled={!loop && index === count - 1}
            onClick={() => goTo(index + 1)}
          >
            <Chevron />
          </button>
        </div>
      )}
      <span aria-live="polite" className="sr-only">
        {announced}
      </span>
    </div>
  );
}

export { coverFlowVariants };
