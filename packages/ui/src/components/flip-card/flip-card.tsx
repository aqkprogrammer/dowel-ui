"use client";

// Original design (pattern inspired by Animate UI Flip Card; no code referenced).
import { cva, type VariantProps } from "class-variance-authority";
import {
  animate,
  MotionConfig,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type ValueAnimationTransition,
} from "motion/react";
import {
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from "react";

import { disabledStyles, focusRing, iconSlot } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A card with two faces that turns over in 3D.
 *
 * Three springs make it feel like an object rather than a texture swap:
 *
 * - Lean. While the pointer is over it, the card tips a few degrees toward the
 *   pointer — the side under the cursor comes up to meet it — on a soft spring,
 *   so the card is already "in hand" before it turns. The lean lives on its own
 *   wrapper in screen space, so it reads the same whichever face is showing.
 * - Turn. The faces share one grid cell (the card sizes to the taller face),
 *   the back pre-rotated 180°, inside a preserve-3d wrapper that springs
 *   between 0° and 180° around `axis`.
 * - Lift. Each turn plays a short lift alongside the spring: the card rises
 *   toward the viewer (translateZ and a touch of scale) to its peak at the
 *   half-way point, its shadow spreading beneath it, and a sheen sweeps across
 *   the surface in step with the rotation — over the front as it leaves and
 *   on over the back as it arrives, one continuous band of light.
 *
 * Nothing moves on first paint. Under reduced motion the card does not lean
 * or lift, and turning over is an instant swap.
 *
 * Semantics. Turning over is a toggle button in the corner (aria-pressed),
 * outside the 3D stack so it never rotates away from the user and never
 * becomes inert. The label stays the same in both states — "Show back",
 * pressed or not — because a toggle whose name changes with its state reads
 * as two different controls. The face that is turned away is `inert` and
 * aria-hidden, so its links and buttons cannot be reached, by Tab or by a
 * screen reader. `trigger="hover"` also turns the card while a mouse rests on
 * it; the button stays, so keyboard and touch users can still turn it.
 */

const flipCardVariants = cva(
  cn("group/flip-card relative isolate grid w-full perspective-[62.5rem]"),
  {
    variants: {
      /** Padding of each face, and the card's corner radius. */
      size: {
        sm: "rounded-lg text-sm [--flip-card-pad:1rem]",
        md: "rounded-xl text-sm [--flip-card-pad:1.5rem]",
        lg: "rounded-2xl text-base [--flip-card-pad:2rem]",
      },
    },
    defaultVariants: { size: "md" },
  },
);

const faceClass = cn(
  "relative col-start-1 row-start-1 overflow-hidden rounded-[inherit] backface-hidden",
  "border border-border bg-card p-(--flip-card-pad) text-card-foreground shadow-sm",
);

/** The turn: a little overshoot, settled well inside a second. */
const TURN = { type: "spring", stiffness: 170, damping: 19, mass: 1 } as const;
/** The lift peaks as the card passes edge-on, then sets it down. */
const LIFT: ValueAnimationTransition<number> = {
  duration: 0.62,
  times: [0, 0.45, 1],
  ease: [0.22, 1, 0.36, 1],
};
/** The lean chases the pointer gently, so small movements do not jitter. */
const LEAN = { stiffness: 220, damping: 22, mass: 0.6 };

function FlipIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}

export interface FlipCardProps
  extends
    Omit<ComponentPropsWithRef<"div">, "children">,
    VariantProps<typeof flipCardVariants> {
  /** The face shown at rest. */
  front: ReactNode;
  /** The face shown once turned over. */
  back: ReactNode;
  /** Controlled: whether the back is showing. */
  flipped?: boolean;
  /** Uncontrolled initial state. */
  defaultFlipped?: boolean;
  onFlippedChange?: (flipped: boolean) => void;
  /**
   * `click` turns the card only with its corner button. `hover` also turns it
   * while a mouse rests on it; the button stays for keyboard and touch.
   */
  trigger?: "click" | "hover";
  /** `y` turns like a page (left–right), `x` like a calendar (top–bottom). */
  axis?: "x" | "y";
  /** The largest lean toward the pointer, in degrees. 0 keeps the card flat. */
  lean?: number;
  /** The flip button's accessible name. It is a toggle, so the name stays the same when pressed. */
  flipLabel?: string;
  /** Hide the corner button. Only sensible with `trigger="hover"` and another way to toggle `flipped`. */
  hideButton?: boolean;
  /** Freezes the card on its current face. */
  disabled?: boolean;
  /** Classes for the front face. */
  frontClassName?: string;
  /** Classes for the back face. */
  backClassName?: string;
}

/** A two-faced card that leans toward the pointer and lifts as it turns over in 3D. */
export function FlipCard({
  className,
  size,
  front,
  back,
  flipped: flippedProp,
  defaultFlipped = false,
  onFlippedChange,
  trigger = "click",
  axis = "y",
  lean = 6,
  flipLabel = "Show back",
  hideButton = false,
  disabled = false,
  frontClassName,
  backClassName,
  onPointerEnter,
  onPointerMove,
  onPointerLeave,
  ...props
}: FlipCardProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultFlipped);
  const controlled = flippedProp !== undefined;
  const flipped = controlled ? flippedProp : uncontrolled;
  const reduced = useReducedMotion() ?? false;

  const target = flipped ? 180 : 0;
  const turn = useMotionValue(target);
  const lift = useMotionValue(0);
  const leanX = useSpring(0, LEAN);
  const leanY = useSpring(0, LEAN);

  const z = useTransform(lift, [0, 1], [0, 48]);
  const scale = useTransform(lift, [0, 1], [1, 1.04]);
  const shadowOpacity = useTransform(lift, [0, 1], [0, 0.9]);
  const shadowOffset = useTransform(lift, [0, 1], [0, 18]);
  // The front's sheen runs from off one edge to the middle while it is facing
  // the viewer; the back is mirrored, so its band runs the other way in its
  // own space and continues the same sweep on screen.
  const frontSheen = useTransform(turn, [0, 180], ["-110%", "110%"]);
  const backSheen = useTransform(turn, [0, 180], ["110%", "-110%"]);

  // Only a change animates: the first paint is placed, not played.
  const shown = useRef(target);
  useEffect(() => {
    if (shown.current === target) return;
    shown.current = target;
    if (reduced) {
      turn.jump(target);
      lift.jump(0);
      return;
    }
    const turning = animate(turn, target, TURN);
    const lifting = animate(lift, [0, 1, 0], LIFT);
    return () => {
      turning.stop();
      lifting.stop();
    };
  }, [target, reduced, turn, lift]);

  const leanAllowed = !disabled && !reduced && lean !== 0;

  function setFlipped(next: boolean) {
    if (disabled || next === flipped) return;
    if (!controlled) setUncontrolled(next);
    onFlippedChange?.(next);
  }

  function rest() {
    leanX.set(0);
    leanY.set(0);
  }

  function handlePointerEnter(event: PointerEvent<HTMLDivElement>) {
    onPointerEnter?.(event);
    if (trigger === "hover" && event.pointerType !== "touch") setFlipped(true);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    onPointerMove?.(event);
    if (!leanAllowed || event.pointerType === "touch") return;
    const box = event.currentTarget.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) return;
    const x = Math.min(1, Math.max(-1, ((event.clientX - box.left) / box.width) * 2 - 1));
    const y = Math.min(1, Math.max(-1, ((event.clientY - box.top) / box.height) * 2 - 1));
    // The side under the pointer rises toward it.
    leanX.set(y * lean);
    leanY.set(-x * lean);
  }

  function handlePointerLeave(event: PointerEvent<HTMLDivElement>) {
    onPointerLeave?.(event);
    rest();
    if (trigger === "hover" && event.pointerType !== "touch") setFlipped(false);
  }

  function handleToggle(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    setFlipped(!flipped);
  }

  const rotate = axis === "x" ? { rotateX: turn } : { rotateY: turn };
  const sweep = (value: typeof frontSheen) => (axis === "x" ? { y: value } : { x: value });
  const sheenBand =
    axis === "x"
      ? "bg-[linear-gradient(195deg,transparent_35%,color-mix(in_oklab,var(--color-background)_55%,transparent)_50%,transparent_65%)]"
      : "bg-[linear-gradient(105deg,transparent_35%,color-mix(in_oklab,var(--color-background)_55%,transparent)_50%,transparent_65%)]";
  const sheenClass = cn("pointer-events-none absolute -inset-px", sheenBand);

  return (
    <MotionConfig reducedMotion="user">
      <div
        data-slot="flip-card"
        data-state={flipped ? "back" : "front"}
        data-axis={axis}
        data-trigger={trigger}
        data-disabled={disabled ? "" : undefined}
        className={cn(flipCardVariants({ size }), className)}
        onPointerEnter={handlePointerEnter}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        {...props}
      >
        <motion.div
          data-slot="flip-card-lean"
          className="col-start-1 row-start-1 grid rounded-[inherit] transform-3d"
          style={{ rotateX: leanX, rotateY: leanY }}
        >
          <motion.span
            aria-hidden="true"
            data-slot="flip-card-shadow"
            className="pointer-events-none col-start-1 row-start-1 m-3 rounded-[inherit] bg-foreground/25 blur-xl"
            style={{ opacity: shadowOpacity, y: shadowOffset, z: -2 }}
          />
          <motion.div
            data-slot="flip-card-inner"
            className="col-start-1 row-start-1 grid rounded-[inherit] transform-3d"
            style={{ ...rotate, z, scale }}
          >
            <div
              data-slot="flip-card-front"
              inert={flipped}
              aria-hidden={flipped || undefined}
              className={cn(faceClass, frontClassName)}
            >
              {front}
              <motion.span
                aria-hidden="true"
                data-slot="flip-card-sheen"
                className={sheenClass}
                style={{ ...sweep(frontSheen), opacity: lift }}
              />
            </div>
            <div
              data-slot="flip-card-back"
              inert={!flipped}
              aria-hidden={!flipped || undefined}
              className={cn(
                faceClass,
                axis === "x" ? "rotate-x-180" : "rotate-y-180",
                backClassName,
              )}
            >
              {back}
              <motion.span
                aria-hidden="true"
                data-slot="flip-card-sheen"
                className={sheenClass}
                style={{ ...sweep(backSheen), opacity: lift }}
              />
            </div>
          </motion.div>
        </motion.div>
        {hideButton ? null : (
          <button
            type="button"
            data-slot="flip-card-button"
            aria-pressed={flipped}
            aria-label={flipLabel}
            disabled={disabled}
            className={cn(
              "absolute end-2 top-2 z-10 grid size-8 place-items-center rounded-full",
              "border border-border bg-background/80 text-muted-foreground shadow-sm backdrop-blur-sm",
              "transition-[color,background-color,scale,rotate] duration-[var(--duration-normal)] ease-[var(--ease-overshoot)]",
              "hover:bg-accent hover:text-accent-foreground motion-safe:hover:scale-110 motion-safe:active:scale-95",
              "motion-safe:aria-pressed:rotate-180",
              focusRing,
              disabledStyles,
              iconSlot,
            )}
            onClick={handleToggle}
          >
            <FlipIcon />
          </button>
        )}
      </div>
    </MotionConfig>
  );
}

export { flipCardVariants };
