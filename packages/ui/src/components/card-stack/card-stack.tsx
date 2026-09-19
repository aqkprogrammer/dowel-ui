"use client";

// Ported from SmoothUI Scrollable Card Stack (MIT, © 2024 Eduardo Calvo) and bencho Card stack (MIT, © 2026 Lorenzo Cabra). See THIRD_PARTY_NOTICES.md.
import { cva, type VariantProps } from "class-variance-authority";
import {
  Children,
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type KeyboardEvent,
  type ReactNode,
  type TouchEvent,
} from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";
import { deckCardStyle, fanCardStyle } from "./card-stack-layout";

/*
 * One pile of cards, two ways of going through it (ADR 0014, families not
 * copies):
 *
 * - `deck` (SmoothUI Scrollable Card Stack): one card on top, the rest
 *   receding behind it. Wheel, swipe, arrow keys or the indicator dots step
 *   through them one at a time. It is a carousel, and says so.
 * - `fan` (bencho Card stack): a loose, seeded pile that fans out into an arc
 *   on hover or focus; the card under the pointer lifts out of the fan.
 *
 * Both are CSS transitions on inline transforms. The source springs were
 * driven by discrete steps and hover, never by a gesture's velocity, so
 * `ease-overshoot` carries the bounce and the motion scale stops it.
 */

const WHEEL_THRESHOLD = 20;
const WHEEL_INTERVAL = 300;
const SWIPE_THRESHOLD = 60;

const cardStackVariants = cva("relative flex flex-col items-center", {
  variants: {
    variant: {
      deck: "gap-4",
      fan: "rtl:[--card-stack-flip:-1]",
    },
  },
  defaultVariants: {
    variant: "deck",
  },
});

const cardShell = cn(
  "col-start-1 row-start-1",
  "transition-[transform,opacity,filter,scale] duration-[var(--duration-slow)] ease-[var(--ease-overshoot)]",
);

export interface CardStackProps
  extends ComponentPropsWithRef<"div">, VariantProps<typeof cardStackVariants> {
  /** One card per child. */
  children: ReactNode;
  /** `deck` only: the card on top (controlled). */
  index?: number;
  /** `deck` only: the card on top at first (uncontrolled). */
  defaultIndex?: number;
  /** `deck` only: called when the reader moves to another card. */
  onIndexChange?: (index: number) => void;
  /** `deck` only: names each card for assistive technology. Defaults to "2 of 5". */
  getCardLabel?: (index: number, count: number) => string;
  /** `fan` only: forces the fan open or shut. Leave unset to follow hover and focus. */
  open?: boolean;
  /** `fan` only: the width of the fan, 0–100. It is an arc the cards share, not a gap. */
  spread?: number;
  /** `fan` only: how far the pile is from squared-up, 0–100. */
  scatter?: number;
}

const defaultLabel = (index: number, count: number) =>
  `${String(index + 1)} of ${String(count)}`;

type Shared = Omit<
  CardStackProps,
  | "variant"
  | "index"
  | "defaultIndex"
  | "onIndexChange"
  | "getCardLabel"
  | "open"
  | "spread"
  | "scatter"
>;
type DeckProps = Shared &
  Pick<CardStackProps, "index" | "defaultIndex" | "onIndexChange" | "getCardLabel">;
type FanProps = Shared & Pick<CardStackProps, "open" | "spread" | "scatter">;

/** A pile of cards: a stepped deck, or a pile that fans out. */
export function CardStack({
  variant = "deck",
  index,
  defaultIndex,
  onIndexChange,
  getCardLabel,
  open,
  spread,
  scatter,
  ...props
}: CardStackProps) {
  return variant === "fan" ? (
    <Fan open={open} spread={spread} scatter={scatter} {...props} />
  ) : (
    <Deck
      index={index}
      defaultIndex={defaultIndex}
      onIndexChange={onIndexChange}
      getCardLabel={getCardLabel}
      {...props}
    />
  );
}

function isRtl(element: Element) {
  return element.closest("[dir]")?.getAttribute("dir") === "rtl";
}

function Deck({
  className,
  children,
  index,
  defaultIndex = 0,
  onIndexChange,
  getCardLabel = defaultLabel,
  ...props
}: DeckProps) {
  const cards = Children.toArray(children);
  const count = cards.length;
  const [uncontrolled, setUncontrolled] = useState(defaultIndex);
  const current = Math.min(Math.max(index ?? uncontrolled, 0), Math.max(count - 1, 0));
  const [announcement, setAnnouncement] = useState("");
  const stage = useRef<HTMLDivElement>(null);
  const dots = useRef<(HTMLButtonElement | null)[]>([]);
  const lastWheel = useRef(Number.NEGATIVE_INFINITY);
  const touchStart = useRef<number | null>(null);

  function go(target: number, focusDot = false) {
    const next = Math.min(Math.max(target, 0), count - 1);
    if (next === current) return false;
    if (index === undefined) setUncontrolled(next);
    onIndexChange?.(next);
    setAnnouncement(`Card ${getCardLabel(next, count)}`);
    if (focusDot) dots.current[next]?.focus();
    return true;
  }

  // The wheel listener must be non-passive to keep the page from scrolling
  // while it steps the deck — but only while there is a card to step to, so
  // the page scrolls on as normal once either end is reached.
  const step = useRef(go);
  const currentRef = useRef(current);
  useEffect(() => {
    step.current = go;
    currentRef.current = current;
  });
  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) < WHEEL_THRESHOLD) return;
      const now = event.timeStamp;
      if (now - lastWheel.current < WHEEL_INTERVAL) {
        event.preventDefault();
        return;
      }
      if (step.current(currentRef.current + Math.sign(event.deltaY))) {
        lastWheel.current = now;
        event.preventDefault();
      }
    };
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, []);

  // The dots are the keyboard's way in, and behave like a tab list: one tab
  // stop, arrows to move, Home and End to jump.
  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const forward = isRtl(event.currentTarget) ? "ArrowLeft" : "ArrowRight";
    const backward = forward === "ArrowLeft" ? "ArrowRight" : "ArrowLeft";
    const targets: Record<string, number> = {
      ArrowDown: current + 1,
      [forward]: current + 1,
      ArrowUp: current - 1,
      [backward]: current - 1,
      Home: 0,
      End: count - 1,
    };
    const target = targets[event.key];
    if (target === undefined) return;
    event.preventDefault();
    go(target, true);
  }

  function handleTouchMove(event: TouchEvent<HTMLDivElement>) {
    const start = touchStart.current;
    const touch = event.touches[0];
    if (start === null || !touch) return;
    const delta = start - touch.clientY;
    if (Math.abs(delta) < SWIPE_THRESHOLD) return;
    touchStart.current = null;
    go(current + Math.sign(delta));
  }

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label={props["aria-labelledby"] ? undefined : "Cards"}
      data-slot="card-stack"
      data-variant="deck"
      className={cn(cardStackVariants({ variant: "deck" }), className)}
      {...props}
    >
      <div
        ref={stage}
        data-slot="card-stack-stage"
        className="grid touch-none place-items-center pt-24 [perspective:1000px]"
        onTouchStart={(event) => {
          touchStart.current = event.touches[0]?.clientY ?? null;
        }}
        onTouchMove={handleTouchMove}
        onTouchEnd={() => {
          touchStart.current = null;
        }}
      >
        {cards.map((card, i) => {
          const active = i === current;
          return (
            <div
              key={i}
              role="group"
              aria-roledescription="slide"
              aria-label={getCardLabel(i, count)}
              aria-hidden={active ? undefined : true}
              inert={!active}
              data-slot="card-stack-card"
              data-active={active}
              className={cn(cardShell, "data-[active=true]:hover:scale-[1.02]")}
              style={deckCardStyle(i, current, count)}
            >
              {card}
            </div>
          );
        })}
      </div>
      <div role="group" aria-label="Choose a card" className="flex items-center gap-2">
        {cards.map((_, i) => (
          <button
            key={i}
            ref={(element) => {
              dots.current[i] = element;
            }}
            type="button"
            tabIndex={i === current ? 0 : -1}
            aria-label={`Card ${getCardLabel(i, count)}`}
            aria-current={i === current ? "true" : undefined}
            data-slot="card-stack-indicator"
            className={cn(
              "relative size-2 rounded-full bg-border-strong after:absolute after:-inset-2",
              "transition-[background-color,scale] duration-[var(--duration-fast)] ease-[var(--ease-out-quint)]",
              "hover:bg-muted-foreground aria-current:scale-125 aria-current:bg-primary",
              focusRing,
            )}
            onClick={() => go(i)}
            onKeyDown={handleKeyDown}
          />
        ))}
      </div>
      <span role="status" aria-live="polite" className="sr-only">
        {announcement}
      </span>
    </div>
  );
}

function Fan({
  className,
  children,
  open,
  spread = 55,
  scatter = 40,
  onPointerEnter,
  onPointerLeave,
  onFocus,
  onBlur,
  ...props
}: FanProps) {
  const cards = Children.toArray(children);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [lifted, setLifted] = useState<number | null>(null);
  const fanned = open ?? (hovered || focused);

  return (
    <div
      role="list"
      aria-label={props["aria-labelledby"] ? undefined : "Cards"}
      data-slot="card-stack"
      data-variant="fan"
      data-state={fanned ? "open" : "closed"}
      className={cn(
        cardStackVariants({ variant: "fan" }),
        "grid place-items-center",
        className,
      )}
      onPointerEnter={(event) => {
        onPointerEnter?.(event);
        setHovered(true);
      }}
      onPointerLeave={(event) => {
        onPointerLeave?.(event);
        setHovered(false);
        setLifted(null);
      }}
      onFocus={(event) => {
        onFocus?.(event);
        setFocused(true);
      }}
      onBlur={(event) => {
        onBlur?.(event);
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setFocused(false);
          setLifted(null);
        }
      }}
      {...props}
    >
      {cards.map((card, i) => {
        const up = fanned && lifted === i;
        return (
          <div
            key={i}
            role="listitem"
            data-slot="card-stack-card"
            className={cardShell}
            style={fanCardStyle(i, cards.length, { fanned, spread, scatter })}
            onPointerEnter={() => setLifted(i)}
            onFocus={() => setLifted(i)}
          >
            <div
              data-slot="card-stack-face"
              data-lifted={up || undefined}
              className="transition-[translate] duration-[var(--duration-slow)] ease-[var(--ease-out-quint)] data-lifted:-translate-y-4"
            >
              {card}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export { cardStackVariants };
