"use client";

// Ported from SmoothUI Glow Hover Card (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import {
  createContext,
  useContext,
  type ComponentPropsWithRef,
  type CSSProperties,
  type PointerEvent,
} from "react";

import { cn } from "@/lib/utils";

/*
 * A glow that follows the pointer across one card or a whole group of them.
 *
 * The source re-rendered on every pointermove and kept a masked duplicate of
 * every card in sync with ResizeObserver, MutationObserver, scroll and resize
 * listeners. None of that is needed: each card owns one decorative layer, and
 * the pointer handler writes three custom properties straight onto the cards.
 * No React state changes while the pointer moves, so nothing re-renders.
 *
 * Coordinates are per card, measured from its own box, so the glow is
 * continuous across a group — the gap between two cards simply has no card in
 * it, exactly as the source's single group-wide mask behaved.
 *
 * Off for touch (there is no hover to follow) and under reduced motion (a
 * light chasing the pointer is movement, however soft).
 */

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
const CARD_SELECTOR = '[data-slot="glow-card"]';

function glowAllowed(event: PointerEvent<HTMLElement>): boolean {
  if (event.pointerType === "touch") return false;
  return !window.matchMedia(REDUCED_MOTION).matches;
}

/** Writes the pointer position, relative to each card, onto each card. */
function paint(cards: Iterable<HTMLElement>, clientX: number, clientY: number) {
  for (const card of cards) {
    const rect = card.getBoundingClientRect();
    card.style.setProperty("--glow-x", `${String(clientX - rect.left)}px`);
    card.style.setProperty("--glow-y", `${String(clientY - rect.top)}px`);
    card.style.setProperty("--glow-opacity", "1");
  }
}

function fade(cards: Iterable<HTMLElement>) {
  for (const card of cards) card.style.setProperty("--glow-opacity", "0");
}

const GroupContext = createContext(false);

export interface GlowCardGroupProps extends ComponentPropsWithRef<"div"> {
  /** Radius of the glow in pixels. Cards may override it. */
  radius?: number;
}

/**
 * Tracks the pointer across every `GlowCard` inside it, so one light moves
 * across the whole set. Lay it out however you like — it is a plain `div`.
 */
export function GlowCardGroup({
  className,
  radius,
  style,
  onPointerMove,
  onPointerLeave,
  ...props
}: GlowCardGroupProps) {
  const cards = (root: HTMLElement) => root.querySelectorAll<HTMLElement>(CARD_SELECTOR);

  return (
    <GroupContext.Provider value={true}>
      <div
        data-slot="glow-card-group"
        className={cn("relative", className)}
        style={
          radius === undefined
            ? style
            : ({ "--glow-radius": `${String(radius)}px`, ...style } as CSSProperties)
        }
        onPointerMove={(event) => {
          onPointerMove?.(event);
          if (glowAllowed(event))
            paint(cards(event.currentTarget), event.clientX, event.clientY);
        }}
        onPointerLeave={(event) => {
          onPointerLeave?.(event);
          fade(cards(event.currentTarget));
        }}
        {...props}
      />
    </GroupContext.Provider>
  );
}

/** The colour of the glow. `glowColor` overrides it with any CSS colour. */
const glowCardVariants = cva(
  "group/glow-card relative isolate rounded-xl border border-border bg-card text-card-foreground",
  {
    variants: {
      tone: {
        primary: "[--glow-color:var(--color-primary)]",
        foreground: "[--glow-color:var(--color-foreground)]",
        success: "[--glow-color:var(--color-success)]",
        warning: "[--glow-color:var(--color-warning)]",
        info: "[--glow-color:var(--color-info)]",
        destructive: "[--glow-color:var(--color-destructive)]",
      },
    },
    defaultVariants: {
      tone: "primary",
    },
  },
);

/*
 * The glow layer: a tinted fill and a one-pixel ring in the glow colour,
 * masked to a soft disc around the pointer. The mask only reads alpha, so any
 * opaque colour draws it; a token keeps the audit's promise literal.
 */
const glowLayer = cn(
  "pointer-events-none absolute -inset-px rounded-[inherit] border border-(--glow-color)",
  "bg-[color-mix(in_oklab,var(--glow-color)_var(--glow-fill,15%),transparent)]",
  "shadow-[inset_0_0_0_1px_var(--glow-color)]",
  "[mask-image:radial-gradient(var(--glow-radius,200px)_circle_at_var(--glow-x,50%)_var(--glow-y,50%),var(--color-foreground),transparent)]",
  "opacity-[var(--glow-opacity,0)] transition-opacity duration-[var(--duration-normal)] ease-[var(--ease-out-quint)]",
  "motion-reduce:hidden",
);

export interface GlowCardProps
  extends ComponentPropsWithRef<"div">, VariantProps<typeof glowCardVariants> {
  /** Any CSS colour for the glow, overriding `tone`. */
  glowColor?: string;
  /** Strength of the tinted fill under the glow, 0–1. The ring is always full strength. */
  intensity?: number;
  /** Radius of the glow in pixels. Defaults to the group's, or 200. */
  radius?: number;
  /** Renders the child element as the card — a link or a button, say. */
  asChild?: boolean;
}

/**
 * A card surface with a pointer-following glow on its edge. Inside a
 * `GlowCardGroup` the group drives it; on its own it tracks itself.
 */
export function GlowCard({
  className,
  tone,
  glowColor,
  intensity,
  radius,
  asChild = false,
  style,
  children,
  onPointerMove,
  onPointerLeave,
  ...props
}: GlowCardProps) {
  const grouped = useContext(GroupContext);
  const Comp = asChild ? Slot.Root : "div";

  const vars: Record<string, string> = {};
  if (glowColor !== undefined) vars["--glow-color"] = glowColor;
  if (intensity !== undefined) vars["--glow-fill"] = `${String(Math.round(intensity * 100))}%`;
  if (radius !== undefined) vars["--glow-radius"] = `${String(radius)}px`;

  return (
    <Comp
      data-slot="glow-card"
      className={cn(glowCardVariants({ tone }), className)}
      style={{ ...vars, ...style }}
      onPointerMove={(event: PointerEvent<HTMLDivElement>) => {
        onPointerMove?.(event);
        if (!grouped && glowAllowed(event)) {
          paint([event.currentTarget], event.clientX, event.clientY);
        }
      }}
      onPointerLeave={(event: PointerEvent<HTMLDivElement>) => {
        onPointerLeave?.(event);
        if (!grouped) fade([event.currentTarget]);
      }}
      {...props}
    >
      <Slot.Slottable>{children}</Slot.Slottable>
      <span aria-hidden="true" data-slot="glow-card-glow" className={glowLayer} />
    </Comp>
  );
}

export { glowCardVariants };
