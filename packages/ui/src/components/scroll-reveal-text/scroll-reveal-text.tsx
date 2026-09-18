"use client";

// Ported from SmoothUI Scroll Reveal Paragraph (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import { cva, type VariantProps } from "class-variance-authority";
import {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  type ComponentPropsWithRef,
  type CSSProperties,
  type Ref,
} from "react";

import { cn } from "@/lib/utils";

/*
 * Words brighten from dim to full, one after another, as the paragraph scrolls
 * up the viewport.
 *
 * The source tracked scroll with a Motion `useScroll` value between
 * `start 0.9` and `start 0.25` — the paragraph's top edge crossing 90%, then
 * 25%, of the viewport height — and gave each of n words an equal slice of
 * that progress. Here the same range drives a CSS scroll-driven animation:
 *
 * - The paragraph names a view timeline. Its `cover` range starts when the top
 *   edge meets the bottom of the viewport, so `cover 10vh` is the top at 90%
 *   and `cover 75vh` the top at 25%. Word i animates over its 1/n slice of
 *   those 65vh. No JavaScript runs per frame; no React state changes on scroll.
 * - Where scroll-driven animation is unsupported, a scroll listener throttled
 *   to one read per animation frame writes the same progress to a CSS variable
 *   on the paragraph, and each word derives its opacity from it in CSS.
 * - The source's two stacked layers (a 10% ghost under a fading full-colour
 *   copy) composite to exactly `0.1 + 0.9 × progress` opacity, so each word is
 *   one span fading from `dimOpacity` to 1. It keeps the consumer's colour.
 *
 * Every word is legible unless something is actively animating it: without
 * JavaScript and without scroll-timeline support, and under reduced motion,
 * the text is simply the text. The words are aria-hidden and the paragraph is
 * read once from an sr-only copy.
 */

const PREFIX = "dowel-scroll-reveal-text";
const I = `--${PREFIX}-i`;
const N = `--${PREFIX}-n`;
const DIM = `--${PREFIX}-dim`;
const PROGRESS = `--${PREFIX}-progress`;

// The source's offsets: the top edge from 90% to 25% of the viewport.
const START_VH = 10;
const SPAN_VH = 65;

const STYLES = `
@supports (animation-timeline:view()){@media (prefers-reduced-motion:no-preference){
[data-slot=scroll-reveal-text]{view-timeline-name:--${PREFIX}}
[data-slot=scroll-reveal-text-word]{animation:${PREFIX}-word linear both;animation-timeline:--${PREFIX};animation-range-start:cover calc(${String(START_VH)}vh + ${String(SPAN_VH)}vh * var(${I}) / var(${N}));animation-range-end:cover calc(${String(START_VH)}vh + ${String(SPAN_VH)}vh * (var(${I}) + 1) / var(${N}))}
}}
[data-slot=scroll-reveal-text][data-fallback] [data-slot=scroll-reveal-text-word]{opacity:clamp(var(${DIM}),calc(var(${DIM}) + (1 - var(${DIM})) * (var(${PROGRESS},1) * var(${N}) - var(${I}))),1)}
@keyframes ${PREFIX}-word{from{opacity:var(${DIM})}to{opacity:1}}
`;

/** Elements text effects render as. They are all phrasing or heading content. */
export type ScrollRevealTextElement =
  "span" | "p" | "div" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

const scrollRevealTextVariants = cva("", {
  variants: {
    size: {
      sm: "text-base leading-relaxed",
      md: "text-lg leading-relaxed",
      lg: "text-2xl leading-snug",
      xl: "text-4xl leading-tight font-semibold tracking-tight",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

export interface ScrollRevealTextProps
  extends
    Omit<ComponentPropsWithRef<"p">, "ref" | "children">,
    VariantProps<typeof scrollRevealTextVariants> {
  ref?: Ref<HTMLElement>;
  /** The paragraph. Split into words on whitespace. */
  children: string;
  /** The element to render. */
  as?: ScrollRevealTextElement;
  /** Opacity of a word before it is revealed, from 0 to 1. */
  dimOpacity?: number;
}

function scrollTimelineSupported(): boolean {
  return typeof CSS !== "undefined" && typeof CSS.supports === "function"
    ? CSS.supports("animation-timeline: view()")
    : false;
}

function reducedMotion(): boolean {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * The fallback: progress through the source's range, written to a CSS
 * variable at most once per frame. Returns a cleanup.
 */
function trackScroll(element: HTMLElement): () => void {
  let frame = 0;
  const update = () => {
    frame = 0;
    const height = window.innerHeight || 1;
    const top = element.getBoundingClientRect().top;
    const progress = ((1 - START_VH / 100) * height - top) / ((SPAN_VH / 100) * height);
    element.style.setProperty(PROGRESS, String(Math.min(Math.max(progress, 0), 1)));
  };
  const schedule = () => {
    if (frame === 0) frame = requestAnimationFrame(update);
  };

  element.setAttribute("data-fallback", "");
  update();
  window.addEventListener("scroll", schedule, { passive: true, capture: true });
  window.addEventListener("resize", schedule, { passive: true });
  return () => {
    if (frame !== 0) cancelAnimationFrame(frame);
    window.removeEventListener("scroll", schedule, { capture: true });
    window.removeEventListener("resize", schedule);
    element.removeAttribute("data-fallback");
    element.style.removeProperty(PROGRESS);
  };
}

/** A paragraph whose words brighten from dim to full as it scrolls through the viewport. */
export function ScrollRevealText({
  as: Component = "p",
  children,
  dimOpacity = 0.1,
  size,
  className,
  style,
  ref,
  ...props
}: ScrollRevealTextProps) {
  const node = useRef<HTMLElement | null>(null);
  const words = children.split(/\s+/).filter(Boolean);

  useEffect(() => {
    const element = node.current;
    if (!element || scrollTimelineSupported() || reducedMotion()) return;
    return trackScroll(element);
  }, []);

  const setRef = useCallback(
    (element: HTMLElement | null) => {
      node.current = element;
      if (typeof ref === "function") ref(element);
      else if (ref) ref.current = element;
    },
    [ref],
  );

  return (
    <>
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      <Component
        ref={setRef}
        data-slot="scroll-reveal-text"
        className={cn(scrollRevealTextVariants({ size }), className)}
        style={{ [N]: words.length, [DIM]: dimOpacity, ...style } as CSSProperties}
        {...props}
      >
        <span data-slot="scroll-reveal-text-words" aria-hidden="true">
          {words.map((word, index) => (
            <Fragment key={index}>
              {index > 0 ? " " : null}
              <span data-slot="scroll-reveal-text-word" style={{ [I]: index } as CSSProperties}>
                {word}
              </span>
            </Fragment>
          ))}
        </span>
        <span className="sr-only">{children}</span>
      </Component>
    </>
  );
}

export { scrollRevealTextVariants };
