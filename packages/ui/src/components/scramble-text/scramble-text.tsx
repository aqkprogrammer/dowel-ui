"use client";

// Ported from SmoothUI Scramble Hover (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import { cva, type VariantProps } from "class-variance-authority";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type Ref,
} from "react";

import { cn } from "@/lib/utils";

/*
 * Characters churn through random glyphs, then settle on the real text.
 *
 * - The server, and the first client render, always show the real text:
 *   randomness only ever runs inside event handlers and effects, after
 *   hydration, so the markup is stable.
 * - The visible glyphs are aria-hidden and the real string sits beside them in
 *   an sr-only copy that never changes, so a screen reader reads the text once
 *   and nothing is announced per tick.
 * - The source re-randomised every character on every tick and snapped to the
 *   text at the end. Here characters resolve from the inline start as the
 *   scramble runs, so the text is readable sooner and the end is not a jump.
 * - Hover is the source's trigger. It also fires on keyboard focus of the
 *   nearest interactive ancestor (a link or button wrapping the text), and not
 *   on touch, where there is no hover to leave.
 * - Under reduced motion there is no scramble at all.
 */

const CHARACTERS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=<>?";

/** Elements text effects render as. They are all phrasing or heading content. */
export type ScrambleTextElement =
  "span" | "p" | "div" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

export type ScrambleTextTrigger = "hover" | "mount" | "in-view";

const scrambleTextVariants = cva("", {
  variants: {
    /** `mono` holds every glyph to one width, so the line does not jitter while it churns. */
    font: {
      inherit: "",
      mono: "font-mono",
    },
  },
  defaultVariants: {
    font: "inherit",
  },
});

export interface ScrambleTextProps
  extends
    Omit<ComponentPropsWithRef<"span">, "ref" | "children">,
    VariantProps<typeof scrambleTextVariants> {
  ref?: Ref<HTMLElement>;
  /** The real text. */
  children: string;
  /** The element to render. */
  as?: ScrambleTextElement;
  /** Total scramble time, in milliseconds. */
  duration?: number;
  /** Time between scramble frames, in milliseconds. */
  speed?: number;
  /** The glyphs to scramble through. */
  characters?: string;
  /**
   * What starts the scramble. `hover` (default) runs on pointer hover and
   * keyboard focus; `mount` and `in-view` also play once on their own, and
   * hover replays it.
   */
  trigger?: ScrambleTextTrigger;
}

function reducedMotion(): boolean {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** A frame of the scramble: the first `settled` characters are real. */
export function scrambleFrame(text: string, settled: number, characters = CHARACTERS): string {
  let frame = "";
  for (let index = 0; index < text.length; index++) {
    const char = text.charAt(index);
    frame +=
      index < settled || /\s/.test(char)
        ? char
        : characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return frame;
}

const INTERACTIVE = "a[href],button,summary,label,[tabindex]";

/** Text that scrambles through random glyphs and resolves, on hover, focus, mount or view. */
export function ScrambleText({
  as: Component = "span",
  children,
  duration = 600,
  speed = 30,
  characters = CHARACTERS,
  trigger = "hover",
  font,
  className,
  ref,
  ...props
}: ScrambleTextProps) {
  const [display, setDisplay] = useState(children);
  const [running, setRunning] = useState(false);
  const node = useRef<HTMLElement | null>(null);
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = useCallback(() => {
    if (interval.current) clearInterval(interval.current);
    if (timeout.current) clearTimeout(timeout.current);
    interval.current = null;
    timeout.current = null;
  }, []);

  const settle = useCallback(() => {
    clear();
    setDisplay(children);
    setRunning(false);
  }, [children, clear]);

  const play = useCallback(() => {
    clear();
    if (reducedMotion() || duration <= 0) {
      setDisplay(children);
      return;
    }
    const started = Date.now();
    setRunning(true);
    setDisplay(scrambleFrame(children, 0, characters));
    interval.current = setInterval(
      () => {
        const progress = Math.min((Date.now() - started) / duration, 1);
        setDisplay(scrambleFrame(children, Math.floor(progress * children.length), characters));
      },
      Math.max(speed, 1),
    );
    timeout.current = setTimeout(settle, duration);
  }, [characters, children, clear, duration, settle, speed]);

  // A new string replaces whatever frame was showing: stop during render, and
  // clear the old string's timers when it goes (and on unmount).
  const [scrambling, setScrambling] = useState(children);
  if (scrambling !== children) {
    setScrambling(children);
    setRunning(false);
  }
  useEffect(() => clear, [children, clear]);

  // Hover and keyboard focus, on the text or on the control that wraps it.
  useEffect(() => {
    const element = node.current;
    if (!element) return;
    const target = element.closest<HTMLElement>(INTERACTIVE) ?? element;
    const hoverCapable =
      typeof window.matchMedia !== "function" ||
      window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    const onEnter = (event: PointerEvent) => {
      if (event.pointerType !== "touch" && hoverCapable) play();
    };
    // Keyboard focus only: a tap or click focuses too, and a scramble on tap is
    // a glitch. Focus that follows a press came from the pointer.
    let pressed = false;
    const onPress = () => {
      pressed = true;
    };
    const onFocus = () => {
      if (!pressed) play();
      pressed = false;
    };

    target.addEventListener("pointerdown", onPress);
    target.addEventListener("pointerenter", onEnter);
    target.addEventListener("pointerleave", settle);
    target.addEventListener("focusin", onFocus);
    target.addEventListener("focusout", settle);
    return () => {
      target.removeEventListener("pointerdown", onPress);
      target.removeEventListener("pointerenter", onEnter);
      target.removeEventListener("pointerleave", settle);
      target.removeEventListener("focusin", onFocus);
      target.removeEventListener("focusout", settle);
    };
  }, [play, settle]);

  // The latest `play`, for the one-shot triggers below, which should not
  // replay just because the string or timing props changed.
  const latestPlay = useRef(play);
  useEffect(() => {
    latestPlay.current = play;
  }, [play]);

  // Mount and in-view play once by themselves.
  useEffect(() => {
    const element = node.current;
    if (trigger === "hover" || !element) return;
    if (trigger === "mount" || typeof IntersectionObserver !== "function") {
      latestPlay.current();
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect();
        latestPlay.current();
      }
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [trigger]);

  const setRef = useCallback(
    (element: HTMLElement | null) => {
      node.current = element;
      if (typeof ref === "function") ref(element);
      else if (ref) ref.current = element;
    },
    [ref],
  );

  return (
    <Component
      ref={setRef}
      data-slot="scramble-text"
      data-state={running ? "scrambling" : "idle"}
      className={cn(scrambleTextVariants({ font }), className)}
      {...props}
    >
      <span data-slot="scramble-text-glyphs" aria-hidden="true">
        {running ? display : children}
      </span>
      <span className="sr-only">{children}</span>
    </Component>
  );
}

export { scrambleTextVariants };
