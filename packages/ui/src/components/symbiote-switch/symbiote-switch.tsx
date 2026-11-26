"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { Switch as SwitchPrimitive } from "radix-ui";
import { useId, useState, type ComponentPropsWithRef, type CSSProperties } from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A switch whose knob is a drop of black goo on a white porcelain track. It
 * stretches as it travels — two trailing blobs lag behind the knob and a goo
 * filter melts them into one body — and when it lands on the far side a drip
 * slides out from under it and hangs there. An iridescent purple-to-teal rim
 * slowly turns round the edge of the drop.
 *
 * The knob is the thumb: its position is the state. Built on the Radix switch
 * primitive, so it has the switch role, Space/Enter and a hidden input inside
 * forms. Every duration scales with --motion-scale; the squash only plays after
 * a toggle, and the rim's shimmer stops under reduced motion.
 *
 * The artwork has its own palette, as an illustration does. Each colour is a
 * custom property on the root (`--symbiote-*`), so it can be re-tinted from a
 * class without touching this file.
 */

const P = "dowel-symbiote";

/** A duration in seconds, scaled by the reader's motion preference. */
const s = (seconds: number) => `calc(${String(seconds)}s * var(--motion-scale, 1))`;

const OFF = 96;
const ON = 304;

const STYLES = `
.${P}{direction:ltr;
--symbiote-shell-hi:#ffffff;--symbiote-shell:#eceef2;--symbiote-shell-lo:#b9bcc5;--symbiote-shell-edge:#9a9eaa;
--symbiote-track-hi:#e3e5ea;--symbiote-track:#f6f7f9;--symbiote-track-lo:#d4d6dd;
--symbiote-goo:#050507;--symbiote-goo-hi:#3a3a44;--symbiote-sheen:#ffffff;
--symbiote-rim-a:#8b5cf6;--symbiote-rim-b:#22d3c5;--symbiote-rim-c:#3b82f6}
.${P} [data-part=lead],.${P} [data-part=mid],.${P} [data-part=tail],.${P} [data-part=face]{transform:translate(${String(OFF)}px,92px)}
.${P}[data-state=checked] :is([data-part=lead],[data-part=mid],[data-part=tail],[data-part=face]){transform:translate(${String(ON)}px,92px)}
.${P} [data-part=lead],.${P} [data-part=face]{transition:transform ${s(0.62)} cubic-bezier(.65,0,.25,1)}
.${P} [data-part=mid]{transition:transform ${s(0.78)} cubic-bezier(.6,0,.3,1)}
.${P} [data-part=tail]{transition:transform ${s(0.95)} cubic-bezier(.55,0,.3,1)}
.${P} [data-part=drip]{transform:translate(0,0) scale(0);transform-origin:0 50px;transition:transform ${s(0.25)} ease-in}
.${P}[data-state=checked] [data-part=drip]{transform:translate(0,14px) scale(1);transition:transform ${s(0.7)} cubic-bezier(.3,1.4,.5,1) ${s(0.75)}}
.${P} [data-part=rim]{transform-origin:0 0;animation:${P}-turn ${s(7)} linear infinite}
.${P}[data-moved][data-state=checked] [data-part=squash]{animation:${P}-squash-a ${s(0.9)} ease-out both}
.${P}[data-moved][data-state=unchecked] [data-part=squash]{animation:${P}-squash-b ${s(0.9)} ease-out both}
@keyframes ${P}-turn{to{transform:rotate(360deg)}}
@keyframes ${P}-squash-a{0%{transform:scale(1)}35%{transform:scale(1.14,.88)}65%{transform:scale(.94,1.06)}85%{transform:scale(1.03,.98)}100%{transform:scale(1)}}
@keyframes ${P}-squash-b{0%{transform:scale(1)}35%{transform:scale(1.14,.88)}65%{transform:scale(.94,1.06)}85%{transform:scale(1.03,.98)}100%{transform:scale(1)}}
@media (prefers-reduced-motion:reduce){.${P} [data-part]{animation:none!important}}
`;

const symbioteSwitchVariants = cva(
  cn(
    "relative inline-block shrink-0 overflow-hidden rounded-full select-none",
    "aspect-[400/190] cursor-pointer",
    "disabled:cursor-not-allowed disabled:opacity-55",
    focusRing,
  ),
  {
    variants: {
      size: {
        sm: "w-36",
        md: "w-56",
        lg: "w-80",
      },
    },
    defaultVariants: { size: "md" },
  },
);

export interface SymbioteSwitchProps
  extends
    Omit<ComponentPropsWithRef<typeof SwitchPrimitive.Root>, "children">,
    VariantProps<typeof symbioteSwitchVariants> {}

const fill = (name: string): CSSProperties => ({ fill: `var(--symbiote-${name})` });
const stroke = (name: string): CSSProperties => ({ stroke: `var(--symbiote-${name})` });
const stop = (name: string, opacity?: number): CSSProperties => ({
  stopColor: `var(--symbiote-${name})`,
  stopOpacity: opacity,
});

export function SymbioteSwitch({
  className,
  size,
  onCheckedChange,
  ...props
}: SymbioteSwitchProps) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [moved, setMoved] = useState(false);
  const url = (name: string) => `url(#${id}-${name})`;

  return (
    <>
      <style href={P} precedence="dowel">
        {STYLES}
      </style>
      <SwitchPrimitive.Root
        data-slot="symbiote-switch"
        data-moved={moved ? "" : undefined}
        className={cn(P, symbioteSwitchVariants({ size }), className)}
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
            <linearGradient id={`${id}-shell`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" style={stop("shell-hi")} />
              <stop offset=".55" style={stop("shell")} />
              <stop offset="1" style={stop("shell-lo")} />
            </linearGradient>
            <linearGradient id={`${id}-track`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" style={stop("track-lo")} />
              <stop offset=".3" style={stop("track")} />
              <stop offset=".85" style={stop("track")} />
              <stop offset="1" style={stop("track-hi")} />
            </linearGradient>
            <linearGradient id={`${id}-rim`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" style={stop("rim-a", 0)} />
              <stop offset=".45" style={stop("rim-a", 0.95)} />
              <stop offset=".7" style={stop("rim-c", 0.9)} />
              <stop offset="1" style={stop("rim-b", 0.95)} />
            </linearGradient>
            <radialGradient id={`${id}-body`} cx=".4" cy=".32" r=".75">
              <stop offset="0" style={stop("goo-hi")} />
              <stop offset=".45" style={stop("goo")} />
              <stop offset="1" style={stop("goo")} />
            </radialGradient>
            <radialGradient id={`${id}-gloss`} cx=".5" cy=".5" r=".5">
              <stop offset="0" style={stop("sheen", 0.55)} />
              <stop offset="1" style={stop("sheen", 0)} />
            </radialGradient>
            <filter id={`${id}-goo`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur" />
              <feColorMatrix
                in="blur"
                values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10"
                result="goo"
              />
              <feComposite in="SourceGraphic" in2="goo" operator="atop" />
            </filter>
            <filter id={`${id}-shadow`} x="-20%" y="-20%" width="140%" height="160%">
              <feGaussianBlur stdDeviation="5" />
            </filter>
          </defs>

          {/* Porcelain shell and the recessed track. */}
          <rect x="2" y="2" width="396" height="186" rx="93" style={fill("shell-edge")} />
          <rect x="3" y="3" width="394" height="183" rx="91.5" fill={url("shell")} />
          <rect
            x="4"
            y="4"
            width="392"
            height="180"
            rx="90"
            fill="none"
            strokeWidth="1.5"
            style={{ ...stroke("sheen"), strokeOpacity: 0.9 }}
          />
          <rect x="20" y="20" width="360" height="150" rx="75" fill={url("track")} />
          <rect
            x="20.5"
            y="20.5"
            width="359"
            height="149"
            rx="74.5"
            fill="none"
            strokeWidth="1.5"
            style={{ ...stroke("shell-lo"), strokeOpacity: 0.7 }}
          />
          <rect
            x="44"
            y="28"
            width="290"
            height="16"
            rx="8"
            style={{ ...fill("sheen"), opacity: 0.85 }}
          />

          {/* Soft shadow under the drop. */}
          <g data-part="face" opacity=".35">
            <ellipse
              cx="4"
              cy="10"
              rx="62"
              ry="58"
              filter={url("shadow")}
              style={fill("goo")}
            />
          </g>

          {/* The goo: three blobs melted into one body. */}
          <g filter={url("goo")}>
            <g data-part="tail">
              <circle r="44" fill={url("body")} />
            </g>
            <g data-part="mid">
              <circle r="52" fill={url("body")} />
            </g>
            <g data-part="lead">
              <g data-part="squash">
                <circle r="64" fill={url("body")} />
                <g data-part="drip">
                  <ellipse cx="0" cy="58" rx="9" ry="12" fill={url("body")} />
                </g>
              </g>
            </g>
          </g>

          {/* Rim and gloss ride on the lead blob. */}
          <g data-part="face">
            <g data-part="rim">
              <circle r="62.5" fill="none" strokeWidth="2.6" style={{ stroke: url("rim") }} />
            </g>
            <circle
              r="58"
              fill="none"
              strokeWidth="1"
              strokeDasharray="2 5"
              style={{ ...stroke("goo-hi"), strokeOpacity: 0.55 }}
            />
            <ellipse
              cx="-20"
              cy="-30"
              rx="26"
              ry="14"
              transform="rotate(-28 -20 -30)"
              fill={url("gloss")}
            />
            <path
              d="M-44 -26 A 52 52 0 0 1 -14 -50"
              fill="none"
              strokeWidth="3"
              strokeLinecap="round"
              style={{ ...stroke("sheen"), strokeOpacity: 0.35 }}
            />
          </g>
        </svg>
      </SwitchPrimitive.Root>
    </>
  );
}

export { symbioteSwitchVariants };
