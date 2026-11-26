"use client";

// Original design.
import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type KeyboardEvent,
  type Ref,
} from "react";

import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

/*
 * Text that lets go: on a trigger, its words (or letters) drop out of the line,
 * tumble, bounce on the floor of the box and pile up against each other and
 * the walls. Reset and they fly home.
 *
 * The physics is a few lines of Euler integration in one rAF loop — gravity,
 * a bouncy floor, walls, and box-against-box separation so pieces stack —
 * written to each piece as a transform from where the text laid it out. It
 * stops itself once everything is still. The real text is a visually hidden
 * copy and the pieces are aria-hidden. Under reduced motion nothing falls;
 * the text only dims to show it was triggered.
 */

export interface FallingTextHandle {
  /** Let the text fall. */
  drop: () => void;
  /** Bring every piece back to its place. */
  reset: () => void;
}

export interface FallingTextProps extends Omit<ComponentPropsWithRef<"div">, "children"> {
  /** The text. Plain text: it is split into words or letters. */
  children: string;
  /** Split into words or single letters. Default "word". */
  by?: "word" | "letter";
  /** What makes it fall. "click" makes the box a toggle button. Default "hover". */
  trigger?: "hover" | "click" | "inView" | "manual";
  /** Controlled: true drops the text, false brings it back. */
  fallen?: boolean;
  /** Gravity, in pixels per second squared. Default 2400. */
  gravity?: number;
  /** How much of its speed a piece keeps when it bounces, 0–1. Default 0.35. */
  bounce?: number;
  /** Imperative `drop()` and `reset()`. */
  handleRef?: Ref<FallingTextHandle>;
}

export interface FallingBody {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  spin: number;
  /** Laid-out box, relative to the container. */
  left: number;
  top: number;
  width: number;
  height: number;
}

function piecesIn(root: HTMLElement | null): HTMLElement[] {
  return Array.from(
    root?.querySelectorAll<HTMLElement>("[data-slot=falling-text-piece]") ?? [],
  );
}

/** Splits text into the pieces that fall, keeping the spaces between words. */
export function splitPieces(text: string, by: "word" | "letter"): string[] {
  if (by === "letter") return Array.from(text);
  return text.split(/(\s+)/).filter((piece) => piece.length > 0);
}

/** Pushes two overlapping boxes apart along the shallower axis. Returns true if they touched. */
export function separate(a: FallingBody, b: FallingBody): boolean {
  const ax = a.left + a.x;
  const ay = a.top + a.y;
  const bx = b.left + b.x;
  const by = b.top + b.y;
  const overlapX = Math.min(ax + a.width, bx + b.width) - Math.max(ax, bx);
  const overlapY = Math.min(ay + a.height, by + b.height) - Math.max(ay, by);
  if (overlapX <= 0 || overlapY <= 0) return false;
  if (overlapY < overlapX) {
    // The lower body carries the upper one: only the upper moves, so a pile
    // rests on whatever is beneath it rather than sinking into it.
    const [upper, lower] = ay < by ? [a, b] : [b, a];
    upper.y -= overlapY;
    upper.vy = Math.min(upper.vy, lower.vy);
  } else {
    const push = overlapX / 2;
    const aLeft = ax < bx;
    a.x += aLeft ? -push : push;
    b.x += aLeft ? push : -push;
    a.vx *= -0.3;
    b.vx *= -0.3;
  }
  return true;
}

/** The room a fall happens in. */
export interface FallingWorld {
  /** Height of the box: where the floor is. */
  floor: number;
  /** Width of the box: where the far wall is. */
  wall: number;
  gravity: number;
  bounce: number;
}

/** Advances every body by `dt` seconds: gravity, floor, walls, then stacking. */
export function fallingStep(list: FallingBody[], dt: number, world: FallingWorld): void {
  // Small steps, so a fast piece cannot pass through a short one in one frame.
  const steps = Math.max(1, Math.ceil(dt / (1 / 240)));
  for (let step = 0; step < steps; step++) integrate(list, dt / steps, world);
}

function integrate(list: FallingBody[], dt: number, world: FallingWorld): void {
  const { floor, wall, gravity, bounce } = world;
  for (const body of list) {
    body.vy += gravity * dt;
    body.x += body.vx * dt;
    body.y += body.vy * dt;
    body.angle += body.spin * dt;
    const bottom = body.top + body.y + body.height;
    if (bottom > floor) {
      body.y = floor - body.top - body.height;
      body.vy = Math.abs(body.vy) > 60 ? -body.vy * bounce : 0;
      body.vx *= 0.8;
      body.spin *= 0.6;
      // Lie roughly flat once on the ground.
      body.angle *= 0.9;
    }
    const leftEdge = body.left + body.x;
    if (leftEdge < 0) {
      body.x = -body.left;
      body.vx = Math.abs(body.vx) * bounce;
    } else if (leftEdge + body.width > wall) {
      body.x = wall - body.width - body.left;
      body.vx = -Math.abs(body.vx) * bounce;
    }
  }
  // A few passes so a pile settles rather than sinking into itself.
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        if (a && b && separate(a, b)) {
          a.spin *= 0.9;
          b.spin *= 0.9;
        }
      }
    }
  }
}

/** Text that drops out of its line and piles up at the bottom of its box. */
export function FallingText({
  children,
  by = "word",
  trigger = "hover",
  fallen,
  gravity = 2400,
  bounce = 0.35,
  handleRef,
  className,
  onPointerEnter,
  onClick,
  onKeyDown,
  ref,
  ...props
}: FallingTextProps) {
  const reduced = useReducedMotion();
  const box = useRef<HTMLDivElement | null>(null);
  const bodies = useRef<FallingBody[]>([]);
  const frame = useRef(0);
  const [down, setDown] = useState(false);
  const pieces = splitPieces(children, by);

  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      box.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  const stop = useCallback(() => {
    if (frame.current) cancelAnimationFrame(frame.current);
    frame.current = 0;
  }, []);

  const run = useCallback(() => {
    const container = box.current;
    if (!container) return;
    const nodes = piecesIn(container);
    const origin = container.getBoundingClientRect();
    bodies.current = nodes.map((node) => {
      const rect = node.getBoundingClientRect();
      return {
        x: 0,
        y: 0,
        vx: (Math.random() - 0.5) * 120,
        vy: -Math.random() * 200,
        angle: 0,
        spin: (Math.random() - 0.5) * 240,
        left: rect.left - origin.left,
        top: rect.top - origin.top,
        width: rect.width,
        height: rect.height,
      };
    });
    const floor = container.clientHeight;
    const wall = container.clientWidth;
    let last = performance.now();
    let still = 0;

    const tick = (now: number) => {
      const dt = Math.min(0.032, Math.max(0, (now - last) / 1000));
      last = now;
      let moving = false;
      fallingStep(bodies.current, dt, { floor, wall, gravity, bounce });
      nodes.forEach((node, index) => {
        const body = bodies.current[index];
        if (!body) return;
        if (Math.abs(body.vx) > 4 || Math.abs(body.vy) > 4 || Math.abs(body.spin) > 4) {
          moving = true;
        }
        node.style.transform = `translate(${body.x.toFixed(1)}px, ${body.y.toFixed(1)}px) rotate(${body.angle.toFixed(1)}deg)`;
      });
      still = moving ? 0 : still + 1;
      frame.current = still > 20 ? 0 : requestAnimationFrame(tick);
    };
    stop();
    frame.current = requestAnimationFrame(tick);
  }, [gravity, bounce, stop]);

  const drop = useCallback(() => {
    setDown(true);
  }, []);
  const reset = useCallback(() => {
    setDown(false);
  }, []);

  useImperativeHandle(handleRef, () => ({ drop, reset }), [drop, reset]);

  const isDown = fallen ?? down;

  // Start or undo the fall whenever the state changes.
  useEffect(() => {
    if (reduced) return;
    const nodes = piecesIn(box.current);
    if (isDown) {
      for (const node of nodes) node.style.transition = "";
      run();
    } else {
      stop();
      for (const node of nodes) {
        node.style.transition =
          "transform calc(600ms * var(--motion-scale, 1)) var(--ease-out-quint)";
        node.style.transform = "";
      }
    }
    return stop;
  }, [isDown, reduced, run, stop]);

  // Falling when scrolled into view.
  useEffect(() => {
    const node = box.current;
    if (trigger !== "inView" || !node || typeof IntersectionObserver !== "function") return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setDown(true);
        observer.disconnect();
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [trigger]);

  const toggle = () => setDown((value) => !value);
  const clickable = trigger === "click";

  return (
    <div
      ref={setRefs}
      data-slot="falling-text"
      data-state={isDown ? "fallen" : "resting"}
      data-trigger={trigger}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      aria-pressed={clickable ? isDown : undefined}
      className={cn(
        "relative block min-h-48 overflow-hidden",
        clickable && "cursor-pointer select-none",
        "transition-opacity duration-(--duration-normal) data-[state=fallen]:motion-reduce:opacity-60",
        className,
      )}
      onPointerEnter={(event) => {
        onPointerEnter?.(event);
        if (trigger === "hover") setDown(true);
      }}
      onClick={(event) => {
        onClick?.(event);
        if (clickable) toggle();
      }}
      onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
        onKeyDown?.(event);
        if (clickable && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          toggle();
        }
      }}
      {...props}
    >
      <span className="sr-only">{children}</span>
      <span aria-hidden="true" className="relative">
        {pieces.map((piece, index) =>
          /^\s+$/.test(piece) ? (
            <span key={index}>{piece}</span>
          ) : (
            <span
              key={index}
              data-slot="falling-text-piece"
              className="inline-block whitespace-pre will-change-transform"
            >
              {piece}
            </span>
          ),
        )}
      </span>
    </div>
  );
}
