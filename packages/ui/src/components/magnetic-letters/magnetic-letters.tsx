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
 * Text whose letters are pulled toward the pointer, or pushed away from it,
 * and spring back home when it leaves.
 *
 * Letter centres are measured when the pointer comes in and after a scroll or
 * resize, never per move. Each frame writes three custom properties per letter
 * (an offset and a small turn); CSS does the moving, with an overshooting ease
 * so a released letter settles like a spring. The real text is a visually
 * hidden copy and the letters are aria-hidden. Mouse only, and off under
 * reduced motion, where it is plain text.
 */

/** Elements magnetic letters render as. */
export type MagneticLettersElement = "span" | "p" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

/**
 * How far a letter moves toward (or away from) the pointer, in pixels, along
 * each axis. Strongest near the letter and gone at `radius`.
 */
export function magneticOffset(
  dx: number,
  dy: number,
  radius: number,
  strength: number,
  mode: "attract" | "repel",
): { x: number; y: number } {
  const distance = Math.hypot(dx, dy);
  if (radius <= 0 || distance >= radius || distance === 0) return { x: 0, y: 0 };
  const pull = (1 - distance / radius) ** 2 * strength;
  const sign = mode === "attract" ? 1 : -1;
  return { x: (dx / distance) * pull * sign, y: (dy / distance) * pull * sign };
}

export interface MagneticLettersProps extends Omit<ComponentPropsWithRef<"span">, "children"> {
  /** The text. Plain text: it is split into letters. */
  children: string;
  /** The element to render. Default "span". */
  as?: MagneticLettersElement;
  /** Letters follow the pointer, or flee from it. Default "attract". */
  mode?: "attract" | "repel";
  /** The furthest a letter moves, in pixels. Default 14. */
  strength?: number;
  /** How far the pointer's pull reaches, in pixels. Default 140. */
  radius?: number;
  /** Where to listen for the pointer: this text alone, or its parent. Default "parent". */
  scope?: "self" | "parent";
}

/** Letters that lean toward the pointer, or away from it, and spring back. */
export function MagneticLetters({
  children,
  as: Component = "span",
  mode = "attract",
  strength = 14,
  radius = 140,
  scope = "parent",
  className,
  ref,
  ...props
}: MagneticLettersProps) {
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
      element.querySelectorAll<HTMLElement>("[data-slot=magnetic-letters-letter]"),
    );
    let centres: { x: number; y: number }[] = [];
    let pointer: { x: number; y: number } | null = null;
    let frame = 0;

    const measure = () => {
      centres = glyphs.map((glyph) => {
        // The resting position: the offset is a transform, so the box is read
        // without it to keep the pull from feeding back on itself.
        const box = glyph.getBoundingClientRect();
        const x = Number(glyph.style.getPropertyValue("--magnetic-x")) || 0;
        const y = Number(glyph.style.getPropertyValue("--magnetic-y")) || 0;
        return { x: box.left + box.width / 2 - x, y: box.top + box.height / 2 - y };
      });
    };
    const paint = () => {
      frame = 0;
      glyphs.forEach((glyph, index) => {
        const centre = centres[index];
        const offset =
          pointer && centre
            ? magneticOffset(pointer.x - centre.x, pointer.y - centre.y, radius, strength, mode)
            : { x: 0, y: 0 };
        glyph.style.setProperty("--magnetic-x", offset.x.toFixed(2));
        glyph.style.setProperty("--magnetic-y", offset.y.toFixed(2));
        // A small turn in the direction of travel.
        glyph.style.setProperty("--magnetic-turn", (offset.x * 0.8).toFixed(2));
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
      for (const glyph of glyphs) {
        glyph.style.removeProperty("--magnetic-x");
        glyph.style.removeProperty("--magnetic-y");
        glyph.style.removeProperty("--magnetic-turn");
      }
    };
  }, [scope, reduced, radius, strength, mode, children]);

  return (
    <Element
      ref={setRefs}
      data-slot="magnetic-letters"
      data-mode={mode}
      className={cn("inline-block", className)}
      {...props}
    >
      <span className="sr-only">{children}</span>
      <span aria-hidden="true" className="inline-flex">
        {letters.map((letter, index) => (
          <span
            key={index}
            data-slot="magnetic-letters-letter"
            style={{ "--magnetic-index": index } as CSSProperties}
            className={cn(
              "inline-block will-change-transform",
              "[translate:calc(var(--magnetic-x,0)*1px)_calc(var(--magnetic-y,0)*1px)]",
              "[rotate:calc(var(--magnetic-turn,0)*1deg)]",
              "transition-[translate,rotate] duration-(--duration-normal) ease-(--ease-overshoot)",
            )}
          >
            {letter === " " ? "\u00a0" : letter}
          </span>
        ))}
      </span>
    </Element>
  );
}
