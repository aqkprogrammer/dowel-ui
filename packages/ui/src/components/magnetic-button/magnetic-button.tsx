"use client";

// Ported from SmoothUI Magnetic Button (MIT, © 2024 Eduardo Calvo) and amicro "Magnetic Field" (MIT, © 2026 Syed Subhan Uddin). See THIRD_PARTY_NOTICES.md.
import { useCallback, useEffect, useRef, type PointerEvent, type Ref } from "react";

import { Button, type ButtonProps } from "@/components/button";
import { cn } from "@/lib/utils";

/*
 * Both sources animate the offset with a JavaScript spring. Here the offset is
 * written straight to the element's style from pointermove — no React state,
 * so no re-render per move — and CSS transitions do the easing: a quick
 * ease-out while following, an overshooting ease on release, which is what the
 * springs were for.
 *
 * The transition lists name transform first so it can take its own timing:
 * colours keep Button's fast ease, only the drift gets the slow overshoot.
 */

// Spelled out in full: Tailwind finds classes by scanning source text, so a
// class assembled from template pieces would never be generated.
const drift = cn(
  "group/magnetic",
  "transition-[transform,background-color,border-color,color,box-shadow]",
  "duration-[var(--duration-slow),var(--duration-fast),var(--duration-fast),var(--duration-fast),var(--duration-fast)]",
  "ease-[var(--ease-overshoot),var(--ease-out-quint),var(--ease-out-quint),var(--ease-out-quint),var(--ease-out-quint)]",
  "data-[magnetic=follow]:duration-[var(--duration-fast)] data-[magnetic=follow]:ease-[var(--ease-out-quint)]",
);

const contentDrift = cn(
  "inline-flex items-center justify-center gap-[inherit]",
  "transition-transform duration-[var(--duration-slow)] ease-[var(--ease-overshoot)]",
  "group-data-[magnetic=follow]/magnetic:duration-[var(--duration-fast)] group-data-[magnetic=follow]/magnetic:ease-[var(--ease-out-quint)]",
);

/** Pointers the effect never runs for: touch has no hover to follow. */
function motionAllowed(pointerType: string): boolean {
  if (pointerType === "touch") return false;
  if (typeof window.matchMedia !== "function") return true;
  return !(
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    window.matchMedia("(pointer: coarse)").matches
  );
}

function assignRef<T>(ref: Ref<T> | undefined, node: T | null) {
  if (typeof ref === "function") ref(node);
  else if (ref) ref.current = node;
}

function translate(x: number, y: number): string {
  return x === 0 && y === 0 ? "" : `translate3d(${String(x)}px, ${String(y)}px, 0)`;
}

export interface MagneticButtonProps extends ButtonProps {
  /**
   * How far the button drifts toward the pointer, as a fraction of the
   * pointer's distance from its centre. 0 turns the effect off.
   */
  strength?: number;
  /**
   * The content's total pull, for a layered effect. Set it above `strength`
   * and the label leans further than the button around it. Ignored with
   * `asChild`, whose single child cannot be wrapped.
   */
  contentStrength?: number;
  /**
   * How far beyond its edges, in pixels, the button starts to feel the
   * pointer. The pull fades to nothing at this distance. 0 (the default) keeps
   * the effect within the button's own bounds.
   */
  radius?: number;
}

/**
 * A button that drifts toward the pointer and springs back when it leaves.
 *
 * Purely decorative: it never moves for touch, coarse pointers, or users who
 * prefer reduced motion, and a disabled or loading button stays put.
 */
export function MagneticButton({
  className,
  strength = 0.35,
  contentStrength,
  radius = 0,
  asChild = false,
  disabled,
  loading,
  children,
  ref,
  onPointerMove,
  onPointerLeave,
  ...props
}: MagneticButtonProps) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const contentRef = useRef<HTMLSpanElement | null>(null);
  const offset = useRef({ x: 0, y: 0 });
  const layered = contentStrength !== undefined && !asChild;
  const inert = Boolean(disabled) || Boolean(loading) || strength === 0;

  const setRef = useCallback(
    (node: HTMLButtonElement | null) => {
      buttonRef.current = node;
      assignRef(ref, node);
    },
    [ref],
  );

  const place = useCallback(
    (x: number, y: number, following: boolean) => {
      const element = buttonRef.current;
      if (!element) return;
      offset.current = { x, y };
      element.dataset.magnetic = following ? "follow" : "rest";
      element.style.transform = translate(x, y);
      if (contentRef.current && contentStrength !== undefined && strength !== 0) {
        const extra = contentStrength / strength - 1;
        contentRef.current.style.transform = translate(x * extra, y * extra);
      }
    },
    [contentStrength, strength],
  );

  const release = useCallback(() => {
    if (offset.current.x !== 0 || offset.current.y !== 0) place(0, 0, false);
  }, [place]);

  const pull = useCallback(
    (clientX: number, clientY: number, pointerType: string) => {
      const element = buttonRef.current;
      if (!element || inert || !motionAllowed(pointerType)) {
        release();
        return;
      }

      // Measure where the button sits at rest, not where it has drifted to,
      // or it would chase its own displacement.
      const rect = element.getBoundingClientRect();
      const halfWidth = rect.width / 2;
      const halfHeight = rect.height / 2;
      const dx = clientX - (rect.left - offset.current.x + halfWidth);
      const dy = clientY - (rect.top - offset.current.y + halfHeight);

      let factor = 1;
      if (radius > 0) {
        const outside = Math.hypot(
          Math.max(0, Math.abs(dx) - halfWidth),
          Math.max(0, Math.abs(dy) - halfHeight),
        );
        if (outside >= radius) {
          release();
          return;
        }
        factor = 1 - outside / radius;
      }

      place(dx * strength * factor, dy * strength * factor, true);
    },
    [inert, place, radius, release, strength],
  );

  // Beyond the bounds, the pointer is not over the button, so its own events
  // cannot see it. A passive window listener can, without widening the hit
  // area over neighbouring controls the way a padded wrapper would.
  useEffect(() => {
    if (radius <= 0) return;
    const onMove = (event: globalThis.PointerEvent) => {
      pull(event.clientX, event.clientY, event.pointerType);
    };
    const root = document.documentElement;
    window.addEventListener("pointermove", onMove, { passive: true });
    root.addEventListener("pointerleave", release);
    window.addEventListener("blur", release);
    return () => {
      window.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", release);
      window.removeEventListener("blur", release);
    };
  }, [pull, radius, release]);

  // Becoming disabled mid-drift should not leave the button stranded.
  useEffect(() => {
    if (inert) release();
  }, [inert, release]);

  function handlePointerMove(event: PointerEvent<HTMLButtonElement>) {
    onPointerMove?.(event);
    if (radius <= 0) pull(event.clientX, event.clientY, event.pointerType);
  }

  function handlePointerLeave(event: PointerEvent<HTMLButtonElement>) {
    onPointerLeave?.(event);
    if (radius <= 0) release();
  }

  return (
    <Button
      ref={setRef}
      data-slot="magnetic-button"
      data-magnetic="rest"
      asChild={asChild}
      disabled={disabled}
      loading={loading}
      className={cn(drift, className)}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      {...props}
    >
      {layered ? (
        <span ref={contentRef} data-slot="magnetic-button-content" className={contentDrift}>
          {children}
        </span>
      ) : (
        children
      )}
    </Button>
  );
}
