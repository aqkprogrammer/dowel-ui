"use client";

// Original design (pattern inspired by Animate UI Liquid Button; no code referenced).
import { cva, type VariantProps } from "class-variance-authority";
import {
  useState,
  type ComponentPropsWithRef,
  type KeyboardEvent,
  type PointerEvent,
} from "react";

import { disabledStyles, focusRing, iconSlot } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * An outlined button that fills with liquid.
 *
 * Hover it, focus it from the keyboard or hold it down, and a body of the
 * tone colour rises from below with a two-layer sine surface rolling across
 * its top. As the surface passes the label, the label turns: a duplicate in
 * the tone's foreground colour sits above the liquid, clipped to the same
 * level on the same timing, so the two read as one label changing colour
 * where the liquid touches it. Pressing sloshes the liquid — a short, damped
 * tilt and dip — and the clipped label dips with it.
 *
 * Everything is CSS. The rise is a transition on `translate` and
 * `clip-path`; the surface is an inline SVG tile twice the button's width,
 * translated by half its width on a loop so the wave never seams; the slosh is
 * a keyframe pair the button alternates between, so each press restarts it.
 * All of it is decoration, so the reduced-motion blanket stops the waves,
 * turns the rise into a swap and the slosh into nothing.
 *
 * Only the first label is exposed. The liquid and the duplicate label are
 * aria-hidden, so the name is read once, from `children` — give icon-only
 * buttons an `aria-label`. Because `children` render twice, avoid ids in them.
 */

const PREFIX = "dowel-liquid-button";

/** A duration on the motion scale. */
function scaled(ms: number): string {
  return `calc(${String(ms)}ms * var(--motion-scale, 1))`;
}

/** The damped slosh, as a transform on the liquid and the same dip as a clip on the label. */
const SLOSH_FRAMES = [
  { at: 0, dip: 0, tilt: 0 },
  { at: 16, dip: 16, tilt: -6 },
  { at: 38, dip: 7, tilt: 4 },
  { at: 60, dip: 3, tilt: -2 },
  { at: 80, dip: 1, tilt: 0.8 },
  { at: 100, dip: 0, tilt: 0 },
];

function sloshKeyframes(name: string): string {
  const liquid = SLOSH_FRAMES.map(
    (frame) =>
      `${String(frame.at)}%{transform:translateY(${String(frame.dip)}%) rotate(${String(frame.tilt)}deg)}`,
  ).join("");
  const label = SLOSH_FRAMES.map(
    (frame) => `${String(frame.at)}%{clip-path:inset(${String(frame.dip)}% 0 0 0)}`,
  ).join("");
  return `@keyframes ${PREFIX}-${name}{${liquid}}@keyframes ${PREFIX}-${name}-clip{${label}}`;
}

const SLOSH = `${scaled(900)} var(--ease-out-quint)`;

const STYLES = `
@keyframes ${PREFIX}-roll{to{translate:-50% 0}}
${sloshKeyframes("slosh-a")}
${sloshKeyframes("slosh-b")}
[data-slot=liquid-button-wave]{animation:${PREFIX}-roll ${scaled(1800)} linear infinite}
[data-slot=liquid-button-wave][data-layer=back]{animation-duration:${scaled(2600)};animation-direction:reverse}
[data-slot=liquid-button][data-slosh=a] [data-slot=liquid-button-slosh]{animation:${PREFIX}-slosh-a ${SLOSH}}
[data-slot=liquid-button][data-slosh=b] [data-slot=liquid-button-slosh]{animation:${PREFIX}-slosh-b ${SLOSH}}
[data-slot=liquid-button][data-slosh=a] [data-slot=liquid-button-fill-label-slosh]{animation:${PREFIX}-slosh-a-clip ${SLOSH}}
[data-slot=liquid-button][data-slosh=b] [data-slot=liquid-button-fill-label-slosh]{animation:${PREFIX}-slosh-b-clip ${SLOSH}}
`;

const liquidButtonVariants = cva(
  cn(
    "group/liquid relative isolate inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-current bg-background font-medium whitespace-nowrap select-none",
    "transition-[scale,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-out-quint)] motion-safe:active:scale-[0.97]",
    focusRing,
    disabledStyles,
    iconSlot,
  ),
  {
    variants: {
      /** The liquid's colour, which is also the outline and the resting label. */
      tone: {
        primary: "text-primary",
        foreground: "text-foreground",
        destructive: "text-destructive",
        success: "text-success",
      },
      size: {
        sm: "h-8 gap-1.5 px-4 text-sm",
        md: "h-10 gap-2 px-5 text-sm",
        lg: "h-12 gap-2.5 px-7 text-base",
      },
    },
    defaultVariants: {
      tone: "primary",
      size: "md",
    },
  },
);

/** The label colour above the liquid, per tone. Literal so Tailwind can see it. */
const ON_LIQUID = {
  primary: "text-primary-foreground",
  foreground: "text-background",
  destructive: "text-destructive-foreground",
  success: "text-success-foreground",
} as const;

/** Rise and drain share one timing, so the liquid and the clipped label stay level. */
const level = "duration-[var(--duration-slower)] ease-[var(--ease-in-out-quint)]";

/** Filled while hovered (on hover devices), keyboard-focused or held down. */
const RISEN =
  "group-hover/liquid:translate-y-0 group-focus-visible/liquid:translate-y-0 group-active/liquid:translate-y-0";
const UNCLIPPED =
  "group-hover/liquid:[clip-path:inset(0_0_0_0)] group-focus-visible/liquid:[clip-path:inset(0_0_0_0)] group-active/liquid:[clip-path:inset(0_0_0_0)]";

/** One period of the surface is 100 units; the tile holds two, so translating -50% loops seamlessly. */
const WAVE_PATH = "M0 6Q25 0 50 6T100 6T150 6T200 6V12H0Z";

function Wave({ layer }: { layer: "front" | "back" }) {
  return (
    <svg
      data-slot="liquid-button-wave"
      data-layer={layer}
      viewBox="0 0 200 12"
      preserveAspectRatio="none"
      aria-hidden="true"
      className={cn(
        "absolute bottom-[calc(100%-1px)] left-0 w-[200%] fill-current", // rtl-ok: a seamless tile scrolled by its own width
        layer === "front" ? "h-[0.55em]" : "h-[0.8em] opacity-45",
      )}
    >
      <path d={WAVE_PATH} />
    </svg>
  );
}

export interface LiquidButtonProps
  extends ComponentPropsWithRef<"button">, VariantProps<typeof liquidButtonVariants> {}

/** An outlined button that fills with rolling liquid on hover, focus and press, inverting its label. */
export function LiquidButton({
  className,
  tone,
  size,
  children,
  disabled,
  type = "button",
  onPointerDown,
  onKeyDown,
  ...props
}: LiquidButtonProps) {
  const [slosh, setSlosh] = useState<"a" | "b" | undefined>(undefined);

  function startSlosh() {
    if (disabled) return;
    // Alternating between two identical keyframes restarts the animation on every press.
    setSlosh((current) => (current === "a" ? "b" : "a"));
  }

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>) {
    onPointerDown?.(event);
    if (event.defaultPrevented || event.button !== 0) return;
    startSlosh();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    onKeyDown?.(event);
    if (event.defaultPrevented || event.repeat) return;
    if (event.key === "Enter" || event.key === " ") startSlosh();
  }

  return (
    <button
      type={type}
      data-slot="liquid-button"
      data-slosh={slosh}
      disabled={disabled}
      className={cn(liquidButtonVariants({ tone, size }), className)}
      onPointerDown={handlePointerDown}
      onKeyDown={handleKeyDown}
      {...props}
    >
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      <span data-slot="liquid-button-label" className="inline-flex items-center gap-[inherit]">
        {children}
      </span>
      <span
        data-slot="liquid-button-liquid"
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute -inset-x-1/4 inset-y-0 translate-y-[calc(100%+0.8em)] transition-[translate]",
          level,
          RISEN,
        )}
      >
        <span data-slot="liquid-button-slosh" className="absolute inset-0 origin-top">
          <Wave layer="back" />
          <Wave layer="front" />
          <span className="absolute inset-x-0 top-0 h-[200%] bg-current" />
        </span>
      </span>
      <span
        data-slot="liquid-button-fill-label"
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0 gap-[inherit] transition-[clip-path] [clip-path:inset(calc(100%+0.8em)_0_0_0)]",
          level,
          UNCLIPPED,
          ON_LIQUID[tone ?? "primary"],
        )}
      >
        <span
          data-slot="liquid-button-fill-label-slosh"
          className="flex size-full items-center justify-center gap-[inherit]"
        >
          {children}
        </span>
      </span>
    </button>
  );
}

export { liquidButtonVariants };
