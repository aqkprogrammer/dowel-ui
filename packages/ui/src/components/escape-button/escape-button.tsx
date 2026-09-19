"use client";

// Ported from bencho Escape button (MIT, © 2026 Lorenzo Cabra). See THIRD_PARTY_NOTICES.md.
import { cva, type VariantProps } from "class-variance-authority";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type MouseEvent,
  type ReactNode,
} from "react";

import { Button, type ButtonProps } from "@/components/button";
import { cn } from "@/lib/utils";

/*
 * A novelty button that scoots away from an approaching mouse, and gives up
 * after a few escapes.
 *
 * The game is for a mouse or pen only, and it is never in the way:
 *
 * - It never moves for touch, a coarse pointer, reduced motion, or while it has
 *   focus — so a keyboard user can always Tab to it and press it at once.
 * - It gives up after `patience` escapes: it returns home, reads "Fine." and
 *   stays put until it has been pressed.
 * - A press always goes through, in every state; the dodging is visual only.
 *
 * Like MagneticButton, the offset is written to the element's style from
 * pointermove (no re-render per move) and CSS transitions do the easing: a
 * quick ease-out while fleeing, a soft overshoot drifting home.
 */

const escapeButtonVariants = cva(
  cn(
    "h-14 rounded-full px-7.5 text-xl font-normal tracking-[-0.012em]",
    "bg-foreground/6 text-foreground/72 hover:bg-foreground/6 hover:text-foreground/90",
    "data-[caught]:text-foreground",
    "data-[done]:bg-foreground data-[done]:text-background data-[done]:hover:bg-foreground data-[done]:hover:text-background",
    "transition-[transform,background-color,color,scale]",
    "duration-[var(--duration-slower),var(--duration-fast),var(--duration-fast),var(--duration-fast)]",
    "ease-[var(--ease-overshoot),var(--ease-out-quint),var(--ease-out-quint),var(--ease-out-quint)]",
    "data-[escape=flee]:duration-[var(--duration-fast)] data-[escape=flee]:ease-[var(--ease-out-quint)]",
  ),
  {
    variants: {
      /** A hairline ring — the source's Stroke switch. */
      stroke: {
        true: "shadow-[inset_0_0_0_1px_var(--color-border)]",
        false: "",
      },
    },
    defaultVariants: { stroke: false },
  },
);

/** Pointers the game never runs for. */
function dodgeAllowed(pointerType: string): boolean {
  if (pointerType === "touch") return false;
  if (typeof window.matchMedia !== "function") return true;
  return !(
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    window.matchMedia("(pointer: coarse)").matches
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export interface EscapeButtonProps
  extends Omit<ButtonProps, "asChild" | "variant">, VariantProps<typeof escapeButtonVariants> {
  /** Escapes before it gives up and stays put. */
  patience?: number;
  /** How close, in pixels, the pointer gets before it flees. */
  radius?: number;
  /** Flee strength, 0–100. 0 turns the game off. */
  skittishness?: number;
  /** The label once it has given up. */
  caughtLabel?: ReactNode;
  /** Milliseconds the pressed state shows before the game resets. */
  resetAfter?: number;
}

/** A button that dodges an approaching mouse — until it gives up. */
export function EscapeButton({
  className,
  stroke,
  patience = 4,
  radius = 120,
  skittishness = 55,
  caughtLabel = "Fine.",
  resetAfter = 600,
  disabled,
  children = "Touch me",
  onClick,
  onFocus,
  onBlur,
  ref,
  ...props
}: EscapeButtonProps) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const offset = useRef({ x: 0, y: 0 });
  const near = useRef(false);
  const escapes = useRef(0);
  const focused = useRef(false);
  const [caught, setCaught] = useState(false);
  const [done, setDone] = useState(false);
  const inert = Boolean(disabled) || caught || done || skittishness <= 0;

  const place = useCallback((x: number, y: number, fleeing: boolean) => {
    const element = buttonRef.current;
    if (!element) return;
    offset.current = { x, y };
    element.dataset.escape = fleeing ? "flee" : "rest";
    element.style.transform =
      x === 0 && y === 0 ? "" : `translate(${String(x)}px, ${String(y)}px)`;
  }, []);

  const goHome = useCallback(() => {
    if (offset.current.x !== 0 || offset.current.y !== 0) place(0, 0, false);
  }, [place]);

  useEffect(() => {
    if (inert) {
      near.current = false;
      goHome();
      return;
    }

    function handleMove(event: PointerEvent) {
      const element = buttonRef.current;
      if (!element || focused.current || !dodgeAllowed(event.pointerType)) return;

      // Measure where it sits at rest, not where it has fled to, or it would
      // chase its own displacement.
      const rect = element.getBoundingClientRect();
      const restLeft = rect.left - offset.current.x;
      const restTop = rect.top - offset.current.y;
      const dx = restLeft + rect.width / 2 - event.clientX;
      const dy = restTop + rect.height / 2 - event.clientY;
      const distance = Math.hypot(dx, dy);

      if (distance >= radius) {
        if (near.current) {
          near.current = false;
          escapes.current += 1;
          if (escapes.current >= patience) setCaught(true);
        }
        goHome();
        return;
      }

      near.current = true;
      // The push grows steeply as the pointer closes in: ~14px at half the
      // radius, ~37px at a quarter, at the default strength.
      const closeness = 1 - distance / radius;
      const push = closeness ** 2.5 * radius * skittishness * 0.012;
      const unit = distance === 0 ? { x: 0, y: -1 } : { x: dx / distance, y: dy / distance };
      let x = unit.x * push;
      let y = unit.y * push;

      const field = element.parentElement?.getBoundingClientRect();
      if (field && field.width > 0 && field.height > 0) {
        x = clamp(x, field.left - restLeft, field.right - (restLeft + rect.width));
        y = clamp(y, field.top - restTop, field.bottom - (restTop + rect.height));
      }
      place(x, y, true);
    }

    window.addEventListener("pointermove", handleMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", handleMove);
    };
  }, [inert, radius, patience, skittishness, place, goHome]);

  useEffect(() => {
    if (!done) return;
    const timer = setTimeout(() => {
      escapes.current = 0;
      setDone(false);
      setCaught(false);
    }, resetAfter);
    return () => {
      clearTimeout(timer);
    };
  }, [done, resetAfter]);

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    onClick?.(event);
    if (event.defaultPrevented) return;
    setDone(true);
  }

  function handleFocus(event: FocusEvent<HTMLButtonElement>) {
    onFocus?.(event);
    // Focus pins it in place: whatever is focused must stay where it is.
    focused.current = true;
    goHome();
  }

  function handleBlur(event: FocusEvent<HTMLButtonElement>) {
    onBlur?.(event);
    focused.current = false;
  }

  return (
    <Button
      ref={(node) => {
        buttonRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      }}
      variant="ghost"
      data-slot="escape-button"
      data-escape="rest"
      data-caught={caught || undefined}
      data-done={done || undefined}
      disabled={disabled}
      className={cn(escapeButtonVariants({ stroke }), className)}
      onClick={handleClick}
      onFocus={handleFocus}
      onBlur={handleBlur}
      {...props}
    >
      {caught ? caughtLabel : children}
    </Button>
  );
}

export { escapeButtonVariants };
