"use client";

// Ported from bencho Liquid toggle (MIT, © 2026 Lorenzo Cabra). See THIRD_PARTY_NOTICES.md.
import { cva, type VariantProps } from "class-variance-authority";
import {
  MotionConfig,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  useVelocity,
  type MotionStyle,
} from "motion/react";
import { Switch as SwitchPrimitive } from "radix-ui";
import {
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type MouseEvent,
  type PointerEvent,
} from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A switch whose knob behaves like a droplet: it stretches along its travel
 * and squashes across it in proportion to its speed.
 *
 * Built on the Radix switch primitive, like Dowel's Switch, so it has the
 * switch role, Space/Enter, a native click, and a hidden input inside forms.
 * Dowel's Switch cannot take this knob — its thumb is fixed — so this composes
 * the same primitive instead.
 *
 * `motion` is used for one thing CSS cannot do: the knob can be dragged, and on
 * release its spring has to carry the drag's velocity, and the squash is read
 * off that velocity every frame. The knob's position is a single 0–1 value
 * written to a CSS variable; logical `start` and an RTL-negated translate make
 * "on" the inline end in both directions. Under reduced motion the knob jumps
 * and never deforms.
 */

const liquidToggleVariants = cva(
  cn(
    "relative inline-flex shrink-0 touch-none items-center rounded-full select-none",
    "bg-card data-[state=checked]:bg-foreground",
    "transition-[background-color,box-shadow] duration-[var(--duration-slow)] ease-[var(--ease-out-quint)]",
    "disabled:cursor-not-allowed disabled:opacity-55",
    focusRing,
  ),
  {
    variants: {
      size: {
        sm: "h-6 w-11 [--liquid-toggle-inset:0.1875rem] [--liquid-toggle-knob:1.125rem] [--liquid-toggle-travel:1.25rem]",
        md: "h-[2.875rem] w-[5.75rem] [--liquid-toggle-inset:0.3125rem] [--liquid-toggle-knob:2.25rem] [--liquid-toggle-travel:2.875rem]",
      },
      /** A hairline ring on the track — the source's Stroke switch. */
      stroke: {
        true: "shadow-[inset_0_0_0_1px_var(--color-border)] data-[state=checked]:shadow-none",
        false: "",
      },
    },
    defaultVariants: { size: "md", stroke: true },
  },
);

export interface LiquidToggleProps
  extends
    Omit<ComponentPropsWithRef<typeof SwitchPrimitive.Root>, "children">,
    VariantProps<typeof liquidToggleVariants> {
  /** Spring stiffness, 0–100: how quickly the knob crosses. */
  speed?: number;
  /** Velocity squash and stretch, 0–100. 0 keeps the knob a rigid circle. */
  stretch?: number;
}

/** Pixels the pointer must travel before a press becomes a drag. */
const DRAG_SLOP = 3;

/** A droplet switch: the knob stretches with its speed and can be dragged across. */
export function LiquidToggle({
  className,
  size,
  stroke,
  speed = 50,
  stretch = 36,
  checked: checkedProp,
  defaultChecked = false,
  onCheckedChange,
  disabled,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onClick,
  ...props
}: LiquidToggleProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultChecked);
  const checked = checkedProp ?? uncontrolled;
  const reduced = useReducedMotion() ?? false;
  const knobRef = useRef<HTMLSpanElement | null>(null);
  const drag = useRef<{ id: number; x: number; from: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);

  const position = useMotionValue(checked ? 1 : 0);
  const velocity = useVelocity(position);
  const gain = (stretch / 36) * 0.016;
  const limit = 1 + (stretch / 100) * 0.4;
  const scaleX = useTransform(velocity, (v) =>
    reduced ? 1 : Math.min(limit, 1 + Math.abs(v) * gain),
  );
  const scaleY = useTransform(scaleX, (x) => 2 - x);

  const stiffness = 150 + speed * 4;
  const damping = 2 * Math.sqrt(stiffness) * 0.85;

  function settle(target: number) {
    if (reduced) {
      position.jump(target);
      return;
    }
    void animate(position, target, {
      type: "spring",
      stiffness,
      damping,
      velocity: position.getVelocity(),
    });
  }

  // Any change of state — click, key, drag release or the controlled prop —
  // springs the knob to its side, carrying whatever velocity it already has.
  useEffect(() => {
    if (drag.current) return;
    const target = checked ? 1 : 0;
    if (position.get() === target) return;
    if (reduced) {
      position.jump(target);
      return;
    }
    const controls = animate(position, target, {
      type: "spring",
      stiffness,
      damping,
      velocity: position.getVelocity(),
    });
    return () => {
      controls.stop();
    };
  }, [checked, reduced, stiffness, damping, position]);

  function setChecked(next: boolean) {
    if (checkedProp === undefined) setUncontrolled(next);
    onCheckedChange?.(next);
  }

  /** Pixels of travel between the two sides, measured from the rendered track. */
  function travel(track: HTMLElement, rtl: boolean): number {
    const knob = knobRef.current;
    if (!knob) return 0;
    const width = track.clientWidth;
    // offsetLeft ignores the translate, so it is the resting inset.
    const inset = rtl ? width - knob.offsetLeft - knob.offsetWidth : knob.offsetLeft;
    return width - knob.offsetWidth - 2 * inset;
  }

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>) {
    onPointerDown?.(event);
    if (disabled || event.button !== 0) return;
    drag.current = {
      id: event.pointerId,
      x: event.clientX,
      from: position.get(),
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent<HTMLButtonElement>) {
    onPointerMove?.(event);
    const current = drag.current;
    if (!current || current.id !== event.pointerId) return;
    const dx = event.clientX - current.x;
    if (!current.moved && Math.abs(dx) < DRAG_SLOP) return;
    current.moved = true;
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
    const distance = travel(event.currentTarget, rtl);
    if (distance <= 0) return;
    const next = current.from + (rtl ? -dx : dx) / distance;
    position.set(Math.min(1, Math.max(0, next)));
  }

  function release(event: PointerEvent<HTMLButtonElement>, cancelled: boolean) {
    const current = drag.current;
    if (!current || current.id !== event.pointerId) return;
    drag.current = null;
    if (!current.moved) return;
    // A drag is not a tap: the click that follows pointerup must not toggle.
    suppressClick.current = !cancelled;
    const next = position.get() >= 0.5;
    if (next === checked) settle(next ? 1 : 0);
    else setChecked(next);
  }

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    onClick?.(event);
    if (suppressClick.current) {
      suppressClick.current = false;
      event.preventDefault();
    }
  }

  return (
    <MotionConfig reducedMotion="user">
      <SwitchPrimitive.Root
        data-slot="liquid-toggle"
        checked={checked}
        onCheckedChange={setChecked}
        disabled={disabled}
        className={cn(liquidToggleVariants({ size, stroke }), className)}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={(event) => {
          onPointerUp?.(event);
          release(event, false);
        }}
        onPointerCancel={(event) => {
          onPointerCancel?.(event);
          release(event, true);
        }}
        onClick={handleClick}
        {...props}
      >
        <motion.span
          ref={knobRef}
          aria-hidden="true"
          data-slot="liquid-toggle-knob"
          data-state={checked ? "checked" : "unchecked"}
          className={cn(
            "pointer-events-none absolute start-[var(--liquid-toggle-inset)] top-1/2 size-[var(--liquid-toggle-knob)] rounded-full",
            "translate-x-[calc(var(--liquid-toggle-p)*var(--liquid-toggle-travel))] -translate-y-1/2",
            "rtl:translate-x-[calc(var(--liquid-toggle-p)*var(--liquid-toggle-travel)*-1)]",
            "bg-[color-mix(in_oklab,var(--color-foreground)_19%,var(--color-card))] data-[state=checked]:bg-card",
            "transition-[background-color] duration-[var(--duration-slow)]",
          )}
          style={{ scaleX, scaleY, ...({ "--liquid-toggle-p": position } as MotionStyle) }}
        />
      </SwitchPrimitive.Root>
    </MotionConfig>
  );
}

export { liquidToggleVariants };
