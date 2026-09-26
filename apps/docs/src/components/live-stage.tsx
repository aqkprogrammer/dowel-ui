"use client";

import { cn } from "@dowel-ui/react";
import {
  Component,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ErrorInfo,
  type ReactNode,
  type RefObject,
} from "react";

/**
 * Whether an element is on screen, or near enough to it to be worth waking.
 *
 * Live previews are real components — timers, canvases, the odd WebGL
 * context — so a grid of two hundred of them mounts only what can be seen
 * and lets go of what has scrolled away. A browser keeps a handful of WebGL
 * contexts alive at once and silently drops the oldest after that; mounting
 * everything would have blanked the first orbs by the time the last loaded.
 */
export function useNearViewport<T extends Element>(rootMargin = "240px") {
  const ref = useRef<T | null>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setNear(entry?.isIntersecting ?? false);
      },
      { rootMargin },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
    };
  }, [rootMargin]);

  return [ref, near] as const;
}

/**
 * A story that throws shows its placeholder instead of taking the grid with it.
 *
 * One broken example on a page of two hundred should cost one card.
 */
class Contained extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override componentDidCatch(error: unknown, info: ErrorInfo) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("A live preview failed to render.", error, info.componentStack);
    }
  }

  override render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export interface LiveStageProps {
  children: ReactNode;
  /**
   * The width the component is laid out at before it is scaled.
   *
   * Stories are written for a canvas, not a card, so they are given room to
   * lay out as they would on a page and the result is scaled to the box. A
   * component that needs more than this widens the stage to its own minimum.
   */
  stageWidth?: number;
  /** The largest scale applied — below 1 keeps small components from looking blown up. */
  maxScale?: number;
  /** Share of the box the scaled component may fill. */
  fill?: number;
  /**
   * Leave the component operable.
   *
   * Off in a grid, where the whole card is a link and a live control inside it
   * would be a second, unlabelled target; on in the showcase, where trying the
   * component is the point.
   */
  interactive?: boolean;
  /** Shown until the component mounts, and if it fails to. */
  placeholder?: ReactNode;
  className?: string;
}

/**
 * Lays a live component out at page size and scales it to fit its box.
 *
 * Mounts only near the viewport, so the cost of a preview is paid when
 * somebody is looking at it.
 */
export function LiveStage({
  children,
  stageWidth = 440,
  maxScale = 1,
  fill = 0.86,
  interactive = false,
  placeholder,
  className,
}: LiveStageProps) {
  const [box, near] = useNearViewport<HTMLDivElement>();

  return (
    <div ref={box} className={cn("relative overflow-hidden", className)}>
      {near ? (
        <FittedStage
          box={box}
          stageWidth={stageWidth}
          maxScale={maxScale}
          fill={fill}
          interactive={interactive}
          placeholder={placeholder}
        >
          {children}
        </FittedStage>
      ) : (
        placeholder
      )}
    </div>
  );
}

/**
 * The stage itself, mounted only while its box is near the viewport.
 *
 * Its own component so that leaving the viewport discards the measured width
 * and scale with it, and coming back measures afresh.
 */
function FittedStage({
  box,
  children,
  stageWidth,
  maxScale,
  fill,
  interactive,
  placeholder,
}: Required<Omit<LiveStageProps, "className" | "placeholder">> & {
  box: RefObject<HTMLDivElement | null>;
  placeholder: ReactNode;
}) {
  const stage = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(stageWidth);
  const [scale, setScale] = useState<number | null>(null);

  useLayoutEffect(() => {
    const outer = box.current;
    const inner = stage.current;
    if (!outer || !inner) return;

    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        // A component with a minimum width wider than the stage overflows it;
        // widening the stage to that minimum once is enough, since the content
        // then fits exactly and stops overflowing.
        const needed = inner.scrollWidth;
        setWidth((current) => (needed > current + 1 ? needed : current));

        const contentWidth = Math.max(inner.scrollWidth, 1);
        const contentHeight = Math.max(inner.scrollHeight, 1);
        const next = Math.min(
          maxScale,
          (outer.clientWidth * fill) / contentWidth,
          (outer.clientHeight * fill) / contentHeight,
        );
        setScale((current) =>
          current !== null && Math.abs(current - next) < 0.005 ? current : next,
        );
      });
    };

    measure();
    const resizes = new ResizeObserver(measure);
    resizes.observe(outer);
    resizes.observe(inner);
    // Content that animates its own size — an accordion opening, a list
    // filling — changes the stage's children, not the stage.
    const mutations = new MutationObserver(measure);
    mutations.observe(inner, { childList: true, subtree: true });

    // Something being operated must not move under the pointer. Once an
    // interactive component has settled, only the box resizing rescales it —
    // not a dock magnifying, or a panel it opens.
    const settle = interactive
      ? window.setTimeout(() => {
          resizes.unobserve(inner);
          mutations.disconnect();
        }, 1200)
      : undefined;

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(settle);
      resizes.disconnect();
      mutations.disconnect();
    };
  }, [maxScale, fill, interactive, box]);

  return (
    <div
      ref={stage}
      // A transformed ancestor is the containing block for anything fixed
      // inside it, so a toast region or a pinned bar stays in the card.
      className={cn(
        "absolute top-1/2 left-1/2 grid place-items-center",
        "transition-opacity duration-[var(--duration-slow)] ease-[var(--ease-out-quint)]",
        !interactive && "pointer-events-none select-none",
      )}
      style={{
        width,
        transform: `translate(-50%, -50%) scale(${String(scale ?? 1)})`,
        opacity: scale === null ? 0 : 1,
      }}
      inert={!interactive}
      aria-hidden={interactive ? undefined : true}
    >
      <Contained fallback={placeholder}>{children}</Contained>
    </div>
  );
}
