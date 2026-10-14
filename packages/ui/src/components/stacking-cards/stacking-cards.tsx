"use client";

// Original design.
import {
  Children,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  type ComponentPropsWithRef,
  type CSSProperties,
} from "react";

import { useInView } from "@/hooks/use-in-view";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

/*
 * Cards that stack up as the page scrolls: each sticks a little below the one
 * before it, so the next slides up over it and the pile grows at the top of
 * the screen. Covered cards ease back a touch, so the newest reads as nearest.
 *
 * The stacking is CSS (`position: sticky`) and works with JavaScript off. The
 * easing back is one transform per card, worked out from where the cards are,
 * once a frame while the stack is on screen; under reduced motion it is
 * skipped and the cards simply stack. Every card stays in the document in
 * order, so reading and tabbing go through them as written, and each carries
 * a scroll margin so focusing one brings it clear of the stack.
 */

const IndexContext = createContext<{ index: number; count: number } | null>(null);

/**
 * How far a card has eased back: the sum, over each card after it, of how
 * much of this card's height that card has already slid over. 0 is untouched.
 */
export function stackingCoverage(
  card: { top: number; height: number },
  later: readonly { top: number; stickyTop: number }[],
): number {
  if (card.height <= 0) return 0;
  let covered = 0;
  for (const next of later) {
    const gap = next.top - next.stickyTop;
    covered += Math.min(1, Math.max(0, 1 - gap / card.height));
  }
  return covered;
}

export interface StackingCardsProps extends ComponentPropsWithRef<"div"> {
  /** Distance from the top of the viewport where the first card sticks, in pixels. Default 80. */
  offset?: number;
  /** How much lower each card sticks than the one before, in pixels. Default 16. */
  gap?: number;
  /** How much a card shrinks per card covering it, 0–0.2. Default 0.04. */
  shrink?: number;
}

/** A column of cards that stack at the top of the screen as the page scrolls. */
export function StackingCards({
  offset = 80,
  gap = 16,
  shrink = 0.04,
  className,
  style,
  children,
  ref,
  ...props
}: StackingCardsProps) {
  const reduced = useReducedMotion();
  const { ref: inViewRef, inView } = useInView<HTMLDivElement>({ rootMargin: "100px" });
  const root = useRef<HTMLDivElement | null>(null);
  const items = Children.toArray(children);

  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      root.current = node;
      inViewRef(node);
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [inViewRef, ref],
  );

  useEffect(() => {
    const container = root.current;
    if (!container) return;
    const cards = () =>
      Array.from(container.querySelectorAll<HTMLElement>(":scope > [data-slot=stacking-card]"));
    if (reduced || shrink <= 0 || !inView) {
      if (reduced || shrink <= 0) for (const card of cards()) card.style.transform = "";
      return;
    }

    let frame = 0;
    const update = () => {
      frame = 0;
      const list = cards();
      const boxes = list.map((card, i) => {
        const rect = card.getBoundingClientRect();
        return { top: rect.top, height: rect.height, stickyTop: offset + i * gap };
      });
      list.forEach((card, i) => {
        const box = boxes[i];
        if (!box) return;
        const covered = stackingCoverage(box, boxes.slice(i + 1));
        const scale = Math.max(0.5, 1 - covered * Math.min(0.2, shrink));
        card.style.transform = covered > 0 ? `scale(${scale.toFixed(4)})` : "";
      });
    };
    const request = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request, { passive: true });
    return () => {
      window.removeEventListener("scroll", request);
      window.removeEventListener("resize", request);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [reduced, shrink, offset, gap, inView, items.length]);

  return (
    <div
      ref={setRefs}
      data-slot="stacking-cards"
      className={cn("relative grid gap-(--stacking-gap-flow)", className)}
      style={
        {
          "--stacking-offset": `${String(offset)}px`,
          "--stacking-step": `${String(gap)}px`,
          "--stacking-gap-flow": "2rem",
          ...style,
        } as CSSProperties
      }
      {...props}
    >
      {items.map((child, index) => (
        <IndexContext.Provider key={index} value={{ index, count: items.length }}>
          {child}
        </IndexContext.Provider>
      ))}
    </div>
  );
}

export type StackingCardProps = ComponentPropsWithRef<"div">;

/** One card of a stack. Style it as you would any card; it brings its own stickiness. */
export function StackingCard({ className, style, ...props }: StackingCardProps) {
  const position = useContext(IndexContext);
  if (!position) throw new Error("<StackingCard> must be used inside <StackingCards>.");

  return (
    <div
      data-slot="stacking-card"
      data-index={position.index}
      className={cn(
        "sticky top-[calc(var(--stacking-offset)+var(--stacking-index)*var(--stacking-step))]",
        "origin-top scroll-mt-[calc(var(--stacking-offset)+var(--stacking-index)*var(--stacking-step))]",
        "rounded-2xl border border-border bg-card text-card-foreground shadow-sm",
        className,
      )}
      style={{ "--stacking-index": String(position.index), ...style } as CSSProperties}
      {...props}
    />
  );
}
