"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { Switch as SwitchPrimitive } from "radix-ui";
import { useId, type ComponentPropsWithRef, type CSSProperties } from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A switch whose thumb is a glass orb full of embers. Off, the orb rests at the
 * start of a dark plum track and its dots drift loose like dust in a jar. On,
 * it glides across and the dots snap, one after another, into a dot-matrix
 * sunrise, glowing warm against a violet rim.
 *
 * Each dot has two homes, a scattered one and its place in the glyph, held as
 * custom properties; the checked state picks one and a staggered transform
 * transition carries it there. Built on the Radix switch primitive (switch
 * role, Space/Enter, hidden input in forms). Durations scale with
 * --motion-scale; the drift stops under reduced motion.
 *
 * Colours are custom properties on the root (`--dot-matrix-*`), so the orb can
 * be re-tinted from a class without touching this file.
 */

const P = "dowel-dot-matrix";

const s = (seconds: number) => `calc(${String(seconds)}s * var(--motion-scale, 1))`;

const TRAVEL = 0.85;
const OFF_X = 100;
const ON_X = 300;
const CY = 95;
/** Spacing of the glyph's grid. */
const GRID = 6.5;

const STYLES = `
.${P}{direction:ltr;
--dot-matrix-frame-hi:#4a4253;--dot-matrix-frame:#2c2633;--dot-matrix-frame-lo:#16121b;
--dot-matrix-track:#15111a;--dot-matrix-track-hi:#241d2b;
--dot-matrix-orb-hi:#4a4255;--dot-matrix-orb:#2a2431;--dot-matrix-orb-lo:#18141d;
--dot-matrix-rim:#a98bff;--dot-matrix-warm:#ffb46a;--dot-matrix-dot:#ffc98a;--dot-matrix-dot-hot:#ff9a3c;
--dot-matrix-sheen:#ffffff}
.${P} [data-part=orb]{transform:translate(${String(OFF_X)}px,${String(CY)}px);transition:transform ${s(TRAVEL)} cubic-bezier(.65,0,.3,1)}
.${P}[data-state=checked] [data-part=orb]{transform:translate(${String(ON_X)}px,${String(CY)}px)}
.${P} [data-part=dot]{transform:translate(var(--sx),var(--sy));opacity:.55;transition:transform ${s(0.5)} cubic-bezier(.3,1.4,.5,1),opacity ${s(0.4)};transition-delay:calc(var(--i) * ${s(0.008)})}
.${P}[data-state=checked] [data-part=dot]{transform:translate(var(--tx),var(--ty));opacity:1;transition-delay:calc(${s(0.35)} + var(--i) * ${s(0.018)})}
.${P} [data-part=core]{fill:var(--dot-matrix-dot);transition:fill ${s(0.4)}}
.${P}[data-state=checked] [data-part=core]{fill:var(--dot-matrix-dot-hot)}
.${P} [data-part=drift]{animation:${P}-drift ${s(3.2)} ease-in-out infinite alternate;animation-delay:var(--d)}
.${P}[data-state=checked] [data-part=drift]{animation:none}
.${P} [data-part=warm]{opacity:0;transition:opacity ${s(0.5)} ease-out}
.${P}[data-state=checked] [data-part=warm]{opacity:1;transition-delay:${s(0.5)}}
@keyframes ${P}-drift{0%{transform:translate(0,0)}50%{transform:translate(var(--dx),var(--dy))}100%{transform:translate(calc(var(--dy) * -1),var(--dx))}}
@media (prefers-reduced-motion:reduce){.${P} [data-part]{animation:none!important}}
`;

const dotMatrixSwitchVariants = cva(
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

export interface DotMatrixSwitchProps
  extends
    Omit<ComponentPropsWithRef<typeof SwitchPrimitive.Root>, "children">,
    VariantProps<typeof dotMatrixSwitchVariants> {}

const v = (name: string) => `var(--dot-matrix-${name})`;
const fill = (name: string): CSSProperties => ({ fill: v(name) });
const stop = (name: string, opacity?: number): CSSProperties => ({
  stopColor: v(name),
  stopOpacity: opacity,
});

/** The sunrise glyph, in grid cells: [column, row, brightness]. */
const GLYPH: [number, number, number][] = [
  // The sun's disc, cut by the horizon.
  ...[-3, -2, -1, 0, 1, 2, 3].map((x): [number, number, number] => [x, 0, 1]),
  ...[-3, -2, -1, 0, 1, 2, 3].map((x): [number, number, number] => [x, -1, 1]),
  ...[-2, -1, 0, 1, 2].map((x): [number, number, number] => [x, -2, 1]),
  ...[-1, 0, 1].map((x): [number, number, number] => [x, -3, 1]),
  // Rays.
  [0, -5, 0.9],
  [-3, -4.3, 0.9],
  [3, -4.3, 0.9],
  [-4.8, -2.4, 0.9],
  [4.8, -2.4, 0.9],
  [-5.4, 0, 0.8],
  [5.4, 0, 0.8],
  // Its reflection below the horizon, fading.
  ...[-2, -1, 0, 1, 2].map((x): [number, number, number] => [x, 1.3, 0.55]),
  ...[-1, 0, 1].map((x): [number, number, number] => [x, 2.4, 0.35]),
  [0, 3.4, 0.2],
];

/** A deterministic scatter, so server and client agree. */
function scatter(i: number) {
  const a = (i * 137.508 * Math.PI) / 180;
  const r = 10 + ((i * 53) % 34);
  return [Math.cos(a) * r, Math.sin(a) * r * 0.9] as const;
}

const DOTS = GLYPH.map(([col, row, brightness], i) => {
  const [sx, sy] = scatter(i);
  return {
    sx: sx.toFixed(1),
    sy: sy.toFixed(1),
    tx: (col * GRID).toFixed(1),
    ty: (row * GRID + 6).toFixed(1),
    brightness,
    dx: (((i * 7) % 9) - 4).toFixed(1),
    dy: (((i * 5) % 7) - 3).toFixed(1),
    delay: ((i * 0.37) % 3).toFixed(2),
  };
});

export function DotMatrixSwitch({ className, size, ...props }: DotMatrixSwitchProps) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const url = (name: string) => `url(#${id}-${name})`;

  return (
    <>
      <style href={P} precedence="dowel">
        {STYLES}
      </style>
      <SwitchPrimitive.Root
        data-slot="dot-matrix-switch"
        className={cn(P, dotMatrixSwitchVariants({ size }), className)}
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
            <linearGradient id={`${id}-track`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" style={stop("track")} />
              <stop offset="1" style={stop("track-hi")} />
            </linearGradient>
            <radialGradient id={`${id}-orb`} cx=".45" cy=".3" r=".75">
              <stop offset="0" style={stop("orb-hi")} />
              <stop offset=".6" style={stop("orb")} />
              <stop offset="1" style={stop("orb-lo")} />
            </radialGradient>
            <radialGradient id={`${id}-halo`} cx=".5" cy=".5" r=".5">
              <stop offset=".55" style={stop("rim", 0.35)} />
              <stop offset="1" style={stop("rim", 0)} />
            </radialGradient>
            <radialGradient id={`${id}-warm-halo`} cx=".5" cy=".5" r=".5">
              <stop offset="0" style={stop("warm", 0.35)} />
              <stop offset="1" style={stop("warm", 0)} />
            </radialGradient>
            <linearGradient id={`${id}-rim`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" style={stop("warm")} />
              <stop offset=".55" style={stop("rim")} />
            </linearGradient>
            <radialGradient id={`${id}-ember`} cx=".5" cy=".5" r=".5">
              <stop offset="0" style={stop("dot-hot", 0.7)} />
              <stop offset="1" style={stop("dot-hot", 0)} />
            </radialGradient>
            <clipPath id={`${id}-orb-clip`}>
              <circle r="53" />
            </clipPath>
          </defs>

          <rect x="2" y="2" width="396" height="186" rx="93" fill={url("frame")} />
          <rect
            x="3"
            y="3"
            width="394"
            height="184"
            rx="92"
            fill="none"
            strokeWidth="1.2"
            style={{ stroke: v("frame-hi"), strokeOpacity: 0.8 }}
          />
          <rect x="18" y="18" width="364" height="154" rx="77" fill={url("track")} />
          <rect
            x="19"
            y="19"
            width="362"
            height="152"
            rx="76"
            fill="none"
            strokeWidth="5"
            style={{ stroke: v("frame-lo"), strokeOpacity: 0.7 }}
          />

          {/* The orb: the thumb. */}
          <g data-part="orb">
            <circle r="78" fill={url("halo")} />
            <circle data-part="warm" r="92" fill={url("warm-halo")} />
            <circle r="56" fill={url("orb")} />
            <g clipPath={url("orb-clip")}>
              <circle data-part="warm" r="40" cy="6" fill={url("ember")} opacity=".5" />
              {DOTS.map((dot, i) => (
                <g
                  key={i}
                  data-part="dot"
                  style={
                    {
                      "--sx": `${dot.sx}px`,
                      "--sy": `${dot.sy}px`,
                      "--tx": `${dot.tx}px`,
                      "--ty": `${dot.ty}px`,
                      "--i": i,
                    } as CSSProperties
                  }
                >
                  <g
                    data-part="drift"
                    style={
                      {
                        "--dx": `${dot.dx}px`,
                        "--dy": `${dot.dy}px`,
                        "--d": `-${dot.delay}s`,
                      } as CSSProperties
                    }
                  >
                    <circle r="3.6" fill={url("ember")} opacity={dot.brightness * 0.8} />
                    <circle data-part="core" r="1.9" opacity={dot.brightness} />
                  </g>
                </g>
              ))}
            </g>
            <circle r="56" fill="none" strokeWidth="2.5" stroke={url("rim")} opacity=".25" />
            <circle data-part="warm" r="56" fill="none" strokeWidth="2.5" stroke={url("rim")} />
            <circle
              r="56"
              fill="none"
              strokeWidth="2"
              style={{ stroke: v("rim"), strokeOpacity: 0.85 }}
              strokeDasharray="120 400"
              strokeDashoffset="-150"
            />
            <path
              d="M-38 -38 A 54 54 0 0 1 30 -46"
              fill="none"
              strokeWidth="2"
              strokeLinecap="round"
              style={{ stroke: v("sheen"), strokeOpacity: 0.28 }}
            />
            <ellipse
              cx="-18"
              cy="-36"
              rx="14"
              ry="5"
              style={{ ...fill("sheen"), opacity: 0.08 }}
            />
          </g>
        </svg>
      </SwitchPrimitive.Root>
    </>
  );
}

export { dotMatrixSwitchVariants };
