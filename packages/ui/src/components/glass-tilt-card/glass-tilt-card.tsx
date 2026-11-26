"use client";

// Original design.
import {
  useRef,
  type ComponentPropsWithRef,
  type CSSProperties,
  type PointerEvent,
} from "react";

import { cn } from "@/lib/utils";

/*
 * A frosted glass card that leans toward the pointer.
 *
 * Three layers, so the two motions never fight over one transform:
 *
 * - The root holds the perspective and listens for the pointer.
 * - A sway layer runs a slow idle keyframe — a gentle figure-of-eight lean —
 *   with a glint drifting across the glass in step. Its first and last frames
 *   are flat, so when reduced motion runs it once, instantly, it settles flat.
 * - The surface takes the pointer tilt, written straight to its style on each
 *   move so following costs no React render. A short ease-out smooths the
 *   gaps between pointer events; leaving springs it back on the overshoot
 *   curve. While the pointer is over it the sway pauses where it is, rather
 *   than snapping home, and a radial glare follows the pointer.
 *
 * The tilt never runs for touch, coarse pointers or reduced motion, and every
 * duration is on the motion scale. The card adds no role, name or tab stop:
 * it is a surface for whatever you put in it, so a card that acts as a link
 * should contain a real link. The sheen, glint and glare are aria-hidden and
 * ignore the pointer.
 *
 * Directions here are geometry (the side under the pointer presses away), the
 * same in every language, so nothing is mirrored.
 */

const PREFIX = "dowel-glass-tilt-card";

/** A duration on the motion scale. */
function scaled(ms: number): string {
  return `calc(${String(ms)}ms * var(--motion-scale, 1))`;
}

const SWAY = "--glass-tilt-card-sway";

const STYLES = `
@keyframes ${PREFIX}-sway{0%,100%{transform:none}25%{transform:rotateX(5deg) rotateY(-9deg)}50%{transform:rotateX(-2deg) rotateY(3deg)}75%{transform:rotateX(-5deg) rotateY(9deg)}}
@keyframes ${PREFIX}-glint{0%,100%{translate:-35% 0}25%{translate:-10% 0}75%{translate:30% 0}}
[data-slot=glass-tilt-card-sway][data-sway]{animation:${PREFIX}-sway var(${SWAY}) ease-in-out infinite}
[data-slot=glass-tilt-card-sway][data-sway] [data-slot=glass-tilt-card-glint]{animation:${PREFIX}-glint var(${SWAY}) ease-in-out infinite}
[data-tilt=follow] [data-slot=glass-tilt-card-sway],[data-tilt=follow] [data-slot=glass-tilt-card-glint]{animation-play-state:paused}
`;

/** Whether the tilt may run: never for touch, coarse pointers or reduced motion. */
function motionAllowed(pointerType: string): boolean {
  if (pointerType === "touch") return false;
  if (typeof window.matchMedia !== "function") return true;
  return !(
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    window.matchMedia("(pointer: coarse)").matches
  );
}

/** Rounds away float noise so the written transform stays short. */
function round(value: number): number {
  return Math.round(value * 100) / 100 || 0;
}

export interface GlassTiltCardProps extends ComponentPropsWithRef<"div"> {
  /** The largest tilt, in degrees, with the pointer at an edge. */
  maxTilt?: number;
  /** Distance of the viewer from the card, in pixels. Smaller is more dramatic. */
  perspective?: number;
  /** The slow idle lean while the pointer is elsewhere. */
  sway?: boolean;
  /** One idle sway cycle, in milliseconds. Scaled by --motion-scale. */
  swayDuration?: number;
  /** A highlight that follows the pointer across the glass. */
  glare?: boolean;
  /** Keeps the card still. */
  disabled?: boolean;
  /** Classes for the glass surface itself (the root only positions it). */
  surfaceClassName?: string;
}

/** A frosted glass card that tilts toward the pointer with a moving glare, and sways gently at rest. */
export function GlassTiltCard({
  className,
  surfaceClassName,
  maxTilt = 14,
  perspective = 700,
  sway = true,
  swayDuration = 6000,
  glare = true,
  disabled = false,
  children,
  style,
  onPointerMove,
  onPointerLeave,
  ...props
}: GlassTiltCardProps) {
  const surface = useRef<HTMLDivElement>(null);

  function rest(root: HTMLElement) {
    delete root.dataset.tilt;
    if (surface.current) surface.current.style.transform = "";
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    onPointerMove?.(event);
    const root = event.currentTarget;
    if (disabled || maxTilt === 0 || !motionAllowed(event.pointerType)) {
      rest(root);
      return;
    }
    // The root never transforms, so its box is the card's flat footprint.
    const box = root.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) return;
    const x = Math.min(1, Math.max(-1, ((event.clientX - box.left) / box.width) * 2 - 1));
    const y = Math.min(1, Math.max(-1, ((event.clientY - box.top) / box.height) * 2 - 1));

    root.dataset.tilt = "follow";
    root.style.setProperty("--glass-tilt-card-x", `${String(round(((x + 1) / 2) * 100))}%`);
    root.style.setProperty("--glass-tilt-card-y", `${String(round(((y + 1) / 2) * 100))}%`);
    if (surface.current) {
      surface.current.style.transform =
        `rotateX(${String(round(-y * maxTilt))}deg) ` +
        `rotateY(${String(round(x * maxTilt))}deg) scale3d(1.03, 1.03, 1)`;
    }
  }

  function handlePointerLeave(event: PointerEvent<HTMLDivElement>) {
    onPointerLeave?.(event);
    rest(event.currentTarget);
  }

  return (
    <div
      data-slot="glass-tilt-card"
      className={cn("group/glass inline-block", className)}
      style={{ perspective: `${String(perspective)}px`, ...style }}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      {...props}
    >
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      <div
        data-slot="glass-tilt-card-sway"
        data-sway={(sway && !disabled) || undefined}
        className="size-full [transform-style:preserve-3d]"
        style={{ [SWAY]: scaled(swayDuration) } as CSSProperties}
      >
        <div
          ref={surface}
          data-slot="glass-tilt-card-surface"
          className={cn(
            "relative isolate size-full overflow-hidden rounded-2xl",
            "border border-foreground/15 bg-muted/40 text-foreground shadow-2xl backdrop-blur-xl backdrop-saturate-150",
            "transition-transform duration-[var(--duration-slower)] ease-[var(--ease-overshoot)]",
            "group-data-[tilt=follow]/glass:duration-[var(--duration-fast)] group-data-[tilt=follow]/glass:ease-[var(--ease-out-quint)]",
            surfaceClassName,
          )}
        >
          {/* A fixed sheen from the top edge: the glass catching the light. */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 bg-linear-to-b from-foreground/12 via-transparent to-transparent"
          />
          <span
            aria-hidden="true"
            data-slot="glass-tilt-card-glint"
            className="pointer-events-none absolute -inset-x-full -inset-y-1/2 z-10 [rotate:20deg] bg-linear-to-r from-transparent via-foreground/10 to-transparent opacity-80"
          />
          {glare ? (
            <span
              aria-hidden="true"
              data-slot="glass-tilt-card-glare"
              className={cn(
                "pointer-events-none absolute inset-0 z-10 opacity-0",
                "transition-opacity duration-[var(--duration-normal)] ease-[var(--ease-out-quint)]",
                "group-data-[tilt=follow]/glass:opacity-100",
              )}
              style={{
                backgroundImage:
                  "radial-gradient(circle at var(--glass-tilt-card-x, 50%) var(--glass-tilt-card-y, 50%), " +
                  "color-mix(in oklab, var(--color-foreground) 22%, transparent), transparent 60%)",
              }}
            />
          ) : null}
          {children}
        </div>
      </div>
    </div>
  );
}
