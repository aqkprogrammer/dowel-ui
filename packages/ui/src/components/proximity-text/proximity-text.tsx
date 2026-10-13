"use client";

// Original design.
import {
  useCallback,
  useEffect,
  useRef,
  type ComponentPropsWithRef,
  type CSSProperties,
  type ElementType,
} from "react";

import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

/*
 * Text whose letters swell toward the pointer: the nearer each letter, the
 * larger, heavier (on a variable font) and more strongly tinted it becomes.
 *
 * It listens on its parent by default, so the whole section around the text
 * is live, not just the text's own small box. Letter positions are measured
 * when the pointer comes in and when the page scrolls or resizes, never per
 * move; each frame writes one custom property per letter and CSS does the
 * rest. The real text is a visually hidden copy, the letters aria-hidden. Off
 * for touch and under reduced motion, where it is plain text.
 */

/** How strongly a letter `distance` pixels from the pointer responds, 0–1, gone at `radius`. */
export function proximityStrength(distance: number, radius: number): number {
  if (radius <= 0 || distance >= radius) return 0;
  const t = 1 - distance / radius;
  return t * t;
}

/** Elements proximity text renders as. */
export type ProximityTextElement = "span" | "p" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

export interface ProximityTextProps extends Omit<ComponentPropsWithRef<"span">, "children"> {
  /** The text. Plain text: it is split into letters. */
  children: string;
  /** The element to render. Default "span". */
  as?: ProximityTextElement;
  /** How far the pointer's pull reaches, in pixels. Default 120. */
  radius?: number;
  /** Size of the nearest letter, as a multiple. Default 1.35. */
  scale?: number;
  /** Weight the nearest letter reaches, 100–900 (smoothly on a variable font). Default 800. */
  weight?: number;
  /** Colour the nearest letter takes: a token or CSS colour. Default "primary". */
  accent?: string;
  /** Where to listen for the pointer: this text alone, or its parent. Default "parent". */
  scope?: "self" | "parent";
}

/** Letters that swell, thicken and tint toward the pointer. */
export function ProximityText({
  children,
  as: Component = "span",
  radius = 120,
  scale = 1.35,
  weight = 800,
  accent = "primary",
  scope = "parent",
  className,
  style,
  ref,
  ...props
}: ProximityTextProps) {
  const Element = Component as ElementType;
  const reduced = useReducedMotion();
  const root = useRef<HTMLElement | null>(null);
  const letters = Array.from(children);

  const setRefs = useCallback(
    (node: HTMLElement | null) => {
      root.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  useEffect(() => {
    const element = root.current;
    const target = scope === "parent" ? element?.parentElement : element;
    if (!element || !target || reduced) return;
    const glyphs = Array.from(
      element.querySelectorAll<HTMLElement>("[data-slot=proximity-text-letter]"),
    );
    // The resting weight is whatever the text already has: a bold heading stays bold.
    element.style.setProperty(
      "--proximity-base",
      getComputedStyle(element).fontWeight || "400",
    );
    let centres: { x: number; y: number }[] = [];
    let pointer: { x: number; y: number } | null = null;
    let frame = 0;

    const measure = () => {
      centres = glyphs.map((glyph) => {
        const box = glyph.getBoundingClientRect();
        return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
      });
    };
    const paint = () => {
      frame = 0;
      glyphs.forEach((glyph, index) => {
        const centre = centres[index];
        const strength =
          pointer && centre
            ? proximityStrength(Math.hypot(pointer.x - centre.x, pointer.y - centre.y), radius)
            : 0;
        glyph.style.setProperty("--proximity", strength.toFixed(3));
      });
    };
    const request = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const onEnter = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      measure();
    };
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      if (centres.length === 0) measure();
      pointer = { x: event.clientX, y: event.clientY };
      request();
    };
    const onLeave = () => {
      pointer = null;
      request();
    };
    const invalidate = () => {
      centres = [];
    };

    target.addEventListener("pointerenter", onEnter);
    target.addEventListener("pointermove", onMove);
    target.addEventListener("pointerleave", onLeave);
    window.addEventListener("scroll", invalidate, { passive: true });
    window.addEventListener("resize", invalidate, { passive: true });
    return () => {
      target.removeEventListener("pointerenter", onEnter);
      target.removeEventListener("pointermove", onMove);
      target.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("scroll", invalidate);
      window.removeEventListener("resize", invalidate);
      if (frame) cancelAnimationFrame(frame);
      for (const glyph of glyphs) glyph.style.removeProperty("--proximity");
      element.style.removeProperty("--proximity-base");
    };
  }, [scope, reduced, radius, children]);

  const tint = /^[a-z][a-z0-9-]*$/.test(accent) ? `var(--color-${accent})` : accent;

  return (
    <Element
      ref={setRefs}
      data-slot="proximity-text"
      className={cn("inline-block", className)}
      style={
        {
          "--proximity-scale": String(Math.max(1, scale) - 1),
          "--proximity-weight": String(Math.min(900, Math.max(100, weight))),
          "--proximity-accent": tint,
          ...style,
        } as CSSProperties
      }
      {...props}
    >
      <span className="sr-only">{children}</span>
      <span aria-hidden="true" className="inline-flex">
        {letters.map((letter, index) => (
          <span
            key={index}
            data-slot="proximity-text-letter"
            className={cn(
              "inline-block origin-bottom",
              "[scale:calc(1+var(--proximity,0)*var(--proximity-scale))]",
              "[color:color-mix(in_oklab,var(--proximity-accent)_calc(var(--proximity,0)*100%),currentColor)]",
              // From the text's own weight toward `weight`; until it is read,
              // the calc is invalid and the letter keeps the weight it inherits.
              "[font-weight:calc(var(--proximity-base)+var(--proximity,0)*(var(--proximity-weight)-var(--proximity-base)))]",
              "transition-[scale,color] duration-(--duration-fast) ease-(--ease-out-quint)",
            )}
          >
            {letter === " " ? " " : letter}
          </span>
        ))}
      </span>
    </Element>
  );
}
