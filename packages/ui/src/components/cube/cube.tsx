"use client";

// Original design.
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";

import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { focusRing, mirrorForDirection } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * Content on the faces of a cube that turns to show one face at a time — a
 * carousel in three dimensions. Four faces turn around the vertical axis;
 * six add a top and a bottom.
 *
 * It is a carousel to assistive technology: a named region whose faces are
 * slides ("2 of 4: Speed"). Only the face in front is reachable — the others
 * are inert — so focus never lands on something turned away. Previous and
 * next buttons, the arrow keys on the cube, and a horizontal drag turn it;
 * a status line names the face it lands on. `autoRotate` turns it on a
 * timer, which stops while the pointer or focus is on it, and never runs
 * under reduced motion; while it runs, changes are not announced, so it does
 * not talk over the page. The turn is a CSS transition on the motion scale,
 * so under reduced motion the face simply changes.
 */

export interface CubeFace {
  /** Names the face for the slide label and the announcement. */
  label: string;
  content: ReactNode;
}

export interface CubeProps extends Omit<ComponentPropsWithRef<"section">, "onChange"> {
  /** Four faces turn around; six add a top (fifth) and a bottom (sixth). */
  faces: CubeFace[];
  /** Names the cube. */
  label: string;
  /** The face in front, controlled. */
  value?: number;
  defaultValue?: number;
  onValueChange?: (index: number) => void;
  /** Edge length in pixels. Default 240. */
  size?: number;
  /** Turn to the next face every this many milliseconds. Off by default. */
  autoRotate?: number;
  /** Show previous and next buttons. Default true. */
  controls?: boolean;
}

/** Each face's resting transform, before the cube turns. */
const FACE_TRANSFORMS = [
  "rotateY(0deg)",
  "rotateY(90deg)",
  "rotateY(180deg)",
  "rotateY(-90deg)",
  "rotateX(90deg)",
  "rotateX(-90deg)",
];

/** The cube's turn that brings face `index` to the front, keeping the side angle `yaw` continuous. */
function turnFor(index: number, yaw: number): { x: number; y: number } {
  if (index === 4) return { x: -90, y: yaw };
  if (index === 5) return { x: 90, y: yaw };
  // The nearest multiple of 360 plus this side, so it always takes the short way round.
  const target = -index * 90;
  const turns = Math.round((yaw - target) / 360);
  return { x: 0, y: target + turns * 360 };
}

function Chevron({ back }: { back?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("size-4", mirrorForDirection)}
    >
      <path d={back ? "m15 6-6 6 6 6" : "m9 6 6 6-6 6"} />
    </svg>
  );
}

/** A cube that turns to show one face at a time: a 3D carousel. */
export function Cube({
  faces,
  label,
  value,
  defaultValue = 0,
  onValueChange,
  size = 240,
  autoRotate,
  controls = true,
  className,
  style,
  ...props
}: CubeProps) {
  const count = Math.min(6, Math.max(1, faces.length));
  const sides = Math.min(4, count);
  const [own, setOwn] = useState(defaultValue);
  const index = Math.min(count - 1, Math.max(0, value ?? own));
  const [turn, setTurn] = useState(() => turnFor(index, 0));
  const [drag, setDrag] = useState(0);
  const [paused, setPaused] = useState(false);
  const [announce, setAnnounce] = useState(false);
  const reduced = useReducedMotion();
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ x: number; id: number; captured: boolean } | null>(null);
  const id = useId();

  // Follow the index, keeping the yaw continuous so it turns the short way.
  const [shown, setShown] = useState(index);
  if (shown !== index) {
    setShown(index);
    setTurn((current) => turnFor(index, current.y));
  }

  const go = (next: number, fromUser = true) => {
    const wrapped = ((next % count) + count) % count;
    setAnnounce(fromUser);
    if (value === undefined) setOwn(wrapped);
    onValueChange?.(wrapped);
  };
  // Previous and next step around the sides; from the top or bottom they return to the sides.
  const step = (delta: number, fromUser = true) => {
    if (index >= 4) go(0, fromUser);
    else go((((index + delta) % sides) + sides) % sides, fromUser);
  };

  const rotating =
    autoRotate !== undefined && autoRotate > 0 && !paused && !reduced && !dragging;
  useEffect(() => {
    if (!rotating) return;
    const timer = window.setInterval(() => {
      step(1, false);
    }, autoRotate);
    return () => {
      window.clearInterval(timer);
    };
  });

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
    const keys: Record<string, () => void> = {
      ArrowRight: () => {
        step(rtl ? -1 : 1);
      },
      ArrowLeft: () => {
        step(rtl ? 1 : -1);
      },
      Home: () => {
        go(0);
      },
      End: () => {
        go(sides - 1);
      },
    };
    if (count >= 5) {
      keys.ArrowUp = () => {
        go(index === 5 ? 0 : 4);
      };
    }
    if (count >= 6) {
      keys.ArrowDown = () => {
        go(index === 4 ? 0 : 5);
      };
    }
    const action = keys[event.key];
    if (!action) return;
    event.preventDefault();
    action();
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    start.current = { x: event.clientX, id: event.pointerId, captured: false };
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const from = start.current;
    if (from?.id !== event.pointerId) return;
    const dx = event.clientX - from.x;
    // Only a real drag takes the pointer, so a tap still reaches a link on the face.
    if (!from.captured) {
      if (Math.abs(dx) < 6) return;
      from.captured = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      setDragging(true);
    }
    setDrag((dx / size) * 90);
  };
  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (start.current?.id !== event.pointerId) return;
    start.current = null;
    setDragging(false);
    const steps = Math.round(drag / 90);
    setDrag(0);
    // Dragging right turns the cube right, bringing the previous face round.
    if (steps !== 0) step(-steps);
  };

  const transform = `translateZ(${String(-size / 2)}px) rotateX(${String(turn.x)}deg) rotateY(${String(turn.y + drag)}deg)`;
  const face = faces[index];

  return (
    <section
      aria-roledescription="carousel"
      aria-label={label}
      data-slot="cube"
      className={cn("inline-flex flex-col items-center gap-4", className)}
      style={{ "--cube-size": `${String(size)}px`, ...style } as CSSProperties}
      onPointerEnter={() => {
        setPaused(true);
      }}
      onPointerLeave={() => {
        setPaused(false);
      }}
      onFocus={() => {
        setPaused(true);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
      }}
      {...props}
    >
      {/* The arrow keys turn the cube the reader has focused; see tabIndex. */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <div
        id={id}
        role="group"
        aria-label={`${label}: use the arrow keys to turn`}
        // Focusable so the keyboard can turn it, as a carousel viewport is.
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        tabIndex={0}
        data-slot="cube-viewport"
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className={cn(
          "relative size-(--cube-size) cursor-grab touch-pan-y rounded-xl select-none perspective-[calc(var(--cube-size)*4)] active:cursor-grabbing",
          focusRing,
        )}
      >
        <div
          data-slot="cube-body"
          className="relative size-full transform-3d"
          style={{
            transform,
            transition: dragging
              ? "none"
              : "transform calc(700ms * var(--motion-scale, 1)) var(--ease-out-quint)",
          }}
        >
          {faces.slice(0, count).map((item, faceIndex) => {
            const current = faceIndex === index;
            return (
              <div
                key={faceIndex}
                role="group"
                aria-roledescription="slide"
                aria-label={`${String(faceIndex + 1)} of ${String(count)}: ${item.label}`}
                aria-hidden={current ? undefined : true}
                inert={!current}
                data-slot="cube-face"
                data-current={current || undefined}
                className="absolute inset-0 overflow-hidden rounded-xl border border-border bg-card text-card-foreground backface-hidden"
                style={{
                  transform: `${FACE_TRANSFORMS[faceIndex] ?? ""} translateZ(${String(size / 2)}px)`,
                }}
              >
                {item.content}
              </div>
            );
          })}
        </div>
      </div>

      {controls && count > 1 ? (
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-controls={id}
            aria-label="Previous face"
            onClick={() => {
              step(-1);
            }}
            className={cn(
              "grid size-8 place-items-center rounded-full border border-border text-foreground hover:bg-accent",
              focusRing,
            )}
          >
            <Chevron back />
          </button>
          <span className="min-w-28 text-center text-sm text-muted-foreground">
            {face?.label}
          </span>
          <button
            type="button"
            aria-controls={id}
            aria-label="Next face"
            onClick={() => {
              step(1);
            }}
            className={cn(
              "grid size-8 place-items-center rounded-full border border-border text-foreground hover:bg-accent",
              focusRing,
            )}
          >
            <Chevron />
          </button>
        </div>
      ) : null}
      <span role="status" className="sr-only">
        {announce && face ? `${String(index + 1)} of ${String(count)}: ${face.label}` : ""}
      </span>
    </section>
  );
}
