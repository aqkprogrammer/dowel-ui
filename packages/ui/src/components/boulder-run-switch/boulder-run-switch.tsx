"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { Switch as SwitchPrimitive } from "radix-ui";
import { useId, useState, type ComponentPropsWithRef, type CSSProperties } from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A switch drawn as a tiny temple scene. Off, an explorer stands admiring a
 * golden idol with a boulder resting in the dark behind them. On, the boulder
 * rolls across the corridor and the explorer flees ahead of it, out of frame;
 * the boulder lands at the far end with a shake and a puff of dust. Off again,
 * it rolls back and the explorer walks home.
 *
 * The boulder is the thumb: its position is the state, so the scene reads as a
 * switch even without the story. Built on the Radix switch primitive, so it
 * has the switch role, Space/Enter, and a hidden input inside forms.
 *
 * Everything moves in CSS. The one-off run and return only play after a
 * toggle (never on first paint), every duration scales with --motion-scale,
 * and the ambient loops (torch, dust, idol glint) stop under reduced motion.
 *
 * The scene has its own palette, as an illustration does. Each colour is a
 * custom property on the root (`--boulder-run-*`), so it can be re-tinted from
 * a class without touching this file.
 */

const P = "dowel-boulder-run";

/** A duration in seconds, scaled by the reader's motion preference. */
const s = (seconds: number) => `calc(${String(seconds)}s * var(--motion-scale, 1))`;

const ROLL = 1.15;

const STYLES = `
.${P}{direction:ltr;
--boulder-run-frame-hi:#c9a571;--boulder-run-frame:#9a7748;--boulder-run-frame-lo:#5c4326;--boulder-run-frame-edge:#3b2a17;
--boulder-run-wall:#2a1d13;--boulder-run-brick:#3d2c1d;--boulder-run-brick-edge:#1d140c;--boulder-run-glyph:#5a442c;
--boulder-run-floor:#1b120b;--boulder-run-shade:#0b0704;
--boulder-run-fire:#f59a2b;--boulder-run-fire-core:#ffe08a;--boulder-run-glow:#ffb04a;
--boulder-run-stone-hi:#b39169;--boulder-run-stone:#7a5d3d;--boulder-run-stone-lo:#3e2d1c;--boulder-run-crack:#2e2114;
--boulder-run-skin:#e3b48a;--boulder-run-shirt:#cdb07c;--boulder-run-trousers:#5b3d26;--boulder-run-boot:#2a1a0f;
--boulder-run-hat:#8a5a2b;--boulder-run-hat-band:#33200f;--boulder-run-gold:#f5c542;--boulder-run-gold-lo:#c8901a}
.${P} [data-part=boulder]{transform:translate(72px,92px);transition:transform ${s(ROLL)} cubic-bezier(.45,.05,.55,.95)}
.${P} [data-part=spin]{transform:rotate(0deg);transition:transform ${s(ROLL)} cubic-bezier(.45,.05,.55,.95)}
.${P} [data-part=boulder-shadow]{transform:translate(72px,151px);transition:transform ${s(ROLL)} cubic-bezier(.45,.05,.55,.95)}
.${P}[data-state=checked] [data-part=boulder]{transform:translate(328px,92px)}
.${P}[data-state=checked] [data-part=boulder-shadow]{transform:translate(328px,151px)}
.${P}[data-state=checked] [data-part=spin]{transform:rotate(257deg)}
.${P} [data-part=explorer]{transform:translate(256px,150px)}
.${P}[data-state=checked] [data-part=explorer]{transform:translate(470px,150px)}
.${P} [data-part=leg-front]{transform-origin:0 -30px;transform:rotate(-7deg)}
.${P} [data-part=leg-back]{transform-origin:0 -30px;transform:rotate(9deg)}
.${P} [data-part=idol-glow]{opacity:.55;transform-origin:17px -77px}
.${P} [data-part=flame]{transform-origin:200px 70px}
.${P} [data-part=torch-glow]{transform-origin:200px 66px}
.${P} [data-part=puff] circle{opacity:0}

/* Ambient life. */
.${P} [data-part=flame]{animation:${P}-flicker ${s(0.9)} ease-in-out infinite alternate}
.${P} [data-part=torch-glow]{animation:${P}-glow ${s(1.7)} ease-in-out infinite alternate}
.${P} [data-part=mote]{animation:${P}-mote ${s(6)} linear infinite;animation-delay:var(--d)}
.${P} [data-part=idol-glow]{animation:${P}-glint ${s(1.8)} ease-in-out infinite alternate}
.${P} [data-part=body]{animation:${P}-breathe ${s(2.4)} ease-in-out infinite}

/* The run: only after a toggle, so nothing plays on first paint. */
.${P}[data-moved][data-state=checked] [data-part=explorer]{animation:${P}-flee ${s(ROLL)} linear both}
.${P}[data-moved][data-state=unchecked] [data-part=explorer]{animation:${P}-return ${s(1.6)} linear both}
.${P}[data-moved][data-state=unchecked] [data-part=face]{animation:${P}-face ${s(1.6)} steps(1,end) both}
.${P}[data-moved] [data-part=leg-front]{animation:${P}-stride ${s(0.3)} ease-in-out 5 alternate}
.${P}[data-moved] [data-part=leg-back]{animation:${P}-stride ${s(0.3)} ease-in-out 5 alternate-reverse}
.${P}[data-moved] [data-part=arm-back]{transform-origin:-2px -52px;animation:${P}-swing ${s(0.3)} ease-in-out 5 alternate}
.${P}[data-moved][data-state=checked] :is([data-part=leg-front],[data-part=leg-back],[data-part=arm-back]){animation-delay:${s(ROLL * 0.38)}}
.${P}[data-moved][data-state=checked] [data-part=scene]{animation:${P}-shake-a ${s(0.4)} ease-out ${s(ROLL - 0.08)} both}
.${P}[data-moved][data-state=unchecked] [data-part=scene]{animation:${P}-shake-b ${s(0.4)} ease-out ${s(ROLL - 0.08)} both}
.${P}[data-moved][data-state=checked] [data-part=puff-end] circle{animation:${P}-puff-a ${s(0.9)} ease-out ${s(ROLL - 0.1)} both;animation-delay:calc(${s(ROLL - 0.1)} + var(--d))}
.${P}[data-moved][data-state=unchecked] [data-part=puff-start] circle{animation:${P}-puff-b ${s(0.9)} ease-out both;animation-delay:calc(${s(ROLL - 0.1)} + var(--d))}

@keyframes ${P}-flicker{0%{transform:scale(1,1) skewX(0)}35%{transform:scale(.92,1.08) skewX(-4deg)}70%{transform:scale(1.05,.94) skewX(3deg)}100%{transform:scale(.96,1.12) skewX(-2deg)}}
@keyframes ${P}-glow{from{opacity:.75;transform:scale(1)}to{opacity:1;transform:scale(1.06)}}
@keyframes ${P}-mote{0%{transform:translate(0,0);opacity:0}15%{opacity:.7}100%{transform:translate(14px,-70px);opacity:0}}
@keyframes ${P}-glint{from{opacity:.35;transform:scale(.85)}to{opacity:.85;transform:scale(1.15)}}
@keyframes ${P}-breathe{0%,100%{transform:translateY(0)}50%{transform:translateY(-.6px)}}
@keyframes ${P}-flee{0%,40%{transform:translate(256px,150px)}100%{transform:translate(470px,150px)}}
@keyframes ${P}-return{0%,32%{transform:translate(470px,150px)}92%,100%{transform:translate(256px,150px)}}
@keyframes ${P}-face{0%{transform:scaleX(-1)}94%{transform:scaleX(1)}}
@keyframes ${P}-stride{from{transform:rotate(-38deg)}to{transform:rotate(34deg)}}
@keyframes ${P}-swing{from{transform:rotate(40deg)}to{transform:rotate(-35deg)}}
@keyframes ${P}-shake-a{0%{transform:translate(0,0)}20%{transform:translate(-2px,1.5px)}40%{transform:translate(2px,-1px)}60%{transform:translate(-1.5px,1px)}80%{transform:translate(1px,0)}100%{transform:translate(0,0)}}
@keyframes ${P}-shake-b{0%{transform:translate(0,0)}20%{transform:translate(2px,1.5px)}40%{transform:translate(-2px,-1px)}60%{transform:translate(1.5px,1px)}80%{transform:translate(-1px,0)}100%{transform:translate(0,0)}}
@keyframes ${P}-puff-a{0%{opacity:0;transform:translate(0,0) scale(.4)}25%{opacity:.75}100%{opacity:0;transform:translate(var(--x),-14px) scale(1.6)}}
@keyframes ${P}-puff-b{0%{opacity:0;transform:translate(0,0) scale(.4)}25%{opacity:.75}100%{opacity:0;transform:translate(var(--x),-14px) scale(1.6)}}

@media (prefers-reduced-motion:reduce){.${P} [data-part]{animation:none!important}}
`;

const boulderRunSwitchVariants = cva(
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

export interface BoulderRunSwitchProps
  extends
    Omit<ComponentPropsWithRef<typeof SwitchPrimitive.Root>, "children">,
    VariantProps<typeof boulderRunSwitchVariants> {}

/** `style` for an SVG paint that reads one of the scene's custom properties. */
const fill = (name: string): CSSProperties => ({ fill: `var(--boulder-run-${name})` });
const stroke = (name: string): CSSProperties => ({ stroke: `var(--boulder-run-${name})` });
const stop = (name: string, opacity?: number): CSSProperties => ({
  stopColor: `var(--boulder-run-${name})`,
  stopOpacity: opacity,
});

/** Chips knocked out of the boulder, in its own coordinates (radius 58). */
const CHIPS = [
  "M-30 -28 l9 -4 l5 7 l-6 6 l-9 -2 z",
  "M14 -40 l10 2 l1 8 l-9 3 l-5 -6 z",
  "M22 6 l11 -3 l5 9 l-7 8 l-9 -4 z",
  "M-36 14 l8 -1 l4 8 l-6 5 l-8 -4 z",
  "M-8 30 l7 -2 l3 6 l-5 4 l-6 -3 z",
  "M-14 -6 l6 -2 l3 5 l-4 4 l-5 -2 z",
];

const CRACKS = [
  "M-4 -12 l10 6 l4 -9 M6 -6 l3 10 l9 3",
  "M-44 -6 l10 4 l6 -6",
  "M30 -22 l8 8 l-2 9",
  "M-22 38 l6 -8 l9 2",
];

/** Dust motes drifting up through the torchlight: x, y, start delay (s). */
const MOTES = [
  [168, 120, 0],
  [186, 140, 1.4],
  [222, 112, 2.6],
  [244, 132, 3.7],
  [150, 136, 4.6],
] as const;

/** Carved marks on the wall: glyph, x, y. */
const GLYPHS = [
  ["I", 110, 70],
  ["A", 300, 52],
  ["I", 322, 122],
  ["Λ", 160, 104],
  ["II", 352, 92],
] as const;

export function BoulderRunSwitch({
  className,
  size,
  onCheckedChange,
  ...props
}: BoulderRunSwitchProps) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [moved, setMoved] = useState(false);
  const url = (name: string) => `url(#${id}-${name})`;

  return (
    <>
      <style href={P} precedence="dowel">
        {STYLES}
      </style>
      <SwitchPrimitive.Root
        data-slot="boulder-run-switch"
        data-moved={moved ? "" : undefined}
        className={cn(P, boulderRunSwitchVariants({ size }), className)}
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
              <stop offset=".45" style={stop("frame")} />
              <stop offset="1" style={stop("frame-lo")} />
            </linearGradient>
            <pattern
              id={`${id}-bricks`}
              width="64"
              height="36"
              patternUnits="userSpaceOnUse"
              x="0"
              y="6"
            >
              <rect width="64" height="36" style={fill("brick-edge")} />
              <rect x="1.5" y="1.5" width="61" height="15" rx="1.5" style={fill("brick")} />
              <rect x="-30.5" y="19.5" width="61" height="15" rx="1.5" style={fill("brick")} />
              <rect x="33.5" y="19.5" width="61" height="15" rx="1.5" style={fill("brick")} />
            </pattern>
            <radialGradient id={`${id}-torch`}>
              <stop offset="0" style={stop("glow", 0.5)} />
              <stop offset=".45" style={stop("glow", 0.16)} />
              <stop offset="1" style={stop("glow", 0)} />
            </radialGradient>
            <radialGradient id={`${id}-vignette`} cx=".5" cy=".4" r=".75">
              <stop offset=".25" style={stop("shade", 0)} />
              <stop offset="1" style={stop("shade", 0.9)} />
            </radialGradient>
            <radialGradient id={`${id}-stone`} cx=".38" cy=".3" r=".8">
              <stop offset="0" style={stop("stone-hi")} />
              <stop offset=".55" style={stop("stone")} />
              <stop offset="1" style={stop("stone-lo")} />
            </radialGradient>
            <radialGradient id={`${id}-gold`} cx=".4" cy=".35" r=".7">
              <stop offset="0" style={stop("fire-core")} />
              <stop offset=".5" style={stop("gold")} />
              <stop offset="1" style={stop("gold-lo")} />
            </radialGradient>
            <radialGradient id={`${id}-idol-glow`}>
              <stop offset="0" style={stop("gold", 0.8)} />
              <stop offset="1" style={stop("gold", 0)} />
            </radialGradient>
            <radialGradient id={`${id}-dust`}>
              <stop offset="0" style={stop("stone-hi", 0.8)} />
              <stop offset="1" style={stop("stone-hi", 0)} />
            </radialGradient>
            <clipPath id={`${id}-inside`}>
              <rect x="18" y="18" width="364" height="154" rx="77" />
            </clipPath>
          </defs>

          {/* Sandstone frame, cut into blocks. */}
          <rect x="2" y="2" width="396" height="186" rx="93" style={fill("frame-edge")} />
          <rect x="4" y="4" width="392" height="182" rx="91" fill={url("frame")} />
          <rect
            x="5"
            y="5"
            width="390"
            height="180"
            rx="90"
            fill="none"
            strokeWidth="1.2"
            style={{ ...stroke("frame-hi"), strokeOpacity: 0.7 }}
          />
          <g strokeWidth="1.4" style={{ ...stroke("frame-edge"), strokeOpacity: 0.55 }}>
            {[96, 150, 204, 258, 312].map((x) => (
              <g key={x}>
                <line x1={x} y1="5" x2={x} y2="16" />
                <line x1={x - 27} y1="174" x2={x - 27} y2="185" />
              </g>
            ))}
            <line x1="5" y1="95" x2="17" y2="95" />
            <line x1="383" y1="95" x2="395" y2="95" />
          </g>
          <rect x="16" y="16" width="368" height="158" rx="79" style={fill("frame-edge")} />

          <g clipPath={url("inside")}>
            <g data-part="scene">
              <rect x="0" y="0" width="400" height="190" fill={url("bricks")} />
              <g
                fontFamily="Georgia, serif"
                fontSize="13"
                textAnchor="middle"
                style={fill("glyph")}
              >
                {GLYPHS.map(([glyph, x, y], i) => (
                  <text key={i} x={x} y={y} opacity=".75">
                    {glyph}
                  </text>
                ))}
              </g>

              <circle data-part="torch-glow" cx="200" cy="66" r="120" fill={url("torch")} />

              {/* Torch on its bracket. */}
              <rect x="196.5" y="74" width="7" height="24" rx="1.5" style={fill("boot")} />
              <path d="M191 70 h18 l-3 7 h-12 z" style={fill("hat-band")} />
              <g data-part="flame">
                <path
                  d="M200 44 C 208 54, 210 62, 206 69 C 203 73, 197 73, 194 69 C 190 62, 194 54, 200 44 Z"
                  style={fill("fire")}
                />
                <path
                  d="M200 54 C 204 60, 205 65, 203 69 C 201 71, 199 71, 197 69 C 195 65, 197 60, 200 54 Z"
                  style={fill("fire-core")}
                />
              </g>

              {MOTES.map(([x, y, delay]) => (
                <circle
                  key={`${String(x)}-${String(y)}`}
                  data-part="mote"
                  cx={x}
                  cy={y}
                  r="1.1"
                  style={{ ...fill("fire-core"), ["--d" as string]: `${String(delay)}s` }}
                  opacity="0"
                />
              ))}

              {/* Floor. */}
              <rect x="0" y="150" width="400" height="40" style={fill("floor")} />
              <line
                x1="0"
                y1="150.5"
                x2="400"
                y2="150.5"
                strokeWidth="1.5"
                style={stroke("brick")}
              />

              {/* The explorer, feet at the origin, facing right. */}
              <g data-part="explorer">
                <g data-part="face">
                  <g data-part="body">
                    <g data-part="leg-back">
                      <path
                        d="M-2 -31 L-3 -15 L-4 -3"
                        fill="none"
                        strokeWidth="5.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ ...stroke("trousers"), filter: "brightness(.75)" }}
                      />
                      <path d="M-8 -4 h8 q2 0 2 3 v1.5 h-10 z" style={fill("boot")} />
                    </g>
                    <path
                      data-part="arm-back"
                      d="M-3 -52 L-9 -42 L-7 -34"
                      fill="none"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ ...stroke("shirt"), filter: "brightness(.78)" }}
                    />
                    <path
                      d="M-7.5 -56 Q0 -59.5 7.5 -56 L6.5 -30 L-6.5 -30 Z"
                      style={fill("shirt")}
                    />
                    <path d="M5.5 -56 L-5 -35" strokeWidth="1.8" style={stroke("trousers")} />
                    <rect x="-11" y="-39" width="7" height="8" rx="1.5" style={fill("hat")} />
                    <rect x="-6.5" y="-33.5" width="13" height="3" style={fill("hat-band")} />
                    <g data-part="leg-front">
                      <path
                        d="M2 -31 L3 -15 L3 -3"
                        fill="none"
                        strokeWidth="5.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={stroke("trousers")}
                      />
                      <path d="M-1 -4 h8 q2 0 2 3 v1.5 h-10 z" style={fill("boot")} />
                    </g>
                    <circle cx="1" cy="-63" r="6.5" style={fill("skin")} />
                    <ellipse cx="1" cy="-67.5" rx="11" ry="2.2" style={fill("hat")} />
                    <path
                      d="M-5 -67.5 Q-5.5 -77 1 -77 Q7.5 -77 7 -67.5 Z"
                      style={fill("hat")}
                    />
                    <rect x="-5" y="-70" width="12" height="2.2" style={fill("hat-band")} />
                    <path
                      d="M3 -53 L11 -61 L15 -70"
                      fill="none"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={stroke("shirt")}
                    />
                    <circle cx="15.5" cy="-71" r="2.6" style={fill("skin")} />
                    {/* The idol, held up to the light. */}
                    <circle
                      data-part="idol-glow"
                      cx="17"
                      cy="-77"
                      r="11"
                      fill={url("idol-glow")}
                    />
                    <path
                      d="M13 -74 Q13 -78 17 -78 Q21 -78 21 -74 L22 -67 L12 -67 Z"
                      fill={url("gold")}
                    />
                    <circle cx="17" cy="-81.5" r="4.2" fill={url("gold")} />
                    <circle cx="15.6" cy="-82" r=".75" style={fill("hat-band")} />
                    <circle cx="18.4" cy="-82" r=".75" style={fill("hat-band")} />
                  </g>
                </g>
              </g>

              {/* Dust thrown up where the boulder lands, at either end. */}
              <g data-part="puff">
                <g data-part="puff-end">
                  {[
                    [376, 146, 6, 0, 10],
                    [366, 148, 8, 0.05, -6],
                    [384, 140, 5, 0.1, 4],
                  ].map(([x, y, r, d, dx]) => (
                    <circle
                      key={x}
                      cx={x}
                      cy={y}
                      r={r}
                      fill={url("dust")}
                      style={
                        {
                          transformOrigin: `${String(x)}px ${String(y)}px`,
                          "--d": `${String(d)}s`,
                          "--x": `${String(dx)}px`,
                        } as CSSProperties
                      }
                    />
                  ))}
                </g>
                <g data-part="puff-start">
                  {[
                    [24, 146, 6, 0, -10],
                    [34, 148, 8, 0.05, 6],
                    [16, 140, 5, 0.1, -4],
                  ].map(([x, y, r, d, dx]) => (
                    <circle
                      key={x}
                      cx={x}
                      cy={y}
                      r={r}
                      fill={url("dust")}
                      style={
                        {
                          transformOrigin: `${String(x)}px ${String(y)}px`,
                          "--d": `${String(d)}s`,
                          "--x": `${String(dx)}px`,
                        } as CSSProperties
                      }
                    />
                  ))}
                </g>
              </g>

              {/* The boulder: the thumb. */}
              <ellipse
                data-part="boulder-shadow"
                cx="0"
                cy="0"
                rx="54"
                ry="5"
                style={{ ...fill("shade"), opacity: 0.7 }}
              />
              <g data-part="boulder">
                <g data-part="spin">
                  <circle r="58" fill={url("stone")} />
                  <g style={{ ...fill("stone-lo"), opacity: 0.8 }}>
                    {CHIPS.map((d) => (
                      <path key={d} d={d} />
                    ))}
                  </g>
                  <g
                    fill="none"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ ...stroke("crack"), opacity: 0.85 }}
                  >
                    {CRACKS.map((d) => (
                      <path key={d} d={d} />
                    ))}
                  </g>
                </g>
                {/* Light from the torch stays put while the stone turns. */}
                <circle
                  r="58"
                  fill="none"
                  strokeWidth="3"
                  style={{ ...stroke("shade"), opacity: 0.35 }}
                />
                <path
                  d="M-36 -40 A 54 54 0 0 1 22 -50"
                  fill="none"
                  strokeWidth="3"
                  strokeLinecap="round"
                  style={{ ...stroke("stone-hi"), opacity: 0.45 }}
                />
              </g>

              <rect
                x="0"
                y="0"
                width="400"
                height="190"
                fill={url("vignette")}
                pointerEvents="none"
              />
            </g>
          </g>

          {/* Inner lip over the scene. */}
          <rect
            x="18"
            y="18"
            width="364"
            height="154"
            rx="77"
            fill="none"
            strokeWidth="3"
            style={{ ...stroke("shade"), strokeOpacity: 0.6 }}
          />
        </svg>
      </SwitchPrimitive.Root>
    </>
  );
}

export { boulderRunSwitchVariants };
