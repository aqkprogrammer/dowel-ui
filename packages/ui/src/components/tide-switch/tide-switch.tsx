"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { Switch as SwitchPrimitive } from "radix-ui";
import { useId, useState, type ComponentPropsWithRef, type CSSProperties } from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A switch drawn as a tide pool. Water fills the track with a rolling surface,
 * light rays and rising bubbles; the thumb is a glass fishbowl with a small
 * goldfish in it. Off, the pool is a pale lagoon; on, the bowl floats across,
 * its water sloshes, and the pool deepens to night-time navy.
 *
 * Every colour is a custom property (`--tide-*`) that the checked state swaps,
 * with fills transitioning, so the water darkens as the bowl travels. Built on
 * the Radix switch primitive (switch role, Space/Enter, hidden input in forms).
 * Durations scale with --motion-scale. The waves, bubbles and fish stop under
 * reduced motion; the slosh only plays after a toggle.
 */

const P = "dowel-tide";

const s = (seconds: number) => `calc(${String(seconds)}s * var(--motion-scale, 1))`;

const TRAVEL = 0.9;
const EASE = "cubic-bezier(.6,0,.3,1)";
const OFF_X = 98;
const ON_X = 302;
const CY = 95;
const PERIOD = 80;

const STYLES = `
.${P}{direction:ltr;
--tide-frame-hi:#ffffff;--tide-frame:#e9f6f7;--tide-frame-lo:#c9e2e5;--tide-lip:#a9cdd2;
--tide-air-top:#f4fbfb;--tide-air:#ddf0f1;--tide-water:#3aa7ad;--tide-water-hi:#5cc3c6;--tide-deep:#1f7f88;
--tide-line:#ffffff;--tide-glass:#ffffff;--tide-fish:#ff8a2a;--tide-fish-lo:#d9601a;--tide-eye:#1a1a1a;
--tide-glow:#5ac8ff}
.${P}[data-state=checked]{
--tide-frame-hi:#24507e;--tide-frame:#12355a;--tide-frame-lo:#08203a;--tide-lip:#051629;
--tide-air-top:#0a1e38;--tide-air:#0f2b4c;--tide-water:#1f5eae;--tide-water-hi:#2f78cc;--tide-deep:#123e7c}
.${P} svg *{transition:fill ${s(TRAVEL)} ease-in-out,stop-color ${s(TRAVEL)} ease-in-out,opacity ${s(TRAVEL)} ease-in-out}
.${P} [data-part=bowl]{transform:translate(${String(OFF_X)}px,${String(CY)}px);transition:transform ${s(TRAVEL)} ${EASE}}
.${P}[data-state=checked] [data-part=bowl]{transform:translate(${String(ON_X)}px,${String(CY)}px)}
.${P} [data-part=glow]{opacity:0}
.${P}[data-state=checked] [data-part=glow]{opacity:1}
.${P} [data-part=wave-a]{animation:${P}-roll ${s(3.2)} linear infinite}
.${P} [data-part=wave-b]{animation:${P}-roll ${s(5)} linear infinite reverse}
.${P} [data-part=bubble]{animation:${P}-rise ${s(3.4)} ease-in infinite;animation-delay:var(--d)}
.${P} [data-part=fish]{animation:${P}-swim ${s(2.6)} ease-in-out infinite}
.${P} [data-part=bowl-wave]{animation:${P}-roll ${s(2.2)} linear infinite}
.${P}[data-moved][data-state=checked] [data-part=slosh]{animation:${P}-slosh-a ${s(1.2)} ease-out}
.${P}[data-moved][data-state=unchecked] [data-part=slosh]{animation:${P}-slosh-b ${s(1.2)} ease-out}
@keyframes ${P}-roll{from{transform:translateX(0)}to{transform:translateX(-${String(PERIOD)}px)}}
@keyframes ${P}-rise{0%{transform:translateY(0);opacity:0}15%{opacity:.8}85%{opacity:.6}100%{transform:translateY(-52px);opacity:0}}
@keyframes ${P}-swim{0%,100%{transform:translate(0,0)}25%{transform:translate(-5px,2px)}50%{transform:translate(-9px,-1px)}75%{transform:translate(-4px,-2px)}}
@keyframes ${P}-slosh-a{0%{transform:rotate(0)}25%{transform:rotate(-14deg)}55%{transform:rotate(9deg)}80%{transform:rotate(-4deg)}100%{transform:rotate(0)}}
@keyframes ${P}-slosh-b{0%{transform:rotate(0)}25%{transform:rotate(14deg)}55%{transform:rotate(-9deg)}80%{transform:rotate(4deg)}100%{transform:rotate(0)}}
@media (prefers-reduced-motion:reduce){.${P} [data-part]{animation:none!important}}
`;

const tideSwitchVariants = cva(
  cn(
    "relative inline-block shrink-0 overflow-hidden rounded-full select-none",
    "aspect-[400/190] cursor-pointer",
    "disabled:cursor-not-allowed disabled:opacity-55",
    focusRing,
  ),
  {
    variants: {
      size: { sm: "w-36", md: "w-56", lg: "w-80" },
    },
    defaultVariants: { size: "md" },
  },
);

export interface TideSwitchProps
  extends
    Omit<ComponentPropsWithRef<typeof SwitchPrimitive.Root>, "children">,
    VariantProps<typeof tideSwitchVariants> {}

const v = (name: string) => `var(--tide-${name})`;
const fill = (name: string): CSSProperties => ({ fill: v(name) });
const stop = (name: string, opacity?: number): CSSProperties => ({
  stopColor: v(name),
  stopOpacity: opacity,
});

/** A closed wave: a sine surface at `y` from `x0`, filled down to `bottom`. */
function wave(x0: number, width: number, y: number, amp: number, bottom: number) {
  const half = PERIOD / 2;
  let d = `M${String(x0)} ${String(y)}`;
  for (let x = x0; x < x0 + width; x += PERIOD) {
    d += ` q${String(PERIOD / 4)} ${String(-amp)} ${String(half)} 0 t${String(half)} 0`;
  }
  return `${d} V${String(bottom)} H${String(x0)} Z`;
}

/** An open wavy line, for the ripples near the floor. */
function ripple(y: number, amp: number) {
  let d = `M-80 ${String(y)}`;
  for (let x = -80; x < 480; x += PERIOD) {
    d += ` q${String(PERIOD / 4)} ${String(-amp)} ${String(PERIOD / 2)} 0 t${String(PERIOD / 2)} 0`;
  }
  return d;
}

/** Bubbles rising through the pool: x, y, r, delay. */
const BUBBLES = [
  [150, 160, 2.5, 0],
  [196, 166, 1.8, 1.1],
  [236, 158, 2.2, 2.2],
  [270, 168, 1.6, 0.6],
  [118, 164, 1.6, 1.8],
  [330, 162, 2, 2.8],
] as const;

/** A goldfish in pixels, facing right, centred near the origin. */
const FISH = [
  [-9, -4, 4, 8, "fish-lo"],
  [-6, -2, 2, 4, "fish-lo"],
  [-4, -4, 12, 8, "fish"],
  [-2, -6, 8, 2, "fish"],
  [-2, 4, 8, 2, "fish"],
  [8, -2, 2, 4, "fish"],
  [0, -6, 4, 2, "fish-lo"],
  [4, -2, 2, 2, "eye"],
] as const;

export function TideSwitch({ className, size, onCheckedChange, ...props }: TideSwitchProps) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [moved, setMoved] = useState(false);
  const url = (name: string) => `url(#${id}-${name})`;

  return (
    <>
      <style href={P} precedence="dowel">
        {STYLES}
      </style>
      <SwitchPrimitive.Root
        data-slot="tide-switch"
        data-moved={moved ? "" : undefined}
        className={cn(P, tideSwitchVariants({ size }), className)}
        onCheckedChange={(checked) => {
          setMoved(true);
          onCheckedChange?.(checked);
        }}
        {...props}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 400 190"
          className="block size-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id={`${id}-frame`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" style={stop("frame-hi")} />
              <stop offset=".5" style={stop("frame")} />
              <stop offset="1" style={stop("frame-lo")} />
            </linearGradient>
            <linearGradient id={`${id}-air`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" style={stop("air-top")} />
              <stop offset="1" style={stop("air")} />
            </linearGradient>
            <linearGradient id={`${id}-water`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" style={stop("water-hi")} />
              <stop offset=".35" style={stop("water")} />
              <stop offset="1" style={stop("deep")} />
            </linearGradient>
            <linearGradient id={`${id}-ray`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" style={stop("line", 0.22)} />
              <stop offset="1" style={stop("line", 0)} />
            </linearGradient>
            <radialGradient id={`${id}-glass`} cx=".5" cy=".5" r=".5">
              <stop offset=".55" style={stop("glass", 0.04)} />
              <stop offset=".92" style={stop("glass", 0.2)} />
              <stop offset="1" style={stop("glass", 0.45)} />
            </radialGradient>
            <radialGradient id={`${id}-glow`} cx=".5" cy=".5" r=".5">
              <stop offset="0" style={stop("glow", 0.45)} />
              <stop offset="1" style={stop("glow", 0)} />
            </radialGradient>
            <clipPath id={`${id}-inside`}>
              <rect x="18" y="18" width="364" height="154" rx="77" />
            </clipPath>
            <clipPath id={`${id}-bowl`}>
              <circle r="55" />
            </clipPath>
          </defs>

          <rect
            data-part="glow"
            x="0"
            y="0"
            width="400"
            height="190"
            rx="95"
            fill={url("glow")}
          />
          <rect x="2" y="2" width="396" height="186" rx="93" fill={url("frame")} />
          <rect
            x="3"
            y="3"
            width="394"
            height="184"
            rx="92"
            fill="none"
            strokeWidth="1.5"
            style={{ stroke: v("frame-hi"), strokeOpacity: 0.9 }}
          />
          <rect x="15" y="15" width="370" height="160" rx="80" style={fill("lip")} />

          <g clipPath={url("inside")}>
            <rect x="0" y="0" width="400" height="190" fill={url("air")} />
            <path
              data-part="wave-b"
              d={wave(0, 480, 100, 3, 190)}
              style={{ ...fill("water-hi"), opacity: 0.55 }}
            />
            <path data-part="wave-a" d={wave(0, 480, 104, 4, 190)} fill={url("water")} />
            {/* Light falling through the water. */}
            <g>
              {[60, 140, 210, 290, 350].map((x, i) => (
                <path
                  key={x}
                  d={`M${String(x)} 104 l${String(14 + (i % 2) * 8)} 0 l${String(-18)} 72 l${String(-10 - (i % 2) * 6)} 0 Z`}
                  fill={url("ray")}
                />
              ))}
            </g>
            <g fill="none" strokeWidth="1" style={{ stroke: v("line"), strokeOpacity: 0.28 }}>
              <path data-part="wave-a" d={ripple(150, 3)} />
              <path data-part="wave-b" d={ripple(158, 2.5)} />
              <path data-part="wave-a" d={ripple(166, 3)} />
            </g>
            {BUBBLES.map(([x, y, r, d]) => (
              <circle
                key={`${String(x)}-${String(y)}`}
                data-part="bubble"
                cx={x}
                cy={y}
                r={r}
                fill="none"
                strokeWidth="1"
                opacity="0"
                style={{ stroke: v("line"), ["--d" as string]: `${String(d)}s` }}
              />
            ))}
          </g>

          {/* The fishbowl: the thumb. */}
          <g data-part="bowl">
            <g clipPath={url("bowl")}>
              <circle r="55" style={{ ...fill("air"), opacity: 0.55 }} />
              <g data-part="slosh">
                <path
                  data-part="bowl-wave"
                  d={wave(-120, 320, -6, 3, 70)}
                  style={{ ...fill("water"), opacity: 0.9 }}
                />
              </g>
              <g transform="translate(16 22)">
                <g data-part="fish" shapeRendering="crispEdges">
                  {FISH.map(([x, y, w, h, paint]) => (
                    <rect
                      key={`${String(x)}-${String(y)}-${paint}`}
                      x={x}
                      y={y}
                      width={w}
                      height={h}
                      style={fill(paint)}
                    />
                  ))}
                </g>
              </g>
            </g>
            <circle r="56" fill={url("glass")} />
            <circle
              r="56"
              fill="none"
              strokeWidth="2"
              style={{ stroke: v("glass"), strokeOpacity: 0.7 }}
            />
            <ellipse
              cx="-20"
              cy="-32"
              rx="13"
              ry="7"
              transform="rotate(-35 -20 -32)"
              style={{ ...fill("glass"), opacity: 0.85 }}
            />
            <path
              d="M-30 40 A 48 48 0 0 0 36 36"
              fill="none"
              strokeWidth="3"
              strokeLinecap="round"
              style={{ stroke: v("glass"), strokeOpacity: 0.55 }}
            />
            {[
              [36, -48, 3.2],
              [44, -40, 2.4],
              [28, -53, 2],
            ].map(([x, y, r]) => (
              <circle
                key={`${String(x)}-${String(y)}`}
                cx={x}
                cy={y}
                r={r}
                strokeWidth="1"
                style={{ fill: v("glass"), fillOpacity: 0.4, stroke: v("glass") }}
              />
            ))}
          </g>
        </svg>
      </SwitchPrimitive.Root>
    </>
  );
}

export { tideSwitchVariants };
