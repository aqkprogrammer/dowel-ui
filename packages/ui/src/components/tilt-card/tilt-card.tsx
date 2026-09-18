"use client";

// Original design (pattern inspired by bencho Tilt card; no code referenced).
import {
  useCallback,
  useEffect,
  useRef,
  type ComponentPropsWithRef,
  type CSSProperties,
  type PointerEvent,
  type Ref,
} from "react";

import { Card } from "@/components/card";
import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * How it moves
 *
 * Pointer position is written straight to the element — its transform, and a
 * handful of custom properties the glare and the layers read — so a pointer
 * move costs no React render. CSS transitions do all the easing: a short
 * ease-out while following smooths the steps between pointer events, and an
 * overshooting ease on leave is the spring back to flat.
 *
 * Parallax layers are shifted with the `translate` property rather than
 * translateZ. A true 3D layer needs `preserve-3d`, which `overflow: hidden`
 * anywhere in the card silently flattens, and it changes size the moment the
 * perspective appears. A 2D shift proportional to the tilt reads the same and
 * cannot be broken by a consumer's class.
 *
 * Keyboard focus never tilts — a focused card has no pointer to lean toward —
 * it lifts, statically, using `translate` so it composes with any tilt a mouse
 * is applying at the same moment.
 */

const surface = cn(
  "group/tilt relative isolate",
  "transition-[transform,translate,box-shadow]",
  "duration-[var(--duration-slow),var(--duration-normal),var(--duration-normal)]",
  "ease-[var(--ease-overshoot),var(--ease-out-quint),var(--ease-out-quint)]",
  "data-[tilt=follow]:duration-[var(--duration-fast),var(--duration-normal),var(--duration-normal)]",
  "data-[tilt=follow]:ease-[var(--ease-out-quint)]",
  "data-[tilt=follow]:shadow-lg",
  focusRing,
  "focus-visible:-translate-y-1 focus-visible:shadow-md",
  "has-focus-visible:-translate-y-1 has-focus-visible:shadow-md",
);

const glareLayer = cn(
  "pointer-events-none absolute inset-0 z-10 rounded-[inherit] opacity-0",
  "transition-opacity duration-[var(--duration-normal)] ease-[var(--ease-out-quint)]",
  "group-data-[tilt=follow]/tilt:opacity-100",
);

const glareStyle: CSSProperties = {
  backgroundImage:
    "radial-gradient(circle at var(--tilt-glare-x, 50%) var(--tilt-glare-y, 50%), " +
    "color-mix(in oklab, var(--color-background) 55%, transparent), transparent 65%)",
};

const layerDrift = cn(
  "relative transition-[translate] duration-[var(--duration-slow)] ease-[var(--ease-overshoot)]",
  "group-data-[tilt=follow]/tilt:duration-[var(--duration-fast)] group-data-[tilt=follow]/tilt:ease-[var(--ease-out-quint)]",
);

/** Whether the tilt may run: never for touch, coarse pointers or reduced motion. */
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

/** Rounds away float noise so the written transform stays short and stable. */
function round(value: number): number {
  return Math.round(value * 100) / 100 || 0;
}

export interface TiltCardProps extends ComponentPropsWithRef<"div"> {
  /** The largest tilt, in degrees, reached with the pointer at an edge. 0 keeps the card flat. */
  maxTilt?: number;
  /** Distance, in pixels, of the viewer from the card. Smaller is more dramatic. */
  perspective?: number;
  /** How much the card grows while tilting. 1 keeps its size. */
  scale?: number;
  /** A soft highlight that follows the pointer across the surface. */
  glare?: boolean;
  /** Keeps the card flat, as if the pointer were elsewhere. */
  disabled?: boolean;
}

/**
 * A card that tilts in 3D toward the pointer and springs back flat when it
 * leaves.
 *
 * Decoration on an ordinary Card: it never moves for touch, coarse pointers or
 * users who prefer reduced motion. Mark children with `TiltCardLayer` to have
 * them drift further than the surface, for depth.
 */
export function TiltCard({
  className,
  maxTilt = 10,
  perspective = 800,
  scale = 1.02,
  glare = true,
  disabled = false,
  children,
  ref,
  onPointerMove,
  onPointerLeave,
  ...props
}: TiltCardProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  // The card's box, measured on the first move of a hover, while it is still
  // flat. A tilted card's bounding box is its projection, so measuring on
  // every move would have the card chase its own lean.
  const box = useRef<DOMRect | null>(null);
  const tilted = useRef(false);
  const inert = disabled || maxTilt === 0;

  const setRef = useCallback(
    (node: HTMLDivElement | null) => {
      cardRef.current = node;
      assignRef(ref, node);
    },
    [ref],
  );

  const flatten = useCallback(() => {
    box.current = null;
    const element = cardRef.current;
    if (!element || !tilted.current) return;
    tilted.current = false;
    element.dataset.tilt = "rest";
    element.style.transform = "";
    element.style.setProperty("--tilt-px", "0");
    element.style.setProperty("--tilt-py", "0");
  }, []);

  const lean = useCallback(
    (clientX: number, clientY: number, pointerType: string) => {
      const element = cardRef.current;
      if (!element || inert || !motionAllowed(pointerType)) {
        flatten();
        return;
      }
      box.current ??= element.getBoundingClientRect();
      const { left, top, width, height } = box.current;
      if (width === 0 || height === 0) return;

      // -1 at the start edge, 1 at the end edge, clamped for pointers that
      // slip past a rounded corner before `pointerleave` arrives.
      const x = Math.min(1, Math.max(-1, ((clientX - left) / width) * 2 - 1));
      const y = Math.min(1, Math.max(-1, ((clientY - top) / height) * 2 - 1));

      // The side under the pointer presses away from the viewer: rotateY
      // positive sends the right edge back, rotateX negative the bottom edge.
      tilted.current = true;
      element.dataset.tilt = "follow";
      element.style.transform =
        `perspective(${String(perspective)}px) ` +
        `rotateX(${String(round(-y * maxTilt))}deg) ` +
        `rotateY(${String(round(x * maxTilt))}deg) ` +
        `scale3d(${String(scale)}, ${String(scale)}, 1)`;
      element.style.setProperty("--tilt-px", String(round(x)));
      element.style.setProperty("--tilt-py", String(round(y)));
      element.style.setProperty("--tilt-glare-x", `${String(round(((x + 1) / 2) * 100))}%`);
      element.style.setProperty("--tilt-glare-y", `${String(round(((y + 1) / 2) * 100))}%`);
    },
    [flatten, inert, maxTilt, perspective, scale],
  );

  // Scrolling moves the card under a still pointer; the cached box is stale.
  useEffect(() => {
    const forget = () => {
      box.current = null;
    };
    window.addEventListener("scroll", forget, { passive: true, capture: true });
    window.addEventListener("resize", forget, { passive: true });
    return () => {
      window.removeEventListener("scroll", forget, { capture: true });
      window.removeEventListener("resize", forget);
    };
  }, []);

  // Becoming disabled mid-tilt should not leave the card stranded at an angle.
  useEffect(() => {
    if (inert) flatten();
  }, [inert, flatten]);

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    onPointerMove?.(event);
    lean(event.clientX, event.clientY, event.pointerType);
  }

  function handlePointerLeave(event: PointerEvent<HTMLDivElement>) {
    onPointerLeave?.(event);
    flatten();
  }

  return (
    <Card
      ref={setRef}
      data-slot="tilt-card"
      data-tilt="rest"
      className={cn(surface, className)}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      {...props}
    >
      {children}
      {glare ? (
        <span
          aria-hidden="true"
          data-slot="tilt-card-glare"
          className={glareLayer}
          style={glareStyle}
        />
      ) : null}
    </Card>
  );
}

export interface TiltCardLayerProps extends ComponentPropsWithRef<"div"> {
  /**
   * How far, in pixels, the layer drifts toward the pointer at full tilt —
   * on top of the card's own lean. Larger reads as nearer the viewer; a
   * negative depth sinks the layer behind the surface.
   */
  depth?: number;
}

/** Content inside a TiltCard that floats at its own depth. */
export function TiltCardLayer({ className, depth = 12, style, ...props }: TiltCardLayerProps) {
  const d = String(depth);
  return (
    <div
      data-slot="tilt-card-layer"
      className={cn(layerDrift, className)}
      style={{
        translate: `calc(var(--tilt-px, 0) * ${d}px) calc(var(--tilt-py, 0) * ${d}px)`,
        ...style,
      }}
      {...props}
    />
  );
}
