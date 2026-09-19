"use client";

// Ported from bencho Glass bubble (MIT, © 2026 Lorenzo Cabra). See THIRD_PARTY_NOTICES.md.
import { Direction } from "radix-ui";
import {
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentPropsWithRef,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A round glass lens you drag over content. It refracts what is under it —
 * magnifying the middle, bending towards the rim, with red and blue fringing —
 * through an SVG filter used as a backdrop-filter.
 *
 * The filter is an feImage displacement map (drawn on a canvas, redrawn when
 * `bend` or `size` changes) fed to three feDisplacementMap passes at slightly
 * different scales, one per colour channel, recombined with feBlend screen.
 *
 * `backdrop-filter: url(#…)` only works in Chromium. Everywhere else the lens
 * falls back to a plain `blur() saturate()` bubble; `data-lens` on the root
 * reports which one is showing ("svg" | "fallback").
 *
 * The drag is 1:1 with no spring, so there is no animation library. The one
 * transition — the shadow tightening while the bubble is held — runs on the
 * duration tokens and stops under reduced motion like every other.
 */

export interface GlassBubbleValue {
  /** Percent of travel from the inline-start edge (0-100). */
  x: number;
  /** Percent of travel from the top edge (0-100). */
  y: number;
}

export type GlassBubbleLens = "auto" | "svg" | "fallback";

const CENTRE: GlassBubbleValue = { x: 50, y: 50 };
const STEP = 2;
const BIG_STEP = 6;
const BASE_SCALE = 160;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function clampValue(value: GlassBubbleValue): GlassBubbleValue {
  return { x: clamp(value.x, 0, 100), y: clamp(value.y, 0, 100) };
}

interface BrandedNavigator {
  userAgentData?: { brands?: { brand: string }[] };
}

/** True where SVG filters work inside backdrop-filter (Chromium engines). */
export function supportsSvgBackdrop(
  nav: Navigator | undefined = globalThis.navigator,
): boolean {
  if (!nav) return false;
  const brands = (nav as Navigator & BrandedNavigator).userAgentData?.brands;
  if (brands) return brands.some(({ brand }) => brand === "Chromium");
  // No client hints: Chromium says Chrome/, and WebKit shells (CriOS, Safari) do not.
  return /\b(?:Chrome|Chromium)\//.test(nav.userAgent) && !/\bCriOS\//.test(nav.userAgent);
}

const subscribeNever = () => () => {};

/** The three channel scales for a fringe (0-40): 0 keeps them equal. */
export function glassBubbleScales(fringe: number) {
  const spread = clamp(fringe, 0, 40) * 0.16;
  return { r: BASE_SCALE + spread, g: BASE_SCALE, b: BASE_SCALE - spread };
}

/**
 * Draws the displacement map: red carries the x offset, green the y offset,
 * 0.5 meaning none. Inside the circle each pixel samples closer to the centre
 * (magnifying), more so towards the rim (bending). Null when there is no 2D
 * canvas (jsdom, some locked-down browsers).
 */
export function drawDisplacementMap(size: number, bend: number): string | null {
  if (typeof document === "undefined") return null;
  const px = Math.max(1, Math.round(size));
  const canvas = document.createElement("canvas");
  canvas.width = px;
  canvas.height = px;
  let context: CanvasRenderingContext2D | null;
  try {
    context = canvas.getContext("2d");
  } catch {
    return null;
  }
  if (!context) return null;
  const image = context.createImageData(px, px);
  const strength = clamp(bend, 0, 100) / 100;
  const radius = px / 2;
  for (let row = 0; row < px; row++) {
    for (let col = 0; col < px; col++) {
      const nx = (col + 0.5 - radius) / radius;
      const ny = (row + 0.5 - radius) / radius;
      const d = Math.hypot(nx, ny);
      let ox = 0;
      let oy = 0;
      if (d < 1) {
        const rim = 1 - Math.sqrt(1 - d * d);
        const pull = strength * (0.1 + 0.22 * rim);
        ox = -nx * pull;
        oy = -ny * pull;
      }
      const i = (row * px + col) * 4;
      image.data[i] = Math.round(clamp(0.5 + ox, 0, 1) * 255);
      image.data[i + 1] = Math.round(clamp(0.5 + oy, 0, 1) * 255);
      image.data[i + 2] = 128;
      image.data[i + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
  return canvas.toDataURL();
}

/* Glass light and shade: whichever of background/foreground is lighter or darker. */
const light = (amount: number) =>
  `color-mix(in oklab, var(--glass-bubble-light) ${String(amount)}%, transparent)`;
const dark = (amount: number) =>
  `color-mix(in oklab, var(--glass-bubble-dark) ${String(amount)}%, transparent)`;

const SPECULAR: CSSProperties = {
  backgroundImage: [
    `radial-gradient(circle at 28% 20%, ${light(95)} 0, ${light(0)} 9%)`,
    `radial-gradient(circle at 31% 24%, ${light(45)} 0, ${light(0)} 30%)`,
    `radial-gradient(circle at 73% 83%, ${light(22)} 0, ${light(0)} 22%)`,
  ].join(", "),
};

const RIM = `inset 0 1px 0 ${light(34)}, inset 0 -1px 0 ${light(14)}, inset 0 0 0 0.5px ${light(10)}`;
const SHADOW_REST = `${RIM}, 0 10px 22px ${dark(32)}, 0 2px 6px ${dark(20)}`;
const SHADOW_HELD = `${RIM}, 0 5px 12px ${dark(32)}, 0 1px 4px ${dark(20)}`;

export interface GlassBubbleProps extends Omit<
  ComponentPropsWithRef<"div">,
  "defaultValue" | "onChange"
> {
  /** The content under the lens (an image, a gradient, anything). */
  children?: ReactNode;
  /** Bubble diameter in px, 80-240. */
  size?: number;
  /** Lens curvature, 0-100: how strongly it magnifies and bends. */
  bend?: number;
  /** Chromatic spread at the rim, 0-40. */
  fringe?: number;
  /** Position in percent of travel (controlled). */
  value?: GlassBubbleValue;
  /** Starting position (uncontrolled). Defaults to the centre. */
  defaultValue?: GlassBubbleValue;
  /** Called with the new position as the bubble is dragged or nudged. */
  onValueChange?: (value: GlassBubbleValue) => void;
  /** Stops dragging and keyboard nudging. */
  disabled?: boolean;
  /**
   * Which lens to draw. "auto" uses the SVG refraction in Chromium and the
   * blur fallback elsewhere; the others force one (the SVG lens renders as
   * plain glass where it is unsupported).
   */
  lens?: GlassBubbleLens;
}

/**
 * A draggable glass lens that refracts the content under it. The bubble is a
 * 2D slider (`role="slider"`): arrow keys move it 2% (Shift: 6%), mirrored in
 * right-to-left layouts, and Home centres it. `data-lens` on the root says
 * whether the SVG refraction ("svg", Chromium) or the blur fallback is in use.
 * `aria-label` / `aria-labelledby` name the bubble (default "Glass bubble").
 */
export function GlassBubble({
  className,
  children,
  size = 132,
  bend = 70,
  fringe = 18,
  value,
  defaultValue = CENTRE,
  onValueChange,
  disabled = false,
  lens = "auto",
  "aria-label": ariaLabel = "Glass bubble",
  "aria-labelledby": ariaLabelledBy,
  ...props
}: GlassBubbleProps) {
  const diameter = clamp(size, 80, 240);
  const [uncontrolled, setUncontrolled] = useState(() => clampValue(defaultValue));
  const position = clampValue(value ?? uncontrolled);
  const [held, setHeld] = useState(false);
  const dir = Direction.useDirection();
  const filterId = `dowel-glass-bubble-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const chromium = useSyncExternalStore(subscribeNever, supportsSvgBackdrop, () => false);
  const mode = lens === "auto" ? (chromium ? "svg" : "fallback") : lens;

  const fieldRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; x: number; y: number; from: GlassBubbleValue } | null>(
    null,
  );

  // Drawn only once hydrated, so the server and the first client render agree.
  const hydrated = useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );
  const map = useMemo(
    () => (hydrated && mode === "svg" ? drawDisplacementMap(diameter, bend) : null),
    [hydrated, mode, diameter, bend],
  );
  const scales = glassBubbleScales(fringe);

  function commit(next: GlassBubbleValue) {
    const clamped = clampValue(next);
    if (clamped.x === position.x && clamped.y === position.y) return;
    if (value === undefined) setUncontrolled(clamped);
    onValueChange?.(clamped);
  }

  function isRtl(element: Element) {
    return dir === "rtl" || element.closest("[dir]")?.getAttribute("dir") === "rtl";
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
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

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (disabled || event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, from: position };
    setHeld(true);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const start = drag.current;
    const field = fieldRef.current;
    if (!start || start.id !== event.pointerId || !field) return;
    const box = field.getBoundingClientRect();
    const travelX = box.width - diameter;
    const travelY = box.height - diameter;
    const flip = isRtl(event.currentTarget) ? -1 : 1;
    commit({
      x: travelX > 0 ? start.from.x + (((event.clientX - start.x) * flip) / travelX) * 100 : 50,
      y: travelY > 0 ? start.from.y + ((event.clientY - start.y) / travelY) * 100 : 50,
    });
  }

  function handlePointerEnd(event: PointerEvent<HTMLDivElement>) {
    if (drag.current?.id !== event.pointerId) return;
    drag.current = null;
    setHeld(false);
  }

  const across = Math.round(position.x);
  const down = Math.round(position.y);
  const backdrop =
    mode === "svg"
      ? `url(#${filterId}) saturate(1.12) brightness(1.04)`
      : "blur(3px) saturate(1.3) brightness(1.04)";

  return (
    <div
      ref={fieldRef}
      data-slot="glass-bubble"
      data-lens={mode}
      className={cn(
        "relative isolate aspect-square w-full max-w-[37.5rem] select-none",
        "[--glass-bubble-dark:var(--color-foreground)] [--glass-bubble-light:var(--color-background)]",
        "dark:[--glass-bubble-dark:var(--color-background)] dark:[--glass-bubble-light:var(--color-foreground)]",
        className,
      )}
      {...props}
    >
      <div data-slot="glass-bubble-content" className="absolute inset-0">
        {children}
      </div>
      {mode === "svg" && (
        <svg
          aria-hidden="true"
          data-slot="glass-bubble-filter"
          width="0"
          height="0"
          className="pointer-events-none absolute"
        >
          <filter
            id={filterId}
            x="0"
            y="0"
            width={diameter}
            height={diameter}
            filterUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
          >
            {map && (
              <feImage
                href={map}
                x="0"
                y="0"
                width={diameter}
                height={diameter}
                preserveAspectRatio="none"
                result="map"
              />
            )}
            {(["r", "g", "b"] as const).map((channel) => (
              <ChannelPass key={channel} channel={channel} scale={scales[channel]} />
            ))}
            <feBlend in="lens-r" in2="lens-g" mode="screen" result="lens-rg" />
            <feBlend in="lens-rg" in2="lens-b" mode="screen" />
          </filter>
        </svg>
      )}
      <div
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label={ariaLabelledBy ? undefined : ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={across}
        aria-valuetext={`${String(across)} across, ${String(down)} down`}
        aria-disabled={disabled || undefined}
        data-slot="glass-bubble-lens"
        data-held={held ? "" : undefined}
        className={cn(
          "absolute touch-none rounded-full",
          disabled ? "cursor-not-allowed opacity-55" : held ? "cursor-grabbing" : "cursor-grab",
          focusRing,
        )}
        style={{
          width: diameter,
          height: diameter,
          insetInlineStart: `calc((100% - ${String(diameter)}px) * ${String(position.x / 100)})`,
          top: `calc((100% - ${String(diameter)}px) * ${String(position.y / 100)})`,
          backdropFilter: backdrop,
          WebkitBackdropFilter: backdrop,
        }}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
      >
        <span
          aria-hidden="true"
          data-slot="glass-bubble-specular"
          className="pointer-events-none absolute inset-0 rounded-full"
          style={SPECULAR}
        />
        <span
          aria-hidden="true"
          data-slot="glass-bubble-rim"
          className="pointer-events-none absolute inset-0 rounded-full transition-shadow duration-[var(--duration-fast)] ease-[var(--ease-out-quint)]"
          style={{ boxShadow: held ? SHADOW_HELD : SHADOW_REST }}
        />
      </div>
    </div>
  );
}

const CHANNEL_MATRIX = {
  r: "1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0",
  g: "0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0",
  b: "0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0",
} as const;

/** One displacement pass, kept to a single colour channel. */
function ChannelPass({ channel, scale }: { channel: "r" | "g" | "b"; scale: number }) {
  return (
    <>
      <feDisplacementMap
        in="SourceGraphic"
        in2="map"
        scale={scale}
        xChannelSelector="R"
        yChannelSelector="G"
        result={`shift-${channel}`}
      />
      <feColorMatrix
        in={`shift-${channel}`}
        type="matrix"
        values={CHANNEL_MATRIX[channel]}
        result={`lens-${channel}`}
      />
    </>
  );
}
