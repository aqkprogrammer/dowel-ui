"use client";

// Original design.
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentPropsWithRef, CSSProperties, PointerEvent } from "react";

import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

/*
 * A spotlight that follows the pointer inside a box: in `light` mode a soft
 * glow behind the content, in `reveal` mode the rest of the box dims and only
 * the circle around the pointer stays clear — a flashlight over a section.
 *
 * The pointer's position is written to two custom properties on the box, so
 * moving it re-renders nothing. It is scoped to the box, leaves the system
 * cursor alone, and is entirely absent until the pointer is inside: `reveal`
 * never dims content nobody is pointing at. Off for touch and under reduced
 * motion, where the box is simply its content.
 */

const cursorSpotlightVariants = cva("relative isolate overflow-hidden", {
  variants: {
    /** `light` adds a glow around the pointer; `reveal` dims everything but it. */
    mode: {
      light: "",
      reveal: "",
    },
  },
  defaultVariants: { mode: "light" },
});

export interface CursorSpotlightProps
  extends ComponentPropsWithRef<"div">, VariantProps<typeof cursorSpotlightVariants> {
  /** Radius of the spotlight, in pixels. Default 220. */
  radius?: number;
  /** Glow colour in `light` mode: a token or any CSS colour. Default "primary". */
  color?: string;
  /** How strong the glow, or how deep the dimming, 0–1. Default 0.25 for light, 0.7 for reveal. */
  intensity?: number;
  /** Whether the light passes behind the content or over it. Default: behind for light, over for reveal. */
  layer?: "behind" | "above";
}

/** A pointer-following glow, or a flashlight that dims everything else, inside a box. */
export function CursorSpotlight({
  mode,
  radius = 220,
  color = "primary",
  intensity,
  layer,
  className,
  style,
  children,
  onPointerMove,
  onPointerLeave,
  ...props
}: CursorSpotlightProps) {
  const reduced = useReducedMotion();
  const look = mode ?? "light";
  const strength = Math.min(1, Math.max(0, intensity ?? (look === "reveal" ? 0.7 : 0.25)));
  const over = (layer ?? (look === "reveal" ? "above" : "behind")) === "above";
  const css = /^[a-z][a-z0-9-]*$/.test(color) ? `var(--color-${color})` : color;
  const share = String(Math.round(strength * 100));

  const background =
    look === "reveal"
      ? `radial-gradient(circle var(--cursor-spotlight-radius) at var(--cursor-spotlight-x) var(--cursor-spotlight-y), transparent 0%, transparent 35%, color-mix(in oklab, var(--color-background) ${share}%, transparent) 100%)`
      : `radial-gradient(circle var(--cursor-spotlight-radius) at var(--cursor-spotlight-x) var(--cursor-spotlight-y), color-mix(in oklab, ${css} ${share}%, transparent), transparent 100%)`;

  return (
    <div
      data-slot="cursor-spotlight"
      data-mode={look}
      className={cn(cursorSpotlightVariants({ mode: look }), className)}
      style={
        {
          "--cursor-spotlight-radius": `${String(Math.max(10, radius))}px`,
          "--cursor-spotlight-x": "50%",
          "--cursor-spotlight-y": "50%",
          "--cursor-spotlight-opacity": "0",
          ...style,
        } as CSSProperties
      }
      onPointerMove={(event: PointerEvent<HTMLDivElement>) => {
        onPointerMove?.(event);
        if (reduced || event.pointerType !== "mouse") return;
        const node = event.currentTarget;
        const box = node.getBoundingClientRect();
        node.style.setProperty("--cursor-spotlight-x", `${String(event.clientX - box.left)}px`);
        node.style.setProperty("--cursor-spotlight-y", `${String(event.clientY - box.top)}px`);
        node.style.setProperty("--cursor-spotlight-opacity", "1");
      }}
      onPointerLeave={(event) => {
        onPointerLeave?.(event);
        event.currentTarget.style.setProperty("--cursor-spotlight-opacity", "0");
      }}
      {...props}
    >
      {reduced ? null : (
        <div
          aria-hidden="true"
          data-slot="cursor-spotlight-light"
          className={cn(
            "pointer-events-none absolute inset-0 opacity-(--cursor-spotlight-opacity)",
            "transition-opacity duration-(--duration-normal) ease-(--ease-out-quint)",
            over ? "z-20" : "z-0",
          )}
          style={{ backgroundImage: background }}
        />
      )}
      <div data-slot="cursor-spotlight-content" className="relative z-10 h-full">
        {children}
      </div>
    </div>
  );
}

export { cursorSpotlightVariants };
