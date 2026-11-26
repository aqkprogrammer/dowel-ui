"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { Switch as SwitchPrimitive } from "radix-ui";
import { useId, useState, type ComponentPropsWithRef, type CSSProperties } from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A switch folded from paper. The track is a peach sheet with a cross of
 * creases, each quarter catching the light a little differently, and a faint
 * grain over all of it. The knob is a coral disc with a paper star on it.
 *
 * Off, the knob sits at the start and its star is folded down small. On, the
 * knob slides across, the star unfolds and turns as it travels, and the four
 * panels of the track flip over their creases one after another, landing a
 * shade warmer.
 *
 * The knob is the thumb: its position is the state. Built on the Radix switch
 * primitive (switch role, Space/Enter, hidden input in forms). The panel flip
 * only plays after a toggle, and every duration scales with --motion-scale.
 *
 * The paper has its own palette, as an illustration does. Each colour is a
 * custom property on the root (`--origami-*`), so it can be re-tinted from a
 * class without touching this file.
 */

const P = "dowel-origami";

const s = (seconds: number) => `calc(${String(seconds)}s * var(--motion-scale, 1))`;

const STYLES = `
.${P}{direction:ltr;
--origami-rim-hi:#fbe1d2;--origami-rim:#f0c2a8;--origami-rim-lo:#d8987a;
--origami-sheet-off:#efc7b0;--origami-sheet-on:#e9a283;--origami-sheet-shade:#c9785a;--origami-crease:#fff1e8;
--origami-knob-hi:#f98a6a;--origami-knob:#e8613f;--origami-knob-lo:#b9432a;
--origami-star-light:#fff4e6;--origami-star-shade:#e6cdb3}
.${P} [data-part=knob]{transform:translate(104px,95px);transition:transform ${s(0.75)} cubic-bezier(.65,0,.25,1)}
.${P}[data-state=checked] [data-part=knob]{transform:translate(296px,95px)}
.${P} [data-part=star]{transform:rotate(-72deg) scale(.55);transition:transform ${s(0.75)} cubic-bezier(.34,1.4,.5,1)}
.${P}[data-state=checked] [data-part=star]{transform:rotate(0deg) scale(1)}
.${P} [data-part=panel] [data-part=face]{fill:var(--origami-sheet-off);transition:fill 0s linear calc(var(--i) * ${s(0.09)} + ${s(0.16)})}
.${P}[data-state=checked] [data-part=panel] [data-part=face]{fill:var(--origami-sheet-on)}
.${P}[data-moved][data-state=checked] [data-part=panel]{animation:${P}-flip-a ${s(0.34)} ease-in-out both;animation-delay:calc(var(--i) * ${s(0.09)})}
.${P}[data-moved][data-state=unchecked] [data-part=panel]{animation:${P}-flip-b ${s(0.34)} ease-in-out both;animation-delay:calc(var(--i) * ${s(0.09)})}
@keyframes ${P}-flip-a{0%{transform:scaleY(1)}50%{transform:scaleY(0)}100%{transform:scaleY(1)}}
@keyframes ${P}-flip-b{0%{transform:scaleY(1)}50%{transform:scaleY(0)}100%{transform:scaleY(1)}}
@media (prefers-reduced-motion:reduce){.${P} [data-part]{animation:none!important}}
`;

const origamiSwitchVariants = cva(
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

export interface OrigamiSwitchProps
  extends
    Omit<ComponentPropsWithRef<typeof SwitchPrimitive.Root>, "children">,
    VariantProps<typeof origamiSwitchVariants> {}

const fill = (name: string): CSSProperties => ({ fill: `var(--origami-${name})` });
const stroke = (name: string): CSSProperties => ({ stroke: `var(--origami-${name})` });
const stop = (name: string, opacity?: number): CSSProperties => ({
  stopColor: `var(--origami-${name})`,
  stopOpacity: opacity,
});

/** A point `r` from the centre at `deg` clockwise from twelve o'clock. */
const xy = (r: number, deg: number) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return `${(r * Math.cos(a)).toFixed(2)} ${(r * Math.sin(a)).toFixed(2)}`;
};

/**
 * A folded five-point star: ten facets from the centre, each half of a point
 * lit or in shadow, as a creased paper star catches light from the top left.
 */
const STAR_FACETS = Array.from({ length: 10 }, (_, i) => {
  const outer = Math.floor(i / 2) * 72;
  const inner = outer + (i % 2 === 0 ? -36 : 36);
  return {
    d: `M0 0 L${xy(36, outer)} L${xy(15, inner)} Z`,
    light: i % 2 === 0,
  };
});

/**
 * The four panels of the sheet, split by the creases at x=200 and y=95. Each
 * flips over the crease it shares with the middle, so its transform origin
 * sits on that crease. `shade` darkens the panels facing away from the light.
 */
const PANELS = [
  { x: 22, y: 22, w: 178, h: 73, origin: "200px 95px", shade: 0 },
  { x: 200, y: 22, w: 178, h: 73, origin: "200px 95px", shade: 0.08 },
  { x: 22, y: 95, w: 178, h: 73, origin: "200px 95px", shade: 0.16 },
  { x: 200, y: 95, w: 178, h: 73, origin: "200px 95px", shade: 0.24 },
];

export function OrigamiSwitch({
  className,
  size,
  onCheckedChange,
  ...props
}: OrigamiSwitchProps) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [moved, setMoved] = useState(false);
  const url = (name: string) => `url(#${id}-${name})`;

  return (
    <>
      <style href={P} precedence="dowel">
        {STYLES}
      </style>
      <SwitchPrimitive.Root
        data-slot="origami-switch"
        data-moved={moved ? "" : undefined}
        className={cn(P, origamiSwitchVariants({ size }), className)}
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
            <linearGradient id={`${id}-rim`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" style={stop("rim-hi")} />
              <stop offset=".55" style={stop("rim")} />
              <stop offset="1" style={stop("rim-lo")} />
            </linearGradient>
            <radialGradient id={`${id}-knob`} cx=".35" cy=".3" r=".8">
              <stop offset="0" style={stop("knob-hi")} />
              <stop offset=".6" style={stop("knob")} />
              <stop offset="1" style={stop("knob-lo")} />
            </radialGradient>
            <linearGradient id={`${id}-lift`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" style={stop("crease", 0.35)} />
              <stop offset=".5" style={stop("crease", 0)} />
            </linearGradient>
            <filter id={`${id}-grain`} x="0" y="0" width="100%" height="100%">
              <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="7" />
              <feColorMatrix
                type="matrix"
                values="0 0 0 0 0.45  0 0 0 0 0.22  0 0 0 0 0.12  0 0 0 0.55 -0.12"
              />
              <feComposite in2="SourceGraphic" operator="in" />
            </filter>
            <filter id={`${id}-drop`} x="-30%" y="-30%" width="160%" height="170%">
              <feDropShadow dx="0" dy="5" stdDeviation="5" floodOpacity=".28" />
            </filter>
            <clipPath id={`${id}-inside`}>
              <rect x="22" y="22" width="356" height="146" rx="73" />
            </clipPath>
          </defs>

          {/* The rim: a thick folded border. */}
          <rect x="2" y="2" width="396" height="186" rx="93" fill={url("rim")} />
          <rect
            x="3"
            y="3"
            width="394"
            height="184"
            rx="92"
            fill="none"
            strokeWidth="1.5"
            style={{ ...stroke("rim-hi"), strokeOpacity: 0.9 }}
          />
          <rect x="18" y="18" width="364" height="154" rx="77" style={fill("rim-lo")} />

          <g clipPath={url("inside")}>
            {PANELS.map((panel, i) => (
              <g
                key={i}
                data-part="panel"
                style={{ "--i": i, transformOrigin: panel.origin } as CSSProperties}
              >
                <rect
                  data-part="face"
                  x={panel.x}
                  y={panel.y}
                  width={panel.w}
                  height={panel.h}
                />
                <rect
                  x={panel.x}
                  y={panel.y}
                  width={panel.w}
                  height={panel.h}
                  style={{ ...fill("sheet-shade"), opacity: panel.shade }}
                />
              </g>
            ))}
            {/* Creases: a pale ridge beside a soft valley. */}
            <g strokeWidth="1.6">
              <line
                x1="200"
                y1="20"
                x2="200"
                y2="170"
                style={{ ...stroke("crease"), opacity: 0.7 }}
              />
              <line
                x1="202"
                y1="20"
                x2="202"
                y2="170"
                style={{ ...stroke("sheet-shade"), opacity: 0.25 }}
              />
              <line
                x1="20"
                y1="95"
                x2="380"
                y2="95"
                style={{ ...stroke("crease"), opacity: 0.6 }}
              />
              <line
                x1="20"
                y1="97"
                x2="380"
                y2="97"
                style={{ ...stroke("sheet-shade"), opacity: 0.25 }}
              />
            </g>
            <rect x="0" y="0" width="400" height="190" fill={url("lift")} />
            <rect x="0" y="0" width="400" height="190" filter={url("grain")} />
          </g>
          <rect
            x="20"
            y="20"
            width="360"
            height="150"
            rx="75"
            fill="none"
            strokeWidth="3"
            style={{ ...stroke("sheet-shade"), strokeOpacity: 0.3 }}
          />

          {/* The knob: the thumb. */}
          <g data-part="knob">
            <g filter={url("drop")}>
              <circle r="64" fill={url("knob")} />
            </g>
            <circle
              r="62"
              fill="none"
              strokeWidth="1.5"
              style={{ ...stroke("knob-hi"), strokeOpacity: 0.8 }}
            />
            <g data-part="star">
              {STAR_FACETS.map((facet) => (
                <path
                  key={facet.d}
                  d={facet.d}
                  strokeWidth=".6"
                  strokeLinejoin="round"
                  style={{
                    ...fill(facet.light ? "star-light" : "star-shade"),
                    ...stroke("star-shade"),
                  }}
                />
              ))}
            </g>
          </g>
        </svg>
      </SwitchPrimitive.Root>
    </>
  );
}

export { origamiSwitchVariants };
