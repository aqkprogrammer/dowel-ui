"use client";

// Ported from SmoothUI Typewriter Text (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import { cva, type VariantProps } from "class-variance-authority";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
  type ComponentPropsWithRef,
  type Ref,
} from "react";

import { cn } from "@/lib/utils";

/*
 * Types a string a character at a time behind a blinking caret.
 *
 * - One string types once, or with `loop` clears and retypes after a pause —
 *   the source's behaviour, at its defaults (50ms a character, 1s pause). A
 *   list of strings types each one, holds it, deletes it and moves on: the
 *   rotating-headline form the source's `loop` implies.
 * - The untyped remainder is rendered, invisible, after the caret. The line
 *   reserves its full width and height from the first frame, so the page does
 *   not reflow a character at a time.
 * - The server renders the finished text, so the markup is legible without
 *   JavaScript; typing starts from empty before the first paint on the client.
 * - The whole string sits in an sr-only copy and the typed glyphs are
 *   aria-hidden, so a screen reader reads the text once, never per character.
 * - Under reduced motion the full text shows immediately and nothing cycles.
 *   The caret reuses the theme's `animate-caret`, which the reduced-motion
 *   blanket stops.
 */

/** Elements text effects render as. They are all phrasing or heading content. */
export type TypewriterTextElement =
  "span" | "p" | "div" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

const typewriterTextVariants = cva(
  "ms-px inline-block h-[1em] w-0.5 translate-y-[0.1em] bg-current align-baseline",
  {
    variants: {
      /** `bar` is a thin vertical caret, `block` a character-wide cell, `none` hides it. */
      caret: {
        bar: "animate-caret",
        block: "w-[0.55em] animate-caret opacity-70",
        none: "hidden",
      },
    },
    defaultVariants: {
      caret: "bar",
    },
  },
);

export interface TypewriterTextProps
  extends
    Omit<ComponentPropsWithRef<"span">, "ref" | "children">,
    VariantProps<typeof typewriterTextVariants> {
  ref?: Ref<HTMLElement>;
  /** One string to type, or a list to type, delete and cycle through. */
  children: string | readonly string[];
  /** The element to render. */
  as?: TypewriterTextElement;
  /** Milliseconds per typed character. */
  speed?: number;
  /** Milliseconds per deleted character, for a list. Defaults to half of `speed`. */
  deleteSpeed?: number;
  /** Milliseconds a finished string holds before it restarts or is deleted. */
  pause?: number;
  /**
   * Keep going. A single string clears and retypes; a list cycles back to its
   * first item. Defaults to `false` for a string and `true` for a list.
   */
  loop?: boolean;
  /** Milliseconds before typing starts. */
  startDelay?: number;
}

function reducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

// Layout effect on the client, so typing starts from empty before first paint;
// a plain effect on the server, where neither runs.
const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

interface Cursor {
  /** Which string is showing. */
  item: number;
  /** How many of its characters are typed. */
  typed: number;
}

/** Types text behind a caret, once, in a loop, or cycling through a list. */
export function TypewriterText({
  as: Component = "span",
  children,
  speed = 50,
  deleteSpeed,
  pause = 1000,
  loop,
  startDelay = 0,
  caret,
  className,
  ref,
  ...props
}: TypewriterTextProps) {
  const items: readonly string[] = typeof children === "string" ? [children] : children;
  const isList = typeof children !== "string";
  const repeats = loop ?? isList;
  // A stable key for the effect: the strings themselves, not the array identity.
  const key = JSON.stringify(items);

  // Finished text first, for the server and for reduced motion.
  const [cursor, setCursor] = useState<Cursor>(() => ({
    item: 0,
    typed: items[0]?.length ?? 0,
  }));

  useIsomorphicLayoutEffect(() => {
    const strings = JSON.parse(key) as string[];
    const first = strings[0] ?? "";
    if (reducedMotion()) {
      setCursor({ item: 0, typed: first.length });
      return;
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    let item = 0;
    let typed = 0;
    let deleting = false;
    setCursor({ item, typed });

    const tick = () => {
      const text = strings[item] ?? "";
      if (!deleting && typed < text.length) {
        typed += 1;
        setCursor({ item, typed });
        timer = setTimeout(tick, typed < text.length ? speed : pause);
        return;
      }
      // The string is complete.
      if (!deleting) {
        if (strings.length > 1) {
          const last = item === strings.length - 1;
          if (last && !repeats) return;
          deleting = true;
          tick();
          return;
        }
        if (!repeats) return;
        // A single string clears at once and retypes, as the source did.
        typed = 0;
        tick();
        return;
      }
      if (typed > 0) {
        typed -= 1;
        setCursor({ item, typed });
        timer = setTimeout(tick, deleteSpeed ?? speed / 2);
        return;
      }
      deleting = false;
      item = (item + 1) % strings.length;
      timer = setTimeout(tick, speed);
    };

    // The first character lands at once, as in the source, unless delayed.
    if (startDelay > 0) timer = setTimeout(tick, startDelay);
    else tick();
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [key, speed, deleteSpeed, pause, repeats, startDelay]);

  // Accepts a ref to any of the `as` elements.
  const setRef = useCallback(
    (element: HTMLElement | null) => {
      if (typeof ref === "function") ref(element);
      else if (ref) ref.current = element;
    },
    [ref],
  );

  const current = items[cursor.item] ?? "";
  const shown = current.slice(0, cursor.typed);
  const rest = current.slice(cursor.typed);

  return (
    <Component
      ref={setRef}
      data-slot="typewriter-text"
      data-state={cursor.typed >= current.length ? "complete" : "typing"}
      className={cn(className)}
      {...props}
    >
      <span data-slot="typewriter-text-typed" aria-hidden="true">
        {shown}
        <span data-slot="typewriter-text-caret" className={typewriterTextVariants({ caret })} />
        <span data-slot="typewriter-text-rest" className="invisible">
          {rest}
        </span>
      </span>
      <span className="sr-only">{isList ? items.join(", ") : current}</span>
    </Component>
  );
}

export { typewriterTextVariants };
