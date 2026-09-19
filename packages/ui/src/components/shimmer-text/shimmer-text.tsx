"use client";

// Ported from SmoothUI Shimmer Sweep and Shine Text (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import { cva, type VariantProps } from "class-variance-authority";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
  type Ref,
} from "react";

import { cn } from "@/lib/utils";

/*
 * Two SmoothUI text effects share one component (ADR 0014, families not copies):
 *
 * - `shine` (Shine Text): a highlight band sweeps across the letters on a loop.
 *   The text is painted by a gradient clipped to the glyphs; the band is the
 *   middle stop, and the loop moves `background-position-x` from 150% to -150%.
 *   The source's pause between sweeps (`repeatDelay`) is baked into the
 *   keyframe as a hold at the end, so one CSS animation loops exactly as the
 *   JavaScript one did.
 * - `sweep` (Shimmer Sweep): a one-shot entrance — the whole string fades in
 *   from 8px of blur while gliding 22px from the inline start, over 850ms on
 *   Apple's ease-out, which is our --ease-out-quint.
 *
 * Neither splits the text, so it stays one run for assistive technology and
 * for copy and paste. Both are decoration: under reduced motion the global
 * blanket collapses the animation to its final keyframe (sweep: fully visible)
 * and the stylesheet below drops the shine gradient for plain text in the base
 * colour, as the source did.
 */

const PREFIX = "dowel-shimmer-text";

const STYLES = `
[data-slot=shimmer-text][data-variant=shine]{background-image:linear-gradient(110deg,var(--${PREFIX}-base) 40%,var(--${PREFIX}-shine) 50%,var(--${PREFIX}-base) 60%);background-size:250% 100%;background-position-x:150%;-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-fill-color:transparent}
[data-slot=shimmer-text][data-variant=sweep]{display:inline-block;--${PREFIX}-x:-22px}
[data-slot=shimmer-text][data-variant=sweep]:dir(rtl){--${PREFIX}-x:22px}
[data-slot=shimmer-text][data-variant=sweep][data-state=waiting]{opacity:0}
@keyframes ${PREFIX}-sweep{from{opacity:0;filter:blur(8px);transform:translateX(var(--${PREFIX}-x))}to{opacity:1;filter:blur(0);transform:none}}
@media (prefers-reduced-motion:reduce){[data-slot=shimmer-text][data-variant=shine]{background-image:none;color:var(--${PREFIX}-base);-webkit-text-fill-color:currentColor}}
@media (forced-colors:active){[data-slot=shimmer-text][data-variant=shine]{background-image:none;-webkit-text-fill-color:currentColor}}
`;

/** The hold at the end of each shine loop, as a keyframe of its own. */
function shineKeyframes(hold: number): { name: string; css: string } {
  const name = `${PREFIX}-shine-${String(hold)}`;
  const end = hold === 100 ? "100%" : `${String(hold)}%,100%`;
  return {
    name,
    css: `@keyframes ${name}{0%{background-position-x:150%}${end}{background-position-x:-150%}}`,
  };
}

/** Milliseconds, scaled so reduced motion and --motion-scale reach it. */
function scaled(ms: number): string {
  return `calc(${String(ms)}ms * var(--motion-scale, 1))`;
}

/** Elements text effects render as. They are all phrasing or heading content. */
export type ShimmerTextElement = "span" | "p" | "div" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

const shimmerTextVariants = cva("", {
  variants: {
    /** `shine` loops a light band across the text; `sweep` is a blur-and-glide entrance. */
    variant: {
      shine: "",
      sweep: "",
    },
  },
  defaultVariants: {
    variant: "shine",
  },
});

export type ShimmerTextVariant = NonNullable<
  VariantProps<typeof shimmerTextVariants>["variant"]
>;

export interface ShimmerTextProps
  extends Omit<ComponentPropsWithRef<"span">, "ref">, VariantProps<typeof shimmerTextVariants> {
  ref?: Ref<HTMLElement>;
  /** The element to render. */
  as?: ShimmerTextElement;
  /** `loop` (shine's default) repeats forever; `once` plays a single pass. Sweep always plays once. */
  repeat?: "loop" | "once";
  /** One pass, in milliseconds. Defaults to 2500 for shine, 850 for sweep. */
  duration?: number;
  /** Shine only: the pause between sweeps, in milliseconds. */
  repeatDelay?: number;
  /** Delay before the first pass, in milliseconds. */
  delay?: number;
  /** Shine only: the text colour outside the band. Any CSS colour; use a token. */
  baseColor?: string;
  /** Shine only: the colour of the band. Any CSS colour; use a token. */
  shineColor?: string;
  /** Wait until the text scrolls into view before playing. */
  triggerOnView?: boolean;
}

/**
 * Plays once the element is in view, when asked to. Without IntersectionObserver
 * (old browsers, tests, before hydration) it plays immediately, so the text is
 * never stranded invisible.
 */
function useInViewTrigger(enabled: boolean) {
  const [waiting, setWaiting] = useState(false);
  const observer = useRef<IntersectionObserver | null>(null);
  // Once it has played it never waits again, even if the ref is re-attached.
  const seen = useRef(false);

  const attach = useCallback(
    (node: HTMLElement | null) => {
      observer.current?.disconnect();
      observer.current = null;
      if (!node || !enabled || seen.current || typeof IntersectionObserver !== "function")
        return;
      setWaiting(true);
      observer.current = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          seen.current = true;
          setWaiting(false);
          observer.current?.disconnect();
          observer.current = null;
        }
      });
      observer.current.observe(node);
    },
    [enabled],
  );

  useEffect(() => () => observer.current?.disconnect(), []);

  return { waiting: enabled && waiting, attach };
}

/** Text with a looping light band (`shine`) or a blur-and-glide entrance (`sweep`). */
export function ShimmerText({
  as: Component = "span",
  variant = "shine",
  repeat = "loop",
  duration,
  repeatDelay = 600,
  delay = 0,
  baseColor = "var(--color-muted-foreground)",
  shineColor = "var(--color-foreground)",
  triggerOnView = false,
  className,
  style,
  ref,
  children,
  ...props
}: ShimmerTextProps) {
  const { waiting, attach } = useInViewTrigger(triggerOnView);
  const setRef = useCallback(
    (node: HTMLElement | null) => {
      attach(node);
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [attach, ref],
  );

  const shine = variant === "shine";
  const pass = duration ?? (shine ? 2500 : 850);
  // The loop pauses between passes only when it repeats.
  const pause = shine && repeat === "loop" ? repeatDelay : 0;
  const hold = pass + pause > 0 ? Math.round((pass / (pass + pause)) * 100) : 100;
  const keyframes = shine ? shineKeyframes(hold) : null;

  const animation: CSSProperties = waiting
    ? { animationName: "none" }
    : {
        animationName: keyframes ? keyframes.name : `${PREFIX}-sweep`,
        animationDuration: scaled(pass + pause),
        animationDelay: scaled(delay),
        animationTimingFunction: shine ? "linear" : "var(--ease-out-quint)",
        animationIterationCount: shine && repeat === "loop" ? "infinite" : "1",
        animationFillMode: "both",
      };

  return (
    <>
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      {keyframes ? (
        <style href={keyframes.name} precedence="dowel">
          {keyframes.css}
        </style>
      ) : null}
      <Component
        ref={setRef}
        data-slot="shimmer-text"
        data-variant={variant}
        data-state={waiting ? "waiting" : "playing"}
        className={cn(shimmerTextVariants({ variant }), className)}
        style={
          {
            [`--${PREFIX}-base`]: baseColor,
            [`--${PREFIX}-shine`]: shineColor,
            ...animation,
            ...style,
          } as CSSProperties
        }
        {...props}
      >
        {children}
      </Component>
    </>
  );
}

export { shimmerTextVariants };
