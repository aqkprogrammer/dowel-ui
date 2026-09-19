"use client";

// Ported from bencho Dragging ball (MIT, © 2026 Lorenzo Cabra). See THIRD_PARTY_NOTICES.md.
import { cva, type VariantProps } from "class-variance-authority";
import {
  MotionConfig,
  useMotionValue,
  useMotionValueEvent,
  useSpring,
  useVelocity,
} from "motion/react";
import { Direction } from "radix-ui";
import {
  useCallback,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentPropsWithRef,
  type KeyboardEvent,
  type PointerEvent,
} from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A jelly ball in an invisible well. Drag it (or nudge it with the arrow keys)
 * and the blob drawn under the handle chases it on a spring, stretching along
 * its velocity and squashing flat against the walls.
 *
 * This is continuous pointer-following physics, which is one of the places
 * `motion` is allowed (ADR 0014): the stretch is read from the spring's own
 * velocity, which no CSS transition knows. The handle itself moves 1:1 and is
 * the real control — a 2D slider — so the goo is decoration drawn behind it
 * (aria-hidden). Under reduced motion the spring is skipped: the ball sits at
 * the handle, round, with no stretch or wobble.
 */

export interface GooBallValue {
  /** Percent of travel from the inline-start wall (0-100). */
  x: number;
  /** Percent of travel from the top wall (0-100). */
  y: number;
}

const CENTRE: GooBallValue = { x: 50, y: 50 };
const STEP = 2;
const BIG_STEP = 10;

const gooBallVariants = cva("", {
  variants: {
    fill: {
      light: "fill-card",
      dark: "fill-foreground",
    },
  },
  defaultVariants: { fill: "light" },
});

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeToMotionPreference(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeToMotionPreference,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function clampValue(value: GooBallValue): GooBallValue {
  return { x: clamp(value.x, 0, 100), y: clamp(value.y, 0, 100) };
}

/** Spring settings for the feel props. Exported for tests and tuning. */
export function gooBallSpring(give: number, grip: number) {
  const g = clamp(give, 10, 100);
  return {
    stiffness: 750 - g * 5,
    damping: 26 - g * 0.16,
    mass: 1.6 - clamp(grip, 0, 100) * 0.012,
  };
}

export interface GooBallProps
  extends
    Omit<ComponentPropsWithRef<"div">, "defaultValue" | "onChange">,
    VariantProps<typeof gooBallVariants> {
  /** Ball diameter in px (bencho: 32-84). */
  size?: number;
  /** How far the blob deforms with speed, 0-70. 0 keeps it a rigid circle. */
  stretch?: number;
  /** Spring softness, 10-100: how slow and wobbly the settle is. */
  give?: number;
  /** How tightly the blob tracks the handle, 0-100. Lower lags more. */
  grip?: number;
  /** Adds a 1px hairline ring in the border colour. */
  stroke?: boolean;
  /** Position in percent of travel (controlled). */
  value?: GooBallValue;
  /** Starting position (uncontrolled). Defaults to the centre. */
  defaultValue?: GooBallValue;
  /** Called with the new position as the ball is dragged or nudged. */
  onValueChange?: (value: GooBallValue) => void;
  /** Stops dragging and keyboard nudging. */
  disabled?: boolean;
}

/**
 * A decorative, draggable jelly ball. The handle is a 2D slider
 * (`role="slider"`, arrow keys nudge, Shift nudges further, Home centres).
 * Size the well with `className` (default 18.75rem x 12.5rem). `aria-label` /
 * `aria-labelledby` name the handle (default "Goo ball (decorative)").
 */
export function GooBall({
  className,
  size = 56,
  stretch = 36,
  give = 50,
  grip = 50,
  fill,
  stroke = false,
  value,
  defaultValue = CENTRE,
  onValueChange,
  disabled = false,
  "aria-label": ariaLabel = "Goo ball (decorative)",
  "aria-labelledby": ariaLabelledBy,
  ...props
}: GooBallProps) {
  const [uncontrolled, setUncontrolled] = useState(() => clampValue(defaultValue));
  const position = clampValue(value ?? uncontrolled);
  const [held, setHeld] = useState(false);
  const [well, setWell] = useState({ width: 0, height: 0 });
  const reduceMotion = usePrefersReducedMotion();
  const dir = Direction.useDirection();
  const filterId = `dowel-goo-ball-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const wellRef = useRef<HTMLDivElement>(null);
  const rectRef = useRef<SVGRectElement>(null);
  const drag = useRef<{ id: number; x: number; y: number; from: GooBallValue } | null>(null);

  const targetX = useMotionValue(0);
  const targetY = useMotionValue(0);
  const spring = gooBallSpring(give, grip);
  const springX = useSpring(targetX, spring);
  const springY = useSpring(targetY, spring);
  const velocityX = useVelocity(springX);
  const velocityY = useVelocity(springY);

  const maxX = Math.max(0, well.width - size);
  const maxY = Math.max(0, well.height - size);
  const goalX = (maxX * position.x) / 100;
  const goalY = (maxY * position.y) / 100;

  const draw = useCallback(() => {
    const rect = rectRef.current;
    if (!rect) return;
    const x = reduceMotion ? goalX : springX.get();
    const y = reduceMotion ? goalY : springY.get();
    // Past a wall the blob flattens against it instead of passing through.
    const overX = x < 0 ? x : x > maxX ? x - maxX : 0;
    const overY = y < 0 ? y : y > maxY ? y - maxY : 0;
    const squashX = Math.min(Math.abs(overX) / size, 0.3);
    const squashY = Math.min(Math.abs(overY) / size, 0.3);
    const cx = clamp(x, 0, maxX) + size / 2 + (Math.sign(overX) * size * squashX) / 2;
    const cy = clamp(y, 0, maxY) + size / 2 + (Math.sign(overY) * size * squashY) / 2;
    const wallX = 1 - squashX + squashY * 0.6;
    const wallY = 1 - squashY + squashX * 0.6;
    // Along the velocity it stretches; across it thins.
    const vx = reduceMotion ? 0 : velocityX.get();
    const vy = reduceMotion ? 0 : velocityY.get();
    const speed = Math.hypot(vx, vy);
    const along = 1 + (clamp(stretch, 0, 70) / 200) * Math.min(1, speed / 1200);
    const across = 1 - (along - 1) * 0.7;
    const angle = (Math.atan2(vy, vx) * 180) / Math.PI;
    const r = (n: number) => (Math.abs(n) < 5e-4 ? 0 : n).toFixed(3);
    rect.setAttribute(
      "transform",
      `translate(${r(cx)} ${r(cy)}) scale(${r(wallX)} ${r(wallY)}) rotate(${r(angle)}) ` +
        `scale(${r(along)} ${r(across)}) rotate(${r(-angle)}) translate(${r(-size / 2)} ${r(-size / 2)})`,
    );
  }, [
    goalX,
    goalY,
    maxX,
    maxY,
    reduceMotion,
    size,
    springX,
    springY,
    stretch,
    velocityX,
    velocityY,
  ]);

  useMotionValueEvent(springX, "change", draw);
  useMotionValueEvent(springY, "change", draw);
  useMotionValueEvent(velocityX, "change", draw);
  useMotionValueEvent(velocityY, "change", draw);

  // Measure the well so the goo, drawn in px, lands under the handle.
  useLayoutEffect(() => {
    const element = wellRef.current;
    if (!element) return;
    const measure = () => {
      const { width, height } = element.getBoundingClientRect();
      setWell((last) =>
        last.width === width && last.height === height ? last : { width, height },
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // The first placement, a resize and reduced motion all jump; a move springs.
  const placedFor = useRef("");
  useLayoutEffect(() => {
    targetX.set(goalX);
    targetY.set(goalY);
    const frame = `${String(well.width)}x${String(well.height)}@${String(size)}`;
    if (placedFor.current !== frame || reduceMotion) {
      springX.jump(goalX);
      springY.jump(goalY);
      placedFor.current = frame;
    }
    draw();
  }, [goalX, goalY, reduceMotion, well, size, targetX, targetY, springX, springY, draw]);

  function commit(next: GooBallValue) {
    const clamped = clampValue(next);
    if (clamped.x === position.x && clamped.y === position.y) return;
    if (value === undefined) setUncontrolled(clamped);
    onValueChange?.(clamped);
  }

  function isRtl(element: Element) {
    return dir === "rtl" || element.closest("[dir]")?.getAttribute("dir") === "rtl";
  }

  function handleKeyDown(event: KeyboardEvent<HTMLSpanElement>) {
    if (disabled) return;
    const step = event.shiftKey ? BIG_STEP : STEP;
    const flip = isRtl(event.currentTarget) ? -1 : 1;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step * flip, 0],
      ArrowRight: [step * flip, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    if (event.key === "Home") {
      event.preventDefault();
      commit(CENTRE);
      return;
    }
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    commit({ x: position.x + move[0], y: position.y + move[1] });
  }

  function handlePointerDown(event: PointerEvent<HTMLSpanElement>) {
    if (disabled || event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, from: position };
    setHeld(true);
  }

  function handlePointerMove(event: PointerEvent<HTMLSpanElement>) {
    const start = drag.current;
    const element = wellRef.current;
    if (!start || start.id !== event.pointerId || !element) return;
    const box = element.getBoundingClientRect();
    const travelX = box.width - size;
    const travelY = box.height - size;
    const flip = isRtl(event.currentTarget) ? -1 : 1;
    commit({
      x: travelX > 0 ? start.from.x + (((event.clientX - start.x) * flip) / travelX) * 100 : 50,
      y: travelY > 0 ? start.from.y + ((event.clientY - start.y) / travelY) * 100 : 50,
    });
  }

  function handlePointerEnd(event: PointerEvent<HTMLSpanElement>) {
    if (drag.current?.id !== event.pointerId) return;
    drag.current = null;
    setHeld(false);
  }

  const across = Math.round(position.x);
  const down = Math.round(position.y);

  return (
    <MotionConfig reducedMotion="user">
      <div
        ref={wellRef}
        data-slot="goo-ball"
        data-held={held ? "" : undefined}
        data-disabled={disabled ? "" : undefined}
        className={cn("relative h-[12.5rem] w-[18.75rem] max-w-full select-none", className)}
        {...props}
      >
        <svg
          aria-hidden="true"
          data-slot="goo-ball-goo"
          className="pointer-events-none absolute inset-0 size-full overflow-visible rtl:-scale-x-100"
        >
          <defs>
            <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation={Math.max(2, size * 0.08)} />
              <feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 16 -6.17" />
              <feComposite in="SourceGraphic" operator="atop" />
            </filter>
          </defs>
          <g filter={`url(#${filterId})`}>
            <rect
              ref={rectRef}
              data-slot="goo-ball-blob"
              width={size}
              height={size}
              rx={size / 2}
              className={cn(gooBallVariants({ fill }), stroke && "stroke-border")}
              strokeWidth={stroke ? 1 : undefined}
            />
          </g>
        </svg>
        <span
          role="slider"
          tabIndex={disabled ? -1 : 0}
          aria-label={ariaLabelledBy ? undefined : ariaLabel}
          aria-labelledby={ariaLabelledBy}
          aria-roledescription="draggable ball"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={across}
          aria-valuetext={`${String(across)}% across, ${String(down)}% down`}
          aria-disabled={disabled || undefined}
          data-slot="goo-ball-handle"
          className={cn(
            "absolute touch-none rounded-full",
            disabled
              ? "cursor-not-allowed opacity-55"
              : held
                ? "cursor-grabbing"
                : "cursor-grab",
            focusRing,
          )}
          style={{
            width: size,
            height: size,
            insetInlineStart: `calc((100% - ${String(size)}px) * ${String(position.x / 100)})`,
            top: `calc((100% - ${String(size)}px) * ${String(position.y / 100)})`,
          }}
          onKeyDown={handleKeyDown}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
        />
      </div>
    </MotionConfig>
  );
}

export { gooBallVariants };
