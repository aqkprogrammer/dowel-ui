"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { Switch as SwitchPrimitive } from "radix-ui";
import { useId, useState, type ComponentPropsWithRef, type CSSProperties } from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A switch drawn as a neon sign in a black housing. Off, the glass tubes are
 * dark and the word "off" sits at the end with the ring at the start. On, the
 * ring slides across, the tubes stutter alight the way real neon does, and a
 * cursive "on" glows in pink with a soft bloom behind it.
 *
 * The ring is the thumb: its position is the state. Built on the Radix switch
 * primitive, so it has the switch role, Space/Enter, and a hidden input inside
 * forms. The stutter only plays after a toggle; every duration scales with
 * --motion-scale and the ambient buzz stops under reduced motion.
 *
 * The sign has its own palette, as an illustration does. Each colour is a
 * custom property on the root (`--neon-sign-*`), so it can be re-tinted from a
 * class (a cyan or green sign) without touching this file.
 */

const P = "dowel-neon-sign";

const s = (seconds: number) => `calc(${String(seconds)}s * var(--motion-scale, 1))`;

const STYLES = `
.${P}{direction:ltr;
--neon-sign-housing-hi:#3a2a36;--neon-sign-housing:#1c1219;--neon-sign-housing-lo:#0c070b;
--neon-sign-back:#1f0d1a;--neon-sign-back-lo:#120610;--neon-sign-clip:#08060a;--neon-sign-clip-hi:#4a4248;
--neon-sign-glass:#6d5664;--neon-sign-tube:#ff4fb8;--neon-sign-core:#ffe3f4;--neon-sign-bloom:#ff2fa6}
.${P} [data-part=ring]{transform:translate(102px,95px);transition:transform ${s(0.7)} cubic-bezier(.65,0,.25,1)}
.${P}[data-state=checked] [data-part=ring]{transform:translate(298px,95px)}
.${P} [data-part=lit]{opacity:0;transition:opacity ${s(0.25)} ease-out}
.${P}[data-state=checked] [data-part=lit]{opacity:1}
.${P} [data-part=word-off]{opacity:1;transition:opacity ${s(0.3)} ease-out ${s(0.25)}}
.${P}[data-state=checked] [data-part=word-off]{opacity:0;transition-delay:0s}
.${P} [data-part=word-on-glass]{opacity:0;transition:opacity ${s(0.3)}}
.${P}[data-state=checked] [data-part=word-on-glass]{opacity:1}
.${P}[data-state=checked] [data-part=buzz]{animation:${P}-buzz ${s(4)} linear infinite}
.${P}[data-moved][data-state=checked] [data-part=lit]{animation:${P}-flicker ${s(0.9)} linear both}
@keyframes ${P}-flicker{0%{opacity:0}8%{opacity:.9}12%{opacity:.1}20%{opacity:1}26%{opacity:.25}34%{opacity:.95}40%{opacity:.4}52%,100%{opacity:1}}
@keyframes ${P}-buzz{0%,91%,100%{opacity:1}92%{opacity:.82}93%{opacity:1}95%{opacity:.88}}
@media (prefers-reduced-motion:reduce){.${P} [data-part]{animation:none!important}}
`;

const neonSignSwitchVariants = cva(
  cn(
    "relative inline-block shrink-0 overflow-hidden rounded-full select-none",
    "aspect-[400/190] cursor-pointer",
    "disabled:cursor-not-allowed disabled:opacity-55",
    focusRing,
  ),
  {
    variants: { size: { sm: "w-36", md: "w-56", lg: "w-80" } },
    defaultVariants: { size: "md" },
  },
);

export interface NeonSignSwitchProps
  extends
    Omit<ComponentPropsWithRef<typeof SwitchPrimitive.Root>, "children">,
    VariantProps<typeof neonSignSwitchVariants> {}

const fill = (name: string): CSSProperties => ({ fill: `var(--neon-sign-${name})` });
const stroke = (name: string): CSSProperties => ({ stroke: `var(--neon-sign-${name})` });
const stop = (name: string, opacity?: number): CSSProperties => ({
  stopColor: `var(--neon-sign-${name})`,
  stopOpacity: opacity,
});

/** The tube that traces the inside of the housing. */
const TUBE = { x: 32, y: 32, width: 336, height: 126, rx: 63 };
const WORD_FONT = "'Brush Script MT', 'Snell Roundhand', 'Segoe Script', cursive";

/** Mounting clips holding the tube: x positions, top and bottom. */
const CLIPS = [140, 200, 260];

export function NeonSignSwitch({
  className,
  size,
  onCheckedChange,
  ...props
}: NeonSignSwitchProps) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [moved, setMoved] = useState(false);
  const url = (name: string) => `url(#${id}-${name})`;

  return (
    <>
      <style href={P} precedence="dowel">
        {STYLES}
      </style>
      <SwitchPrimitive.Root
        data-slot="neon-sign-switch"
        data-moved={moved ? "" : undefined}
        className={cn(P, neonSignSwitchVariants({ size }), className)}
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
            <linearGradient id={`${id}-housing`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" style={stop("housing-hi")} />
              <stop offset=".5" style={stop("housing")} />
              <stop offset="1" style={stop("housing-lo")} />
            </linearGradient>
            <radialGradient id={`${id}-back`} cx=".5" cy=".5" r=".7">
              <stop offset="0" style={stop("back")} />
              <stop offset="1" style={stop("back-lo")} />
            </radialGradient>
            <radialGradient id={`${id}-bloom`} cx=".5" cy=".5" r=".6">
              <stop offset="0" style={stop("bloom", 0.35)} />
              <stop offset="1" style={stop("bloom", 0)} />
            </radialGradient>
            <filter id={`${id}-glow`} x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="5" />
            </filter>
            <filter id={`${id}-glow-soft`} x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2" />
            </filter>
          </defs>

          {/* Housing. */}
          <rect x="2" y="2" width="396" height="186" rx="93" fill={url("housing")} />
          <rect
            x="3"
            y="3"
            width="394"
            height="184"
            rx="92"
            fill="none"
            strokeWidth="1.2"
            style={{ ...stroke("housing-hi"), strokeOpacity: 0.9 }}
          />
          <rect x="16" y="16" width="368" height="158" rx="79" fill={url("back")} />
          <rect
            x="16"
            y="16"
            width="368"
            height="158"
            rx="79"
            fill="none"
            strokeWidth="3"
            style={{ ...stroke("housing-lo"), strokeOpacity: 0.9 }}
          />

          {/* Unlit glass: always there, the lit tube sits over it. */}
          <g fill="none" strokeLinecap="round" style={{ ...stroke("glass"), opacity: 0.55 }}>
            <rect {...TUBE} strokeWidth="4" />
          </g>
          <text
            data-part="word-off"
            x="282"
            y="112"
            textAnchor="middle"
            fontFamily={WORD_FONT}
            fontStyle="italic"
            fontSize="52"
            fill="none"
            strokeWidth="2.5"
            style={{ ...stroke("glass"), strokeOpacity: 0.75 }}
          >
            off
          </text>
          <text
            data-part="word-on-glass"
            x="138"
            y="114"
            textAnchor="middle"
            fontFamily={WORD_FONT}
            fontStyle="italic"
            fontSize="62"
            fill="none"
            strokeWidth="2.5"
            style={{ ...stroke("glass"), strokeOpacity: 0.6 }}
          >
            on
          </text>

          {/* The lit sign. */}
          <g data-part="lit">
            <g data-part="buzz">
              <rect x="0" y="0" width="400" height="190" fill={url("bloom")} />
              <g fill="none">
                <rect
                  {...TUBE}
                  strokeWidth="9"
                  filter={url("glow")}
                  style={{ ...stroke("bloom"), strokeOpacity: 0.9 }}
                />
                <rect {...TUBE} strokeWidth="4.5" style={stroke("tube")} />
                <rect
                  {...TUBE}
                  strokeWidth="1.4"
                  style={{ ...stroke("core"), strokeOpacity: 0.8 }}
                />
              </g>
              <g
                fontFamily={WORD_FONT}
                fontStyle="italic"
                fontSize="62"
                textAnchor="middle"
                fill="none"
              >
                <text
                  x="138"
                  y="114"
                  strokeWidth="8"
                  filter={url("glow")}
                  style={{ ...stroke("bloom"), strokeOpacity: 0.9 }}
                >
                  on
                </text>
                <text x="138" y="114" strokeWidth="3.5" style={stroke("tube")}>
                  on
                </text>
                <text x="138" y="114" strokeWidth="1.1" style={stroke("core")}>
                  on
                </text>
              </g>
            </g>
          </g>

          {/* The ring: the thumb. */}
          <g data-part="ring">
            <circle
              r="56"
              fill="none"
              strokeWidth="5"
              style={{ ...stroke("glass"), opacity: 0.6 }}
            />
            <g data-part="lit">
              <g data-part="buzz">
                <circle r="56" style={{ ...fill("bloom"), opacity: 0.08 }} />
                <circle
                  r="56"
                  fill="none"
                  strokeWidth="11"
                  filter={url("glow")}
                  style={{ ...stroke("bloom"), strokeOpacity: 0.9 }}
                />
                <circle r="56" fill="none" strokeWidth="5" style={stroke("tube")} />
                <circle
                  r="56"
                  fill="none"
                  strokeWidth="1.6"
                  filter={url("glow-soft")}
                  style={stroke("core")}
                />
              </g>
            </g>
          </g>

          {/* Clips over the tube. */}
          {CLIPS.flatMap((x) => [
            <g key={`t${String(x)}`}>
              <rect x={x - 5} y="25" width="10" height="14" rx="2" style={fill("clip")} />
              <rect x={x - 3} y="27" width="6" height="2" rx="1" style={fill("clip-hi")} />
            </g>,
            <g key={`b${String(x)}`}>
              <rect x={x - 5} y="151" width="10" height="14" rx="2" style={fill("clip")} />
              <rect x={x - 3} y="161" width="6" height="2" rx="1" style={fill("clip-hi")} />
            </g>,
          ])}
        </svg>
      </SwitchPrimitive.Root>
    </>
  );
}

export { neonSignSwitchVariants };
