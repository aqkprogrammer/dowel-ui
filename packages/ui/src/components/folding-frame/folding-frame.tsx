"use client";

// Ported from bencho Folding frame (MIT, © 2026 Lorenzo Cabra). See THIRD_PARTY_NOTICES.md.
import { cva, type VariantProps } from "class-variance-authority";
import { Direction } from "radix-ui";
import {
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentPropsWithRef,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A photo folded shut like a book: the start half is turned over onto the end
 * half, the closed card leans back in 3D, and dragging across it opens the
 * cover until the whole photo lies flat and face-on.
 *
 * The source had no keyboard path. Here a transparent role="slider" overlay
 * ("Unfold", 0–100 % open) takes the pointer and the keys: arrows ±5 (left and
 * right follow the reading direction), Page Up/Down ±25, Home shut, End open.
 * The photo is exposed once, as role="img" named by `alt`; the halves, spine
 * and shading are aria-hidden inside it.
 *
 * The drag is direct manipulation: the cover angle follows the pointer's
 * position, not its momentum, so there is no spring and no `motion`. Keyboard
 * steps and the optional release `snap` ease with a CSS transition that the
 * global reduced-motion rule makes instant.
 *
 * The liquid hinge band refracts with `backdrop-filter: blur() url(#warp)`,
 * which only Chromium renders. Elsewhere it falls back to the blur alone;
 * `data-liquid` on the root says which ("svg" or "fallback").
 *
 * In right-to-left layouts the book opens the other way: the cover is the
 * inline-end half and the drag runs left-to-right.
 */

/** Cover angle when shut, in degrees. */
const SHUT = 176;

const foldingFrameVariants = cva(
  "[container-type:inline-size] relative aspect-[300/214] w-75 touch-pan-y select-none",
  {
    variants: {
      fill: {
        light: "[--ff-ink:var(--color-foreground)] [--ff-surface:var(--color-card)]",
        dark: "[--ff-ink:var(--color-background)] [--ff-surface:var(--color-foreground)]",
      },
    },
    defaultVariants: {
      fill: "light",
    },
  },
);

export interface FoldingFrameProps
  extends
    Omit<ComponentPropsWithRef<"div">, "defaultValue" | "onChange" | "children">,
    VariantProps<typeof foldingFrameVariants> {
  /** Image URL of the photo. */
  src: string;
  /** Describes the photo. It names the frame's role="img". */
  alt: string;
  /** How open the frame is, 0 (shut) to 100 (flat open). */
  value?: number;
  /** Uncontrolled starting openness. Defaults to 0: shut. */
  defaultValue?: number;
  /** Called on every change: while dragging, per key press and on a release snap. */
  onValueChange?: (value: number) => void;
  /** Called when an interaction ends: pointer released or key press. */
  onValueCommit?: (value: number) => void;
  /** Settle fully open or shut when the pointer is released. */
  snap?: boolean;
  /** Strength of the liquid hinge refraction (blur and warp), 0–100. */
  liquid?: number;
  /** Perspective, tilt and shadow strength, 0–100. */
  depth?: number;
  /** Spine width and panel separation in px, 0–18. */
  thickness?: number;
  /** Corner radius in px, 0–24. */
  corner?: number;
  /** Accessible name of the slider. */
  label?: string;
  disabled?: boolean;
}

const clamp = (value: number, lo: number, hi: number) => Math.min(Math.max(value, lo), hi);

function valueText(value: number): string {
  if (value <= 0) return "Closed";
  if (value >= 100) return "Open";
  return `${String(value)}% open`;
}

type UAData = { brands?: { brand: string }[] };

/** Whether this engine renders an SVG filter inside `backdrop-filter`. */
function supportsLiquid(): boolean {
  if (typeof navigator === "undefined") return false;
  const brands = (navigator as Navigator & { userAgentData?: UAData }).userAgentData?.brands;
  if (brands) return brands.some((entry) => entry.brand === "Chromium");
  return /Chrom(e|ium)\//.test(navigator.userAgent);
}
const subscribe = () => () => {};

/** A photo folded shut like a book, opened by dragging across it or from the keyboard. */
export function FoldingFrame({
  className,
  style,
  fill,
  src,
  alt,
  value: valueProp,
  defaultValue = 0,
  onValueChange,
  onValueCommit,
  snap = false,
  liquid = 60,
  depth = 55,
  thickness = 9,
  corner = 14,
  label = "Unfold",
  disabled = false,
  dir: dirProp,
  ...props
}: FoldingFrameProps) {
  const dir = Direction.useDirection(dirProp as "ltr" | "rtl" | undefined);
  const rtl = dir === "rtl";
  const [uncontrolled, setUncontrolled] = useState(() =>
    Math.round(clamp(defaultValue, 0, 100)),
  );
  const controlled = valueProp !== undefined;
  const value = Math.round(clamp(controlled ? valueProp : uncontrolled, 0, 100));
  const [dragging, setDragging] = useState(false);
  const latest = useRef(value);
  const warpId = `ff-warp-${useId().replace(/:/g, "")}`;
  const liquidMode = useSyncExternalStore(
    subscribe,
    () => (supportsLiquid() ? "svg" : "fallback"),
    () => "fallback",
  );

  function setValue(raw: number): number {
    const next = Math.round(clamp(raw, 0, 100));
    latest.current = next;
    if (next === value) return next;
    if (!controlled) setUncontrolled(next);
    onValueChange?.(next);
    return next;
  }

  /* Pointer: the cover angle follows x. ~90% across is shut, ≤10% is flat. */
  function fromPointer(event: PointerEvent<HTMLDivElement>): number | null {
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width === 0) return null;
    const along = (event.clientX - rect.left) / rect.width;
    const reach = rtl ? 1 - along : along;
    return 100 * (1 - (reach - 0.1) / 0.8);
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (disabled || event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    latest.current = value;
    setDragging(true);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    const next = fromPointer(event);
    if (next !== null) setValue(next);
  }

  function handlePointerEnd() {
    if (!dragging) return;
    setDragging(false);
    const settled = snap ? setValue(latest.current >= 50 ? 100 : 0) : latest.current;
    onValueCommit?.(settled);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (disabled) return;
    const forward = rtl ? -5 : 5;
    const moves: Record<string, number> = {
      ArrowRight: forward,
      ArrowLeft: -forward,
      ArrowUp: 5,
      ArrowDown: -5,
      PageUp: 25,
      PageDown: -25,
    };
    let next: number;
    if (event.key === "Home") next = 0;
    else if (event.key === "End") next = 100;
    else if (event.key in moves) next = value + (moves[event.key] ?? 0);
    else return;
    event.preventDefault();
    const committed = setValue(next);
    onValueCommit?.(committed);
  }

  /* Geometry ----------------------------------------------------------- */
  const closed = 1 - value / 100;
  const angle = SHUT * closed;
  const side = rtl ? -1 : 1;
  const strength = clamp(depth, 0, 100) / 55;
  const t = clamp(thickness, 0, 18);
  const r = clamp(corner, 0, 24);
  const wet = clamp(liquid, 0, 100) / 60;
  // Darkest mid-fold (55°–100°), clear when shut or flat.
  const shade = 0.4 * Math.min(1, angle / 55, (SHUT - angle) / 76) * Math.min(strength, 1.6);
  const cast = clamp(0.55 * closed * strength, 0, 1);
  const blur = 6.6 * closed * wet;
  const sheen = `brightness(${(1 + 0.26 * closed * Math.min(wet, 1)).toFixed(3)})`;
  const ease = dragging
    ? "none"
    : "transform var(--duration-slow) var(--ease-out-quint), opacity var(--duration-slow) var(--ease-out-quint), width var(--duration-slow) var(--ease-out-quint)";
  const ink = (percent: number) =>
    `color-mix(in oklab, var(--ff-ink) ${String(percent)}%, transparent)`;
  // Shade on the photo is dark in both themes, so it comes from the overlay
  // token (a translucent near-black in light and dark). Its own alpha is about
  // 0.55, so the mix is scaled up to land near the measured opacities.
  const dark = (percent: number) =>
    `color-mix(in oklab, var(--color-overlay) ${String(Math.min(100, Math.round(percent * 1.6)))}%, transparent)`;
  const towardHinge = rtl ? "to left" : "to right";
  const coverRadius = rtl
    ? `0 ${String(r)}px ${String(r)}px 0`
    : `${String(r)}px 0 0 ${String(r)}px`;
  const restRadius = rtl
    ? `${String(r)}px 0 0 ${String(r)}px`
    : `0 ${String(r)}px ${String(r)}px 0`;
  const coverLeft = rtl ? "50%" : "0";
  const restLeft = rtl ? "0" : "50%";

  const half: CSSProperties = {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: "50%",
    transformStyle: "preserve-3d",
  };
  const face: CSSProperties = {
    position: "absolute",
    inset: 0,
    overflow: "hidden",
    backfaceVisibility: "hidden",
    background: "var(--ff-surface)",
  };
  // The photo is twice a half's width; each half shows its own side of it.
  const photo = (showStart: boolean, opacity = 1) => (
    <img
      src={src}
      alt=""
      draggable={false}
      style={{
        position: "absolute",
        top: 0,
        left: showStart === !rtl ? "0" : "-100%",
        width: "200%",
        height: "100%",
        maxWidth: "none",
        objectFit: "cover",
        opacity,
      }}
    />
  );

  return (
    <div
      data-slot="folding-frame"
      data-state={value >= 100 ? "open" : value <= 0 ? "closed" : "partial"}
      data-dragging={dragging ? "" : undefined}
      data-disabled={disabled ? "" : undefined}
      data-liquid={liquidMode}
      dir={dirProp}
      className={cn(foldingFrameVariants({ fill }), disabled && "opacity-55", className)}
      style={style}
      {...props}
    >
      <svg width="0" height="0" aria-hidden="true" className="absolute">
        <defs>
          <filter id={warpId}>
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.012 0.06"
              numOctaves={2}
              seed={3}
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale={(18 * wet).toFixed(2)}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>
      <div
        role="img"
        aria-label={alt}
        data-slot="folding-frame-stage"
        className="absolute inset-0"
        style={{ perspective: `${(300 / Math.max(strength, 0.3)).toFixed(1)}cqi` }}
      >
        <div
          data-slot="folding-frame-rig"
          className="absolute inset-0"
          style={{
            transformStyle: "preserve-3d",
            transition: ease,
            transform: `translateX(${(-25 * closed * side).toFixed(3)}%) rotateX(${(-15 * closed * strength).toFixed(3)}deg) rotateY(${(13 * closed * strength * side).toFixed(3)}deg)`,
          }}
        >
          <div
            data-slot="folding-frame-spine"
            className="absolute inset-y-0"
            style={{
              left: "50%",
              width: t,
              borderRadius: t / 2,
              background: `linear-gradient(to right, ${ink(50)}, ${ink(82)}, ${ink(62)})`,
              transform: `translateX(-50%) translateZ(${String(-t / 2)}px)`,
            }}
          />
          <div
            data-slot="folding-frame-rest"
            style={{ ...half, left: restLeft, transform: `translateZ(${String(-t / 2)}px)` }}
          >
            <div style={{ ...face, borderRadius: restRadius }}>
              {photo(false)}
              <div
                data-slot="folding-frame-cast"
                className="absolute inset-0"
                style={{
                  opacity: cast,
                  transition: ease,
                  background: `linear-gradient(${towardHinge}, ${dark(62)}, ${dark(6)})`,
                }}
              />
            </div>
          </div>
          <div
            data-slot="folding-frame-cover"
            style={{
              ...half,
              left: coverLeft,
              transformOrigin: rtl ? "left center" : "right center",
              transition: ease,
              transform: `rotateY(${(angle * side).toFixed(3)}deg) translateZ(${String(-t / 2)}px)`,
            }}
          >
            <div style={{ ...face, borderRadius: coverRadius }}>
              {photo(true)}
              <div
                data-slot="folding-frame-shade"
                className="absolute inset-0"
                style={{
                  opacity: shade,
                  transition: ease,
                  background: `linear-gradient(${towardHinge}, transparent, ${dark(50)})`,
                }}
              />
            </div>
            <div
              data-slot="folding-frame-back"
              style={{
                ...face,
                borderRadius: coverRadius,
                transform: "rotateY(180deg)",
                background: "color-mix(in oklab, var(--ff-surface) 82%, var(--ff-ink))",
              }}
            >
              {photo(false, 0.5)}
            </div>
          </div>
          {wet > 0 ? (
            <div
              data-slot="folding-frame-liquid"
              className="pointer-events-none absolute inset-y-0"
              style={{
                left: "50%",
                width: `${(11.67 * closed * wet).toFixed(3)}cqi`,
                transition: ease,
                transform: `translateX(-50%) translateZ(${String(t / 2 + 1)}px)`,
                // The sheen brightens the photo under the band rather than
                // painting a colour over it, so it reads as light in both
                // themes; the mask gives it soft edges.
                maskImage:
                  "linear-gradient(to right, transparent, currentColor 30%, currentColor 70%, transparent)",
                backdropFilter:
                  liquidMode === "svg"
                    ? `blur(${blur.toFixed(2)}px) ${sheen} url(#${warpId})`
                    : `blur(${blur.toFixed(2)}px) ${sheen}`,
                WebkitBackdropFilter: `blur(${blur.toFixed(2)}px) ${sheen}`,
              }}
            />
          ) : null}
        </div>
      </div>
      <div
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        aria-valuetext={valueText(value)}
        aria-orientation="horizontal"
        aria-disabled={disabled || undefined}
        data-slot="folding-frame-handle"
        className={cn(
          "absolute inset-0 z-10",
          disabled ? "cursor-not-allowed" : "cursor-grab active:cursor-grabbing",
          focusRing,
        )}
        style={{ borderRadius: r }}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
      />
    </div>
  );
}

export { foldingFrameVariants };
