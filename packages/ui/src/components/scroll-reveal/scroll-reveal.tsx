"use client";

// Original design.
import { cva, type VariantProps } from "class-variance-authority";
import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
} from "react";

import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

/*
 * Content that eases into place as it scrolls into view.
 *
 * The rule that shapes everything here: content is never hidden unless it is
 * certain to be revealed. The server renders it visible, so it reads with
 * JavaScript off. On mount, only content that is below the fold is hidden —
 * what is already on screen when the page loads stays exactly where it is,
 * rather than flashing out and back in. Without an IntersectionObserver, or
 * under reduced motion, nothing is ever hidden.
 *
 * `stagger` delays each direct child a little more than the last, so a list
 * or a grid arrives in order rather than all at once.
 */

const MOTION =
  "transition-[opacity,translate,scale,filter] duration-(--scroll-reveal-duration) delay-(--scroll-reveal-delay) ease-(--ease-out-quint)";

const scrollRevealVariants = cva("", {
  variants: {
    /** How the content arrives. */
    effect: {
      fade: "",
      up: "",
      down: "",
      start: "",
      end: "",
      scale: "",
      blur: "",
    },
    /**
     * Whether the children arrive one after another. The hidden state then
     * lives on each direct child, each with its own delay, not on the box.
     */
    staggered: {
      false: MOTION,
      true: "*:transition-[opacity,translate,scale,filter] *:delay-(--scroll-reveal-delay) *:duration-(--scroll-reveal-duration) *:ease-(--ease-out-quint)",
    },
  },
  // Written out in full for both: Tailwind only generates classes it can read.
  compoundVariants: [
    { staggered: false, effect: "fade", class: "data-[state=hidden]:opacity-0" },
    {
      staggered: false,
      effect: "up",
      class:
        "data-[state=hidden]:translate-y-(--scroll-reveal-distance) data-[state=hidden]:opacity-0",
    },
    {
      staggered: false,
      effect: "down",
      class:
        "data-[state=hidden]:-translate-y-(--scroll-reveal-distance) data-[state=hidden]:opacity-0",
    },
    {
      staggered: false,
      effect: "start",
      class:
        "data-[state=hidden]:-translate-x-(--scroll-reveal-distance) data-[state=hidden]:opacity-0 rtl:data-[state=hidden]:translate-x-(--scroll-reveal-distance)",
    },
    {
      staggered: false,
      effect: "end",
      class:
        "data-[state=hidden]:translate-x-(--scroll-reveal-distance) data-[state=hidden]:opacity-0 rtl:data-[state=hidden]:-translate-x-(--scroll-reveal-distance)",
    },
    {
      staggered: false,
      effect: "scale",
      class: "data-[state=hidden]:scale-95 data-[state=hidden]:opacity-0",
    },
    {
      staggered: false,
      effect: "blur",
      class: "data-[state=hidden]:opacity-0 data-[state=hidden]:blur-sm",
    },
    { staggered: true, effect: "fade", class: "data-[state=hidden]:*:opacity-0" },
    {
      staggered: true,
      effect: "up",
      class:
        "data-[state=hidden]:*:translate-y-(--scroll-reveal-distance) data-[state=hidden]:*:opacity-0",
    },
    {
      staggered: true,
      effect: "down",
      class:
        "data-[state=hidden]:*:-translate-y-(--scroll-reveal-distance) data-[state=hidden]:*:opacity-0",
    },
    {
      staggered: true,
      effect: "start",
      class:
        "data-[state=hidden]:*:-translate-x-(--scroll-reveal-distance) data-[state=hidden]:*:opacity-0 rtl:data-[state=hidden]:*:translate-x-(--scroll-reveal-distance)",
    },
    {
      staggered: true,
      effect: "end",
      class:
        "data-[state=hidden]:*:translate-x-(--scroll-reveal-distance) data-[state=hidden]:*:opacity-0 rtl:data-[state=hidden]:*:-translate-x-(--scroll-reveal-distance)",
    },
    {
      staggered: true,
      effect: "scale",
      class: "data-[state=hidden]:*:scale-95 data-[state=hidden]:*:opacity-0",
    },
    {
      staggered: true,
      effect: "blur",
      class: "data-[state=hidden]:*:opacity-0 data-[state=hidden]:*:blur-sm",
    },
  ],
  defaultVariants: { effect: "up", staggered: false },
});

/** Whether an element's box overlaps the viewport right now. */
function onScreen(element: Element): boolean {
  const box = element.getBoundingClientRect();
  return (
    box.bottom > 0 &&
    box.top < window.innerHeight &&
    box.right > 0 &&
    box.left < window.innerWidth
  );
}

export interface ScrollRevealProps
  extends ComponentPropsWithRef<"div">, VariantProps<typeof scrollRevealVariants> {
  /** Distance travelled, in pixels, for the moving effects. Default 24. */
  distance?: number;
  /** Length of the reveal, in milliseconds. Default 600. */
  duration?: number;
  /** Wait before revealing, in milliseconds. Default 0. */
  delay?: number;
  /** Extra delay per direct child, in milliseconds, so they arrive in order. Default 0. */
  stagger?: number;
  /** Share of the content that must be visible before it reveals, 0–1. Default 0.15. */
  threshold?: number;
  /** Reveal once and stay; otherwise hide again when scrolled away. Default true. */
  once?: boolean;
  /** Called the first time it reveals. */
  onReveal?: () => void;
}

/** Reveals its content as it scrolls into view, never hiding what cannot be revealed. */
export function ScrollReveal({
  effect,
  distance = 24,
  duration = 600,
  delay = 0,
  stagger = 0,
  threshold = 0.15,
  once = true,
  onReveal,
  className,
  style,
  children,
  ref,
  ...props
}: ScrollRevealProps) {
  const reduced = useReducedMotion();
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  // "idle" is visible and unmanaged: the server's render, and anything that
  // cannot or need not animate.
  const [state, setState] = useState<"idle" | "hidden" | "shown">("idle");
  const revealed = useRef(false);
  const onRevealRef = useRef(onReveal);
  useLayoutEffect(() => {
    onRevealRef.current = onReveal;
  });

  // Decided as the element attaches, before the first paint: below the fold,
  // it waits to be revealed; on screen, it stays as the server drew it.
  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      setElement(node);
      if (
        node &&
        !revealed.current &&
        typeof IntersectionObserver === "function" &&
        typeof window !== "undefined" &&
        !onScreen(node)
      ) {
        setState("hidden");
      }
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  const stateRef = useRef(state);
  useLayoutEffect(() => {
    stateRef.current = state;
  });

  useLayoutEffect(() => {
    if (!element || reduced || typeof IntersectionObserver !== "function") return;
    let current = stateRef.current;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && current === "hidden") {
            current = "shown";
            setState("shown");
            if (!revealed.current) {
              revealed.current = true;
              onRevealRef.current?.();
            }
            if (once) observer.disconnect();
          } else if (!entry.isIntersecting && !once && current !== "hidden") {
            current = "hidden";
            setState("hidden");
          }
        }
      },
      { threshold: Math.min(1, Math.max(0, threshold)) },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [element, reduced, once, threshold]);

  // Under reduced motion nothing waits, whatever happened before.
  const shownState = reduced ? "idle" : state;

  // Each direct child a step later than the last.
  useLayoutEffect(() => {
    if (!element) return;
    Array.from(element.children).forEach((child, index) => {
      if (!(child instanceof HTMLElement)) return;
      if (stagger > 0) {
        child.style.setProperty(
          "--scroll-reveal-delay",
          `calc(${String(delay + index * stagger)}ms * var(--motion-scale, 1))`,
        );
      } else {
        child.style.removeProperty("--scroll-reveal-delay");
      }
    });
  }, [element, stagger, delay, children]);

  return (
    <div
      ref={setRefs}
      data-slot="scroll-reveal"
      data-state={shownState}
      data-stagger={stagger > 0 || undefined}
      className={cn(scrollRevealVariants({ effect, staggered: stagger > 0 }), className)}
      style={
        {
          "--scroll-reveal-distance": `${String(Math.max(0, distance))}px`,
          "--scroll-reveal-duration": `calc(${String(Math.max(0, duration))}ms * var(--motion-scale, 1))`,
          "--scroll-reveal-delay": `calc(${String(Math.max(0, delay))}ms * var(--motion-scale, 1))`,
          ...style,
        } as CSSProperties
      }
      {...props}
    >
      {children}
    </div>
  );
}

export { scrollRevealVariants };
