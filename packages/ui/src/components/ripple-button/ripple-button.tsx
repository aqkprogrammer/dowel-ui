"use client";

// Original design (pattern inspired by Animate UI Ripple Button; no code referenced).
import { cva, type VariantProps } from "class-variance-authority";
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

import { Button, type ButtonProps } from "@/components/button";
import { cn } from "@/lib/utils";

/*
 * A Button that answers every press with a ripple.
 *
 * Each pointerdown drops a circle where the pointer landed, sized to reach the
 * farthest corner, so the wave always covers the whole surface however
 * off-centre the press. Presses stack: every ripple is its own element with
 * its own animation, so a quick double-tap shows two rings travelling out.
 * Enter and Space ripple from the centre, so a keyboard press gets the same
 * answer as a click. The Button underneath still provides the press scale,
 * the loading state and every variant.
 *
 * Ripples are aria-hidden spans that remove themselves on animationend. Under
 * reduced motion the blanket collapses the keyframe to an instant, so they
 * appear and are gone in the same frame; a timer removes any that never get
 * an animationend (jsdom, a display:none ancestor).
 *
 * The ripple's colour is `rippleTone`: `auto` uses the label colour, which is
 * right on every Button variant; the others pick a token.
 */

const PREFIX = "dowel-ripple-button";

/** How long a ripple may live without reporting animationend. A behaviour timer, not a duration. */
const RIPPLE_FALLBACK_MS = 2000;

const TONE = "--ripple-button-tone";

const STYLES = `
@keyframes ${PREFIX}-wave{0%{scale:0;opacity:.38}40%{opacity:.3}100%{scale:1;opacity:0}}
[data-slot=ripple-button-ripple]{background:radial-gradient(closest-side,var(${TONE},currentColor) 64%,transparent);animation:${PREFIX}-wave calc(680ms * var(--motion-scale, 1)) var(--ease-out-quint) forwards}
`;

const rippleButtonVariants = cva("relative isolate overflow-hidden", {
  variants: {
    /** The ripple's colour. `auto` follows the label, which suits every Button variant. */
    rippleTone: {
      auto: `[${TONE}:currentColor]`,
      primary: `[${TONE}:var(--color-primary)]`,
      "primary-foreground": `[${TONE}:var(--color-primary-foreground)]`,
      foreground: `[${TONE}:var(--color-foreground)]`,
      background: `[${TONE}:var(--color-background)]`,
      success: `[${TONE}:var(--color-success)]`,
      destructive: `[${TONE}:var(--color-destructive)]`,
    },
  },
  defaultVariants: {
    rippleTone: "auto",
  },
});

interface Ripple {
  id: number;
  x: number;
  y: number;
  radius: number;
}

export interface RippleButtonProps
  extends Omit<ButtonProps, "asChild">, VariantProps<typeof rippleButtonVariants> {}

/** A Button whose every press sends a ripple out from where it landed. */
export function RippleButton({
  className,
  rippleTone,
  children,
  disabled,
  loading = false,
  onPointerDown,
  onKeyDown,
  ...props
}: RippleButtonProps) {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of pending.values()) clearTimeout(timer);
      pending.clear();
    };
  }, []);

  function remove(id: number) {
    const timer = timers.current.get(id);
    if (timer !== undefined) clearTimeout(timer);
    timers.current.delete(id);
    setRipples((current) => current.filter((ripple) => ripple.id !== id));
  }

  /** Spawns a ripple at a point in viewport coordinates, or at the button's centre without one. */
  function spawn(button: HTMLButtonElement, clientX?: number, clientY?: number) {
    if (disabled || loading) return;
    const rect = button.getBoundingClientRect();
    const x = clientX === undefined ? rect.width / 2 : clientX - rect.left;
    const y = clientY === undefined ? rect.height / 2 : clientY - rect.top;
    // Far enough to reach the farthest corner from where it starts.
    const radius = Math.max(
      Math.hypot(x, y),
      Math.hypot(rect.width - x, y),
      Math.hypot(x, rect.height - y),
      Math.hypot(rect.width - x, rect.height - y),
    );
    const id = nextId.current++;
    setRipples((current) => [...current, { id, x, y, radius }]);
    timers.current.set(
      id,
      setTimeout(() => {
        remove(id);
      }, RIPPLE_FALLBACK_MS),
    );
  }

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>) {
    onPointerDown?.(event);
    if (event.defaultPrevented || event.button !== 0) return;
    spawn(event.currentTarget, event.clientX, event.clientY);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    onKeyDown?.(event);
    if (event.defaultPrevented || event.repeat) return;
    if (event.key === "Enter" || event.key === " ") spawn(event.currentTarget);
  }

  return (
    <Button
      data-slot="ripple-button"
      disabled={disabled}
      loading={loading}
      className={cn(rippleButtonVariants({ rippleTone }), className)}
      onPointerDown={handlePointerDown}
      onKeyDown={handleKeyDown}
      {...props}
    >
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      {children}
      <span
        data-slot="ripple-button-ripples"
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
      >
        {ripples.map((ripple) => (
          <span
            key={ripple.id}
            data-slot="ripple-button-ripple"
            className="absolute block rounded-full"
            style={{
              // Pointer coordinates are physical, so the ripple is placed physically.
              left: ripple.x - ripple.radius,
              top: ripple.y - ripple.radius,
              width: ripple.radius * 2,
              height: ripple.radius * 2,
            }}
            onAnimationEnd={() => {
              remove(ripple.id);
            }}
          />
        ))}
      </span>
    </Button>
  );
}

export { rippleButtonVariants };
