"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { Switch as SwitchPrimitive } from "radix-ui";
import { useId, useState, type ComponentPropsWithRef, type CSSProperties } from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A switch whose knob is a bead of liquid metal in a brushed-gunmetal well.
 * When it is flipped the bead pours across: the leading drop runs ahead, a
 * second drop stays behind, and a thin neck of metal joins them in a dumbbell
 * until the tail catches up and the bead settles round again at the far end.
 * When on, the end of the well glows blue.
 *
 * The bead is the thumb: its position is the state. Built on the Radix switch
 * primitive, so it has the switch role, Space/Enter and a hidden input inside
 * forms. Every duration scales with --motion-scale; the wobble only plays
 * after a toggle, and the glow's breathing stops under reduced motion.
 *
 * The artwork has its own palette, as an illustration does. Each colour is a
 * custom property on the root (`--mercury-*`), so it can be re-tinted from a
 * class without touching this file.
 */

const P = "dowel-mercury";

const s = (seconds: number) => `calc(${String(seconds)}s * var(--motion-scale, 1))`;

const OFF = 102;
const ON = 298;

const STYLES = `
.${P}{direction:ltr;
--mercury-case-hi:#5b5f66;--mercury-case:#2c2f34;--mercury-case-lo:#101113;--mercury-brush:#ffffff;
--mercury-well:#030304;--mercury-well-hi:#16181c;
--mercury-chrome-1:#fbfcfd;--mercury-chrome-2:#b5bcc5;--mercury-chrome-3:#3a4048;--mercury-chrome-4:#151a20;--mercury-chrome-5:#9aa3ad;--mercury-chrome-6:#e9edf2;
--mercury-glow:#2f8bff;--mercury-glint:#7cc0ff}
.${P} :is([data-part=lead],[data-part=neck],[data-part=tail],[data-part=shine]){transform:translate(${String(OFF)}px,95px)}
.${P}[data-state=checked] :is([data-part=lead],[data-part=neck],[data-part=tail],[data-part=shine]){transform:translate(${String(ON)}px,95px)}
.${P} :is([data-part=lead],[data-part=shine]){transition:transform ${s(0.55)} cubic-bezier(.7,0,.2,1)}
.${P} [data-part=neck]{transition:transform ${s(0.85)} cubic-bezier(.6,0,.25,1)}
.${P} [data-part=tail]{transition:transform ${s(1.15)} cubic-bezier(.55,0,.2,1)}
.${P} [data-part=glow]{opacity:0;transition:opacity ${s(0.4)} ease-out}
.${P}[data-state=checked] [data-part=glow]{opacity:1;transition:opacity ${s(0.6)} ease-out ${s(0.45)}}
.${P}[data-state=checked] [data-part=glow-pulse]{animation:${P}-breathe ${s(2.6)} ease-in-out infinite alternate}
.${P}[data-moved][data-state=checked] [data-part=wobble]{animation:${P}-wobble-a ${s(1.1)} ease-out both}
.${P}[data-moved][data-state=unchecked] [data-part=wobble]{animation:${P}-wobble-b ${s(1.1)} ease-out both}
@keyframes ${P}-breathe{from{opacity:.7}to{opacity:1}}
@keyframes ${P}-wobble-a{0%{transform:scale(1)}30%{transform:scale(1.12,.86)}55%{transform:scale(.9,1.08)}75%{transform:scale(1.04,.97)}100%{transform:scale(1)}}
@keyframes ${P}-wobble-b{0%{transform:scale(1)}30%{transform:scale(1.12,.86)}55%{transform:scale(.9,1.08)}75%{transform:scale(1.04,.97)}100%{transform:scale(1)}}
@media (prefers-reduced-motion:reduce){.${P} [data-part]{animation:none!important}}
`;

const mercurySwitchVariants = cva(
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

export interface MercurySwitchProps
  extends
    Omit<ComponentPropsWithRef<typeof SwitchPrimitive.Root>, "children">,
    VariantProps<typeof mercurySwitchVariants> {}

const fill = (name: string): CSSProperties => ({ fill: `var(--mercury-${name})` });
const stroke = (name: string): CSSProperties => ({ stroke: `var(--mercury-${name})` });
const stop = (name: string, opacity?: number): CSSProperties => ({
  stopColor: `var(--mercury-${name})`,
  stopOpacity: opacity,
});

/** Fine horizontal strokes for the brushed finish: y, opacity. */
const BRUSH = Array.from({ length: 46 }, (_, i) => [4 + i * 4, ((i * 37) % 11) / 110 + 0.02]);

export function MercurySwitch({
  className,
  size,
  onCheckedChange,
  ...props
}: MercurySwitchProps) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [moved, setMoved] = useState(false);
  const url = (name: string) => `url(#${id}-${name})`;

  return (
    <>
      <style href={P} precedence="dowel">
        {STYLES}
      </style>
      <SwitchPrimitive.Root
        data-slot="mercury-switch"
        data-moved={moved ? "" : undefined}
        className={cn(P, mercurySwitchVariants({ size }), className)}
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
            <linearGradient id={`${id}-case`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" style={stop("case-hi")} />
              <stop offset=".5" style={stop("case")} />
              <stop offset="1" style={stop("case-lo")} />
            </linearGradient>
            <linearGradient id={`${id}-well`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" style={stop("well")} />
              <stop offset=".7" style={stop("well-hi")} />
              <stop offset="1" style={stop("well")} />
            </linearGradient>
            {/* One chrome gradient in user space, so every drop reflects the same room. */}
            <linearGradient
              id={`${id}-chrome`}
              x1="0"
              y1="-60"
              x2="0"
              y2="60"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0" style={stop("chrome-1")} />
              <stop offset=".28" style={stop("chrome-2")} />
              <stop offset=".5" style={stop("chrome-3")} />
              <stop offset=".62" style={stop("chrome-4")} />
              <stop offset=".82" style={stop("chrome-5")} />
              <stop offset="1" style={stop("chrome-6")} />
            </linearGradient>
            <radialGradient id={`${id}-spec`}>
              <stop offset="0" style={stop("chrome-1", 1)} />
              <stop offset="1" style={stop("chrome-1", 0)} />
            </radialGradient>
            <radialGradient id={`${id}-glow`} cx="1" cy=".5" r=".9">
              <stop offset="0" style={stop("glow", 0.95)} />
              <stop offset=".5" style={stop("glow", 0.35)} />
              <stop offset="1" style={stop("glow", 0)} />
            </radialGradient>
            <filter id={`${id}-goo`} x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
              <feColorMatrix
                in="blur"
                values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -11"
                result="goo"
              />
              <feComposite in="SourceGraphic" in2="goo" operator="atop" />
            </filter>
            <clipPath id={`${id}-case-clip`}>
              <rect x="3" y="3" width="394" height="184" rx="92" />
            </clipPath>
            <clipPath id={`${id}-inside`}>
              <rect x="22" y="22" width="356" height="146" rx="73" />
            </clipPath>
          </defs>

          {/* Brushed gunmetal case. */}
          <rect x="2" y="2" width="396" height="186" rx="93" style={fill("case-lo")} />
          <rect x="3" y="3" width="394" height="184" rx="92" fill={url("case")} />
          <g strokeWidth=".7" clipPath={url("case-clip")} style={stroke("brush")}>
            {BRUSH.map(([y, o]) => (
              <line key={y} x1="0" y1={y} x2="400" y2={y} strokeOpacity={o} />
            ))}
          </g>
          <rect
            x="3.5"
            y="3.5"
            width="393"
            height="183"
            rx="91.5"
            fill="none"
            strokeWidth="1.2"
            style={{ ...stroke("case-hi"), strokeOpacity: 0.9 }}
          />
          <rect x="18" y="18" width="364" height="154" rx="77" style={fill("case-lo")} />
          <rect x="22" y="22" width="356" height="146" rx="73" fill={url("well")} />

          <g clipPath={url("inside")}>
            <g data-part="glow">
              <rect
                data-part="glow-pulse"
                x="200"
                y="22"
                width="178"
                height="146"
                fill={url("glow")}
              />
            </g>
            <rect
              x="40"
              y="26"
              width="320"
              height="26"
              rx="13"
              style={{ ...fill("chrome-1"), opacity: 0.07 }}
            />

            {/* The metal: lead, neck and tail drops melted into one bead. */}
            <g filter={url("goo")}>
              <g data-part="tail">
                <circle r="50" fill={url("chrome")} />
              </g>
              <g data-part="neck">
                <ellipse rx="40" ry="22" fill={url("chrome")} />
              </g>
              <g data-part="lead">
                <g data-part="wobble">
                  <circle r="58" fill={url("chrome")} />
                </g>
              </g>
            </g>

            <g data-part="shine">
              <ellipse
                cx="-24"
                cy="-34"
                rx="20"
                ry="9"
                transform="rotate(-18 -24 -34)"
                fill={url("spec")}
              />
              <path
                d="M-36 30 Q0 46 36 30"
                fill="none"
                strokeWidth="2"
                strokeLinecap="round"
                style={{ ...stroke("glint"), strokeOpacity: 0.45 }}
              />
            </g>
          </g>
          <rect
            x="22"
            y="22"
            width="356"
            height="146"
            rx="73"
            fill="none"
            strokeWidth="2"
            style={{ ...stroke("case-hi"), strokeOpacity: 0.35 }}
          />
        </svg>
      </SwitchPrimitive.Root>
    </>
  );
}

export { mercurySwitchVariants };
